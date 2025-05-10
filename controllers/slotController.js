import Consultation from '../models/Consultation.js';
import { businessConfig } from '../config/businessConfig.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';

// Get available slots for a specific date
export const getAvailableSlots = catchAsync(async (req, res, next) => {
  const { date } = req.query;
  
  if (!date) {
    return next(new AppError('Please provide a date', 400));
  }
  
  // Parse the date and set time to start of day
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
  
  // Generate all possible time slots for the selected date
  const allTimeSlots = businessConfig.generateTimeSlots(selectedDate);
  
  // Find all existing consultations for the selected date
  const existingConsultations = await Consultation.find({
    slotDate: {
      $gte: selectedDate,
      $lt: new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
    },
    status: { $nin: ['cancelled', 'pending'] } // Exclude cancelled and pending consultations
  });
  
  // Mark slots as available or booked
  const availableSlots = allTimeSlots.map(slot => {
    const isBooked = existingConsultations.some(consultation => 
      consultation.slotStartTime === slot.startTime && 
      consultation.slotEndTime === slot.endTime
    );
    
    return {
      ...slot,
      isAvailable: !isBooked
    };
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      date: selectedDate,
      slots: availableSlots
    }
  });
});

// Get business hours configuration
export const getBusinessConfig = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      businessHours: businessConfig.businessHours,
      slotDuration: businessConfig.slotDuration,
      workingDays: businessConfig.workingDays
    }
  });
});