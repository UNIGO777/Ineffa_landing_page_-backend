import Payment from '../models/Payment.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import crypto from 'crypto';

// Update payment status after Razorpay redirect
export const updatePaymentStatus = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, status } = req.body;
  
  // If we have a direct status update (for failed payments)
  if (status === 'failed' && razorpay_order_id) {
    const payment = await Payment.findOne({
      'metadata.orderId': razorpay_order_id
    }).populate('consultationId');
    
    if (!payment) {
      return next(new AppError('No payment found with that order ID', 404));
    }
    
    // Update payment status to failed
    payment.status = 'failed';
    await payment.save();
    
    // Update consultation payment status
    if (payment.consultationId) {
      await Consultation.findByIdAndUpdate(
        payment.consultationId._id,
        { paymentStatus: 'failed' },
        { new: true }
      );
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Payment status updated to failed',
      data: { payment }
    });
  }
  
  // For successful payments, verify the signature
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Missing payment verification parameters', 400));
  }
  
  // Find the payment by order ID
  const payment = await Payment.findOne({
    'metadata.orderId': razorpay_order_id
  }).populate('consultationId');
  
  if (!payment) {
    return next(new AppError('No payment found with that order ID', 404));
  }
  
  // Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  
  if (generatedSignature !== razorpay_signature) {
    // Update payment status to failed
    payment.status = 'failed';
    await payment.save();
    
    // Update consultation payment status
    if (payment.consultationId) {
      await Consultation.findByIdAndUpdate(
        payment.consultationId._id,
        { paymentStatus: 'failed' },
        { new: true }
      );
    }
    
    return next(new AppError('Invalid payment signature', 400));
  }
  
  // Update payment status to completed
  payment.status = 'completed';
  payment.transactionId = razorpay_payment_id;
  await payment.save();
  
  // Update consultation payment status
  if (payment.consultationId) {
    const consultation = await Consultation.findByIdAndUpdate(
      payment.consultationId._id,
      { paymentStatus: 'completed', status: 'scheduled' },
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
    message: 'Payment verified and status updated',
    data: { payment }
  });
});

// Get payment status by order ID
export const getPaymentStatus = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  
  if (!orderId) {
    return next(new AppError('Please provide an order ID', 400));
  }
  
  const payment = await Payment.findOne({
    'metadata.orderId': orderId
  }).populate('consultationId');
  
  if (!payment) {
    return next(new AppError('No payment found with that order ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });
});