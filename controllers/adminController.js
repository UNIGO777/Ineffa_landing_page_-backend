import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import otpGenerator from 'otp-generator';
import Admin from '../models/AdminModel.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendOtpEmail } from '../config/nodemailer.js';

// Store OTPs temporarily (in production, use Redis or another solution)
const otpStore = new Map();

// Generate OTP and send via email
export const sendOtp = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return next(new AppError('Phone number is required', 400));
  }
  
  // Find admin by phone number
  const admin = await Admin.findOne({ phoneNumber });
  
  if (!admin) {
    return next(new AppError('No admin found with this phone number', 404));
  }
  
  // Generate OTP
  const otp = otpGenerator.generate(6, { 
    upperCase: false,
    specialChars: false,
    alphabets: false,
    digits: true
  });
  
  // Store OTP with expiry (10 minutes)
  otpStore.set(phoneNumber, {
    otp,
    expiry: Date.now() + 10 * 60 * 1000,
    adminId: admin._id
  });
  
  // Send OTP via email
  const emailResult = await sendOtpEmail(admin.email, otp);
  
  if (!emailResult.success) {
    return next(new AppError('Failed to send OTP email', 500));
  }
  
  res.status(200).json({
    status: 'success',
    message: 'OTP sent to your registered email',
    data: {
      phoneNumber,
      email: admin.email.replace(/(.{2})(.*)(?=@)/, function(_, a, b) {
        return a + b.replace(/./g, '*');
      })
    }
  });
});

// Login with phone number, password and OTP
export const login = catchAsync(async (req, res, next) => {
  const { phoneNumber, password, otp } = req.body;
  
  // Check if all fields are provided
  if (!phoneNumber || !password || !otp) {
    return next(new AppError('Please provide phone number, password and OTP', 400));
  }
  
  // Check if OTP exists and is valid
  const otpData = otpStore.get(phoneNumber);
  
  if (!otpData) {
    return next(new AppError('OTP expired or not requested. Please request a new OTP', 400));
  }
  
  if (otpData.otp !== otp) {
    return next(new AppError('Invalid OTP', 400));
  }
  
  if (otpData.expiry < Date.now()) {
    otpStore.delete(phoneNumber);
    return next(new AppError('OTP expired. Please request a new OTP', 400));
  }
  
  // Find admin by phone number
  const admin = await Admin.findOne({ phoneNumber });
  
  if (!admin) {
    return next(new AppError('No admin found with this phone number', 404));
  }
  
  // Check password
  const isPasswordCorrect = await bcrypt.compare(password, admin.password);
  
  if (!isPasswordCorrect) {
    return next(new AppError('Incorrect password', 401));
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { id: admin._id, name: admin.name, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
  
  // Remove OTP from store
  otpStore.delete(phoneNumber);
  
  // Send response
  res.status(200).json({
    status: 'success',
    token,
    data: {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phoneNumber: admin.phoneNumber
      }
    }
  });
});

// Get current admin profile
export const getProfile = catchAsync(async (req, res, next) => {
  const admin = await Admin.findById(req.user.id).select('-password');
  
  if (!admin) {
    return next(new AppError('Admin not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      admin
    }
  });
});