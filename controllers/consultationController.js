import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Helper function to convert time string (HH:MM) to minutes since start of day
const convertTimeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to check if a time slot overlaps with existing bookings
const checkTimeSlotOverlap = (requestStartTime, requestEndTime, existingConsultations) => {
  const requestStartMinutes = convertTimeToMinutes(requestStartTime);
  const requestEndMinutes = convertTimeToMinutes(requestEndTime);
  
  // Validate that end time is after start time
  if (requestEndMinutes <= requestStartMinutes) {
    return { hasConflict: true, errorMessage: 'End time must be after start time' };
  }
  
  // Check for overlaps with existing consultations
  for (const consultation of existingConsultations) {
    const existingStartMinutes = convertTimeToMinutes(consultation.slotStartTime);
    const existingEndMinutes = convertTimeToMinutes(consultation.slotEndTime);
    
    // Check if there's an overlap
    const hasOverlap = (
      (requestStartMinutes >= existingStartMinutes && requestStartMinutes < existingEndMinutes) ||
      (requestEndMinutes > existingStartMinutes && requestEndMinutes <= existingEndMinutes) ||
      (requestStartMinutes <= existingStartMinutes && requestEndMinutes >= existingEndMinutes)
    );
    
    if (hasOverlap) {
      return { 
        hasConflict: true, 
        errorMessage: `This time slot conflicts with an existing booking at ${consultation.slotStartTime}-${consultation.slotEndTime}` 
      };
    }
  }
  
  return { hasConflict: false };
};

// Helper function to create a notification for consultation booking
const createConsultationNotification = async (consultation) => {
  try {
    await Notification.create({
      title: 'New Consultation Booked',
      message: `A new consultation has been booked by ${consultation.name} for ${consultation.service} service on ${new Date(consultation.slotDate).toLocaleDateString()} at ${consultation.slotStartTime}.`,
      type: 'info'
    });
  } catch (error) {
    console.error('Error creating consultation notification:', error);
  }
};

// Helper function to create a notification for payment completion
const createPaymentCompletedNotification = async (consultation) => {
  try {
    await Notification.create({
      title: 'Payment Completed',
      message: `Payment has been completed for the consultation booked by ${consultation.name} for ${consultation.service} service on ${new Date(consultation.slotDate).toLocaleDateString()}.`,
      type: 'success'
    });
  } catch (error) {
    console.error('Error creating payment notification:', error);
  }
};

// Helper function to initiate Razorpay payment for a consultation
// Using background processing for faster response
export const initiateConsultationPayment = catchAsync(
  async (req, res, next) => {
    const { consultationId, amount } = req.body;
    
    if (!consultationId || !amount) {
      return next(new AppError('Please provide consultation ID and amount', 400));
    }
    
    // Check if consultation exists
    const consultation = await Consultation.findById(consultationId);
    
    if (!consultation) {
      return next(new AppError('No consultation found with that ID', 404));
    }
    
    // Check if consultation is already paid
    if (consultation.paymentStatus === 'completed') {
      return next(new AppError('Payment for this consultation has already been completed', 400));
    }
    
    try {
      // Import razorpay instance
      const razorpayInstance = (await import('../config/razorpay.js')).default;
      
      // Create Razorpay order
      const options = {
        amount: amount * 100, // Razorpay amount is in paisa (1/100 of INR)
        currency: 'INR',
        receipt: `consultation_${consultationId}`,
        payment_capture: 1 // Auto-capture payment
      };
      
      const order = await razorpayInstance.orders.create(options);
      
      // Send response immediately with order details
      res.status(200).json({
        status: 'success',
        data: {
          order,
          key_id: process.env.RAZORPAY_KEY_ID,
          consultation
        }
      });
      
      // Create a pending payment record asynchronously
      (await import('../models/Payment.js')).default.create({
        consultationId: consultation._id,
        amount,
        paymentMethod: 'razorpay',
        transactionId: order.id,
        status: 'pending',
        metadata: { orderId: order.id }
      }).catch(error => console.error('Error creating payment record:', error));
      
      // Return to prevent executing the code below
      return;
      
      // This code will never execute due to the return above
      // res.status(200).json({
      //   status: 'success',
      //   data: {
      //     order,
      //     payment,
      //     key_id: process.env.RAZORPAY_KEY_ID,
      //     consultation
      //   }
      // });
    } catch (error) {
      return next(new AppError(`Payment initiation failed: ${error.message}`, 500));
    }
  },
  { backgroundProcessing: true }
);

