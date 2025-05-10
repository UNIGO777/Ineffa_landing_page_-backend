import Payment from '../models/Payment.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Get all payments with filtering options
export const getAllPayments = catchAsync(async (req, res, next) => {
  // Extract filter parameters from query
  const { status, date, startDate, endDate, consultationId, page = 1, limit = 10 } = req.query;
  
  // Build filter object
  const filter = {};
  
  // Filter by status if provided
  if (status && status !== 'all') {
    filter.status = status;
  }
  
  // Filter by specific date if provided
  if (date) {
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));
    
    filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }
  // Filter by date range if provided
  else if (startDate && endDate) {
    const startOfDay = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    
    filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }
  
  // Filter by consultation ID if provided
  if (consultationId) {
    filter.consultationId = consultationId;
  }
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);
  
  // Execute query with filters and pagination
  const payments = await Payment.find(filter)
    .populate('consultationId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);
  
  // Get total count for pagination
  const total = await Payment.countDocuments(filter);
  
  res.status(200).json({
    status: 'success',
    results: total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: parseInt(page),
    data: {
      payments
    }
  });
});

// Get payment by ID
export const getPayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id).populate('consultationId');
  
  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });
});

// Create new payment
export const createPayment = catchAsync(async (req, res, next) => {
  const { consultationId, amount, paymentMethod, transactionId, metadata } = req.body;
  
  // Validate required fields
  if (!consultationId || !amount || !paymentMethod) {
    return next(new AppError('Please provide all required fields', 400));
  }
  
  // Check if consultation exists
  const consultation = await Consultation.findById(consultationId);
  
  if (!consultation) {
    return next(new AppError('No consultation found with that ID', 404));
  }
  
  const newPayment = await Payment.create({
    consultationId,
    amount,
    paymentMethod,
    transactionId,
    status: 'pending',
    metadata
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      payment: newPayment
    }
  });
});

// Update payment status
export const updatePaymentStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  
  if (!status || !['pending', 'completed', 'failed'].includes(status)) {
    return next(new AppError('Please provide a valid status', 400));
  }
  
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).populate('consultationId');
  
  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }
  
  // If payment is completed, update the consultation payment status
  if (status === 'completed' && payment.consultationId) {
    const consultation = await Consultation.findByIdAndUpdate(
      payment.consultationId._id,
      { paymentStatus: 'completed' },
      { new: true }
    );
    
    // Create a notification for payment completion
    if (consultation) {
      try {
        await Notification.create({
          title: 'Payment Completed',
          message: `Payment has been completed for the consultation booked by ${consultation.name} for ${consultation.service} service on ${new Date(consultation.slotDate).toLocaleDateString()}.`,
          type: 'success'
        });
      } catch (error) {
        console.error('Error creating payment notification:', error);
      }
    }
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });
});

// Delete payment
export const deletePayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  
  if (!payment) {
    return next(new AppError('No payment found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get payment statistics
export const getPaymentStats = catchAsync(async (req, res, next) => {
  const stats = await Payment.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1,
        totalAmount: 1
      }
    }
  ]);
  
  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});