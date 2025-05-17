import Consultation from '../models/Consultation.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { sendOtpEmail, sendRescheduleConfirmation } from '../config/nodemailer.js';
import { businessConfig } from '../config/businessConfig.js';
import Notification from '../models/Notification.js';
import dotenv from 'dotenv';
import EmailReminder from '../models/EmailReminders.js';
import SendScheduledEmails from '../GenrateReminderEmail.js';
import SendScheduledWhatsappMessages from '../WhatsappMsgReminders.js';
import CancleScheduledWhatsappMessages from '../CancleWhatsappMsgReminders.js'
import { sendConsultationConfirmation } from '../config/nodemailer.js';
dotenv.config();

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs with expiry (10 minutes)
const otpStore = new Map();

// Verify phone number and check for consultations
export const verifyPhoneAndCheckConsultations = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(new AppError('Please provide a phone number', 400));
  }

  const now = new Date();
  const eightHoursFromNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const consultations = await Consultation.find({
    phone,
    status: { $in: ['booked', 'scheduled'] },
    paymentStatus: 'completed'
  });

  if (consultations.length === 0) {
    return next(new AppError('No consultations found for this phone number', 404));
  }

  const reschedulableConsultations = consultations.filter(consultation => {
    const slotDateTime = new Date(consultation.slotDate);
    const [hours, minutes] = consultation.slotStartTime.split(':').map(Number);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return slotDateTime > eightHoursFromNow;
  });

  if (reschedulableConsultations.length === 0) {
    return next(new AppError('No consultations available for rescheduling. Consultations must be more than 8 hours away.', 400));
  }

  const userEmail = consultations[0].email;
  const otp = generateOTP();

  otpStore.set(phone, {
    otp,
    email: userEmail,
    expires: new Date(now.getTime() + 10 * 60 * 1000)
  });

  // === Send response immediately ===
  res.status(200).json({
    status: 'success',
    message: 'OTP sent to your email for verification',
    data: {
      email: userEmail.replace(/(.{2})(.*)(?=@)/, '$1****'),
      consultationsCount: reschedulableConsultations.length
    }
  });

  // === Background: Send OTP Email ===
  setImmediate(async () => {
    try {
      await sendOtpEmail(userEmail, otp);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      // Optional: log to external monitoring system
    }
  });
});


// Verify OTP and return reschedulable consultations
export const verifyOTPAndGetConsultations = catchAsync(async (req, res, next) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return next(new AppError('Please provide phone number and OTP', 400));
  }

  // Check if OTP exists and is valid
  const otpData = otpStore.get(phone);

  if (!otpData) {
    return next(new AppError('OTP verification failed. Please request a new OTP.', 400));
  }

  if (otpData.otp !== otp) {
    return next(new AppError('Invalid OTP. Please try again.', 400));
  }

  if (otpData.expires < new Date()) {
    // Remove expired OTP
    otpStore.delete(phone);
    return next(new AppError('OTP has expired. Please request a new OTP.', 400));
  }

  // Get current date and time
  const now = new Date();

  // Calculate 8 hours from now for slot filtering
  const eightHoursFromNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  // Find consultations for this phone number that can be rescheduled
  const consultations = await Consultation.find({
    phone,
    status: { $in: ['booked', 'scheduled'] },
    paymentStatus: 'completed'
  });

  // Filter consultations that are more than 8 hours away
  const reschedulableConsultations = consultations.filter(consultation => {
    const slotDateTime = new Date(consultation.slotDate);
    const [hours, minutes] = consultation.slotStartTime.split(':').map(Number);
    slotDateTime.setHours(hours, minutes, 0, 0);

    return slotDateTime > eightHoursFromNow;
  });

  // Format consultations for frontend
  const formattedConsultations = reschedulableConsultations.map(consultation => ({
    id: consultation._id,
    service: consultation.service,
    date: consultation.slotDate,
    formattedDate: new Date(consultation.slotDate).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    startTime: consultation.slotStartTime,
    endTime: consultation.slotEndTime,
    status: consultation.status
  }));

  // Remove OTP from store after successful verification
  otpStore.delete(phone);

  res.status(200).json({
    status: 'success',
    data: {
      consultations: formattedConsultations
    }
  });
});