// Get all consultations with filtering options
export const getAllConsultations = catchAsync(async (req, res, next) => {
  // Extract filter parameters from query
  const { status, date, startDate, endDate, upcoming, page = 1, limit = 10 } = req.query;
  
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
    
    filter.slotDate = { $gte: startOfDay, $lte: endOfDay };
  }
  // Filter by date range if provided
  else if (startDate && endDate) {
    const startOfDay = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    
    filter.slotDate = { $gte: startOfDay, $lte: endOfDay };
  }
  
  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = parseInt(limit);
  
  // Execute query with filters and pagination
  const consultations = await Consultation.find(filter)
    .sort({ slotDate: 1, slotStartTime: 1 }) // Sort by date and time
    .skip(skip)
    .limit(limitNum);
  
  // Get total count for pagination
  const total = await Consultation.countDocuments(filter);
  
  // If upcoming flag is true, return only future consultations
  if (upcoming === 'true') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingConsultations = await Consultation.find({
      paymentStatus: 'completed',
      status: 'booked', // Only consider completed bookings for upcoming dat
      slotDate: { $gte: today }
    })
    .sort({ slotDate: 1, slotStartTime: 1 })
    .limit(5); // Limit to 5 upcoming consultations
    
    return res.status(200).json({
      status: 'success',
      results: upcomingConsultations.length,
      data: {
        consultations: upcomingConsultations
      }
    });
  }
  
  res.status(200).json({
    status: 'success',
    results: total,
    totalPages: Math.ceil(total / limitNum),
    currentPage: parseInt(page),
    data: {
      consultations
    }
  });
});

// Get recent upcoming consultations
export const getUpcomingConsultations = catchAsync(async (req, res, next) => {
  const { limit = 5 } = req.query;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingConsultations = await Consultation.find({
    status: 'booked',
    slotDate: { $gte: today }
  })
  .sort({ slotDate: 1, slotStartTime: 1 })
  .limit(parseInt(limit));
  
  res.status(200).json({
    status: 'success',
    results: upcomingConsultations.length,
    data: {
      consultations: upcomingConsultations
    }
  });
});

// Get consultation by ID
export const getConsultation = catchAsync(async (req, res, next) => {
  const consultation = await Consultation.findById(req.params.id);
  
  if (!consultation) {
    return next(new AppError('No consultation found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      consultation
    }
  });
});

