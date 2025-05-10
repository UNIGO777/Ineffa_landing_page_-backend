import Notification from '../models/Notification.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Get all notifications
export const getAllNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find().sort({ createdAt: -1 });
  
  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: {
      notifications
    }
  });
});

// Get unread notifications
export const getUnreadNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ isRead: false }).sort({ createdAt: -1 });
  
  res.status(200).json({
    status: 'success',
    results: notifications.length,
    data: {
      notifications
    }
  });
});

// Get notification by ID
export const getNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);
  
  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      notification
    }
  });
});

// Create new notification
export const createNotification = catchAsync(async (req, res, next) => {
  const { title, message, type } = req.body;
  
  // Validate required fields
  if (!title || !message) {
    return next(new AppError('Please provide title and message', 400));
  }
  
  const newNotification = await Notification.create({
    title,
    message,
    type: type || 'info',
    isRead: false
  });
  
  res.status(201).json({
    status: 'success',
    data: {
      notification: newNotification
    }
  });
});

// Mark notification as read
export const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    { new: true, runValidators: true }
  );
  
  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      notification
    }
  });
});

// Mark all notifications as read
export const markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { isRead: false },
    { isRead: true }
  );
  
  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read'
  });
});

// Delete notification
export const deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findByIdAndDelete(req.params.id);
  
  if (!notification) {
    return next(new AppError('No notification found with that ID', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Delete all read notifications
export const deleteReadNotifications = catchAsync(async (req, res, next) => {
  await Notification.deleteMany({ isRead: true });
  
  res.status(200).json({
    status: 'success',
    message: 'All read notifications deleted'
  });
});