// Get available slots for rescheduling
export const getAvailableSlotsForReschedule = catchAsync(async (req, res, next) => {
  const { date } = req.query;

  console.log(date);

  if (!date) {
    return next(new AppError('Please provide a date', 400));
  }

  // Parse the date and set time to start of day
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  // Get current date and time
  const now = new Date();

  // Calculate 8 hours from now for slot filtering
  const eightHoursFromNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  // Check if selected date is at least 8 hours in the future
  if (selectedDate < eightHoursFromNow) {
    return next(new AppError('Please select a date that is at least 8 hours in the future', 400));
  }

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

  // Filter out lunch time slots (13:00-14:00)
  const filteredSlots = availableSlots.filter(slot => {
    // Extract hour from slot time (format: HH:MM)
    const hour = parseInt(slot.startTime.split(':')[0], 10);
    // Filter out slots that start at 13:00
    return hour !== 13 && slot.isAvailable;
  });

  res.status(200).json({
    status: 'success',
    data: {
      date: selectedDate,
      slots: filteredSlots
    }
  });
});

// Reschedule consultation
export const rescheduleConsultation = catchAsync(async (req, res, next) => {
  const { consultationId, newDate, newStartTime, newEndTime } = req.body;

  if (!consultationId || !newDate || !newStartTime || !newEndTime) {
    return next(new AppError('Please provide consultation ID, new date, and new time slot', 400));
  }

  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    return next(new AppError('No consultation found with that ID', 404));
  }

  if (!['booked', 'scheduled'].includes(consultation.status) || consultation.paymentStatus !== 'completed') {
    return next(new AppError('This consultation cannot be rescheduled', 400));
  }

  const now = new Date();
  const eightHoursFromNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  const currentSlotDateTime = new Date(consultation.slotDate);
  const [currentHours, currentMinutes] = consultation.slotStartTime.split(':').map(Number);
  currentSlotDateTime.setHours(currentHours, currentMinutes, 0, 0);

  if (currentSlotDateTime <= eightHoursFromNow) {
    return next(new AppError('This consultation cannot be rescheduled as it is within 8 hours', 400));
  }

  const newSlotDateTime = new Date(newDate);
  const [newHours, newMinutes] = newStartTime.split(':').map(Number);
  newSlotDateTime.setHours(newHours, newMinutes, 0, 0);

  if (newSlotDateTime <= eightHoursFromNow) {
    return next(new AppError('New slot must be more than 8 hours in the future', 400));
  }

  const existingConsultations = await Consultation.find({
    _id: { $ne: consultationId },
    slotDate: new Date(newDate),
    slotStartTime: newStartTime,
    slotEndTime: newEndTime,
    status: { $nin: ['cancelled', 'pending'] }
  });

  if (existingConsultations.length > 0) {
    return next(new AppError('This slot is already booked', 400));
  }

  const oldWhatsappReminderIds = consultation.WhatsappReminderIds;

  consultation.slotDate = new Date(newDate);
  consultation.slotStartTime = newStartTime;
  consultation.slotEndTime = newEndTime;
  consultation.WhatsappReminderIds = [];
  await consultation.save();

  await EmailReminder.findOneAndDelete({ consultationId });

  // === Send response immediately ===
  res.status(200).json({
    status: 'success',
    message: 'Consultation rescheduled successfully',
    data: {
      consultation: {
        id: consultation._id,
        service: consultation.service,
        date: consultation.slotDate,
        formattedDate: new Date(consultation.slotDate).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        startTime: consultation.slotStartTime,
        endTime: consultation.slotEndTime,
        status: consultation.status
      }
    }
  });

  // === Background tasks ===
  setImmediate(async () => {
    try {
      const serviceName = consultation.service.toLowerCase().includes('consultation')
        ? consultation.service
        : `${consultation.service} consultation`;

      const whatsappApiUrl = `http://ow.ewiths.com/wapp/api/v2/send/bytemplate?apikey=${process.env.Whatsapp_api_key}&templatename=reshedule_email&mobile=${consultation.phone}&dvariables=${consultation.name},${serviceName},${consultation.slotDate.toISOString().split('T')[0]} ${consultation.slotStartTime},${consultation.meetingLink}`;

      await fetch(whatsappApiUrl, { method: 'GET' });

      await CancleScheduledWhatsappMessages(oldWhatsappReminderIds);
      await SendScheduledWhatsappMessages(consultation);
      await SendScheduledEmails(consultation);


      const bookingDetails = {
        name: consultation.name,
        date: new Date(consultation.slotDate).toLocaleDateString(),
        time: `${consultation.slotStartTime} - ${consultation.slotEndTime}`,
        service: consultation.service,
        zoomLink: consultation.meetingLink,
        consultantName: consultation.consultantName
      };

      const emailResult = await sendRescheduleConfirmation(consultation.email, bookingDetails);
      if (!emailResult.success) {
        console.error('Error sending confirmation email:', emailResult.error);
      }

      await Notification.create({
        title: 'Consultation Rescheduled',
        message: `A consultation for ${consultation.name} has been rescheduled to ${new Date(newDate).toLocaleDateString()} at ${newStartTime}.`,
        type: 'info'
      });
    } catch (err) {
      console.error('Error in background tasks:', err);
    }
  });
});