// Create new consultation
// This function works with the time slot system and integrates with Razorpay
export const createConsultation = catchAsync(
  async (req, res, next) => {
    const { name, email, phone, message, service, slotDate, slotStartTime, slotEndTime } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !message || !service || !slotDate || !slotStartTime || !slotEndTime) {
      return next(new AppError('Please provide all required fields', 400));
    }
    
    // Validate that the selected slot follows the business configuration
    const slotDateObj = new Date(slotDate);
    const dayOfWeek = slotDateObj.getDay();
    
    // Import business config to check if the day is a working day
    const { businessConfig } = await import('../config/businessConfig.js');
    if (!businessConfig.workingDays.includes(dayOfWeek)) {
      return next(new AppError('Selected date is not a working day. Please choose a different date.', 400));
    }
    
    // Validate that the time slot matches one of the predefined slots
    const allTimeSlots = businessConfig.generateTimeSlots(slotDateObj);
    const isValidSlot = allTimeSlots.some(slot => 
      slot.startTime === slotStartTime && slot.endTime === slotEndTime
    );
    
    if (!isValidSlot) {
      return next(new AppError('Invalid time slot. Please select a valid time slot.', 400));
    }
    
    // Check if the slot is already booked
    const startOfDay = new Date(slotDateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(slotDate).setHours(23, 59, 59, 999));
    
    const existingConsultations = await Consultation.find({
      slotDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled', 'pending'] } 
    });
    
    // Check for time slot conflicts using the helper function
    const { hasConflict, errorMessage } = checkTimeSlotOverlap(slotStartTime, slotEndTime, existingConsultations);
    
    if (hasConflict) {
      return next(new AppError(errorMessage || 'This time slot is already booked. Please select a different time.', 400));
    }
    
    const newConsultation = await Consultation.create({
      name,
      email,
      phone,
      message,
      service,
      slotDate,
      slotStartTime,
      slotEndTime,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    // Send response immediately
    res.status(201).json({
      status: 'success',
      data: {
        consultation: newConsultation
      }
    });
    
    // Create a notification for the new consultation booking asynchronously
    createConsultationNotification(newConsultation);
    
    // Return to prevent executing the code below
    return;
    
    // This code will never execute due to the return above
    res.status(201).json({
      status: 'success',
      data: {
        consultation: newConsultation
      }
    });
  },
  { backgroundProcessing: true }
);


// Update consultation status
export const updateConsultationStatus = catchAsync(
  async (req, res, next) => {
    const { status, paymentStatus } = req.body;
    
    if (!status || !['pending', 'booked', 'completed', 'cancelled'].includes(status)) {
      return next(new AppError('Please provide a valid status', 400));
    }
    
    const updateData = { status };
    
    // If payment status is provided, update it as well
    if (paymentStatus && ['pending', 'completed', 'failed'].includes(paymentStatus)) {
      updateData.paymentStatus = paymentStatus;
      
      // Create payment notification if payment is completed
      if (paymentStatus === 'completed') {
        const consultationBeforeUpdate = await Consultation.findById(req.params.id);
        if (consultationBeforeUpdate && consultationBeforeUpdate.paymentStatus !== 'completed') {
          await createPaymentCompletedNotification(consultationBeforeUpdate);
        }
      }
    }
    
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!consultation) {
      return next(new AppError('No consultation found with that ID', 404));
    }
    
    // Send response immediately
    res.status(200).json({
      status: 'success',
      data: {
        consultation
      }
    });
    
    // Create notification based on status change asynchronously
    let notificationType = 'info';
    let notificationTitle = 'Consultation Status Updated';
    let notificationMessage = `Consultation for ${consultation.name} has been updated to ${status}.`;
    
    if (status === 'booked' || status === 'completed') {
      notificationType = 'success';
      notificationTitle = status === 'booked' ? 'Consultation Booked' : 'Consultation Completed';
      notificationMessage = `Consultation for ${consultation.name} has been marked as ${status === 'booked' ? 'booked' : 'completed'}.`;
    } else if (status === 'cancelled') {
      notificationType = 'warning';
      notificationTitle = 'Consultation Cancelled';
      notificationMessage = `Consultation for ${consultation.name} has been cancelled.`;
    }
    
    try {
      Notification.create({
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType
      }).catch(error => console.error('Error creating status notification:', error));
    } catch (error) {
      console.error('Error creating status notification:', error);
    }
    
    // Return to prevent executing the code below
    return;
    
    // This code will never execute due to the return above
    res.status(200).json({
      status: 'success',
      data: {
        consultation
      }
    });
  },
  { backgroundProcessing: true }
);

// Delete consultation
export const deleteConsultation = catchAsync(async (req, res, next) => {
  const consultation = await Consultation.findByIdAndDelete(req.params.id);
  
  if (!consultation) {
    return next(new AppError('No consultation found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Update payment status
export const updatePaymentStatus = catchAsync(
  async (req, res, next) => {
    const { paymentStatus } = req.body;
    
    if (!paymentStatus || !['pending', 'completed', 'failed'].includes(paymentStatus)) {
      return next(new AppError('Please provide a valid payment status', 400));
    }
    
    const consultation = await Consultation.findById(req.params.id);
    
    if (!consultation) {
      return next(new AppError('No consultation found with that ID', 404));
    }
    
    // Only update if the status is different
    if (consultation.paymentStatus !== paymentStatus) {
      consultation.paymentStatus = paymentStatus;
      await consultation.save();
    }
    
    // Send response immediately
    res.status(200).json({
      status: 'success',
      data: {
        consultation
      }
    });
    
    // Handle notifications asynchronously if payment status changed
    if (consultation.paymentStatus !== paymentStatus) {
      // Create appropriate notification based on payment status
      if (paymentStatus === 'completed') {
        createPaymentCompletedNotification(consultation)
          .catch(error => console.error('Error creating payment completed notification:', error));
      } else if (paymentStatus === 'failed') {
        try {
          Notification.create({
            title: 'Payment Failed',
            message: `Payment has failed for the consultation booked by ${consultation.name} for ${consultation.service} service on ${new Date(consultation.slotDate).toLocaleDateString()}.`,
            type: 'error'
          }).catch(error => console.error('Error creating payment failed notification:', error));
        } catch (error) {
          console.error('Error creating payment failed notification:', error);
        }
      }
    }
    
    // Return to prevent executing the code below
    return;
    
    // This code will never execute due to the return above
    res.status(200).json({
      status: 'success',
      data: {
        consultation
      }
    });
  },
  { backgroundProcessing: true }
);

// Check slot availability
export const checkSlotAvailability = catchAsync(async (req, res, next) => {
  const { slotDate, slotStartTime, slotEndTime } = req.body;
  
  // Validate required fields
  if (!slotDate || !slotStartTime || !slotEndTime) {
    return next(new AppError('Please provide all required fields', 400));
  }
  
  // Validate that the selected slot follows the business configuration
  const slotDateObj = new Date(slotDate);
  const dayOfWeek = slotDateObj.getDay();
  
  // Import business config to check if the day is a working day
  const { businessConfig } = await import('../config/businessConfig.js');
  
  // Check if the selected date is a working day
  if (!businessConfig.workingDays.includes(dayOfWeek)) {
    return res.status(200).json({
      status: 'success',
      data: {
        isAvailable: false,
        message: 'Selected date is not a working day. Please choose a different date.'
      }
    });
  }
  
  // Validate that the time slot matches one of the predefined slots
  const allTimeSlots = businessConfig.generateTimeSlots(slotDateObj);
  const isValidSlot = allTimeSlots.some(slot => 
    slot.startTime === slotStartTime && slot.endTime === slotEndTime
  );
  
  if (!isValidSlot) {
    return res.status(200).json({
      status: 'success',
      data: {
        isAvailable: false,
        message: 'Invalid time slot. Please select a valid time slot.'
      }
    });
  }
  
  // Check if the slot is already booked
  const startOfDay = new Date(new Date(slotDate).setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date(slotDate).setHours(23, 59, 59, 999));
  
  const existingConsultations = await Consultation.find({
    slotDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: 'cancelled' }
  });
  
  // Check for time slot conflicts using the helper function
  const { hasConflict, errorMessage } = checkTimeSlotOverlap(slotStartTime, slotEndTime, existingConsultations);
  
  res.status(200).json({
    status: 'success',
    data: {
      isAvailable: !hasConflict,
      message: hasConflict ? errorMessage : 'Time slot is available'
    }
  });
});

// Get consultation statistics
export const getConsultationStats = catchAsync(async (req, res, next) => {
  const stats = await Consultation.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        consultations: { $push: '$$ROOT' }
      }
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1,
        consultations: 1
      }
    }
  ]);
  
  // Transform to object with status as keys
  const statsObj = stats.reduce((acc, curr) => {
    acc[curr.status] = {
      count: curr.count,
      consultations: curr.consultations
    };
    return acc;
  }, {});
  
  res.status(200).json({
    status: 'success',
    data: {
      stats: statsObj
    }
  });
});