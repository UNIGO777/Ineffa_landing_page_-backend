import Payment from '../models/Payment.js';
import Consultation from '../models/Consultation.js';
import { catchAsync } from '../utils/catchAsync.js';

// Get dashboard statistics
export const getDashboardStats = catchAsync(async (req, res, next) => {
  // Get payment statistics
  const paymentStats = await Payment.aggregate([
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

  // Calculate total revenue, pending and completed payments
  let totalRevenue = 0;
  let pendingAmount = 0;
  let completedAmount = 0;
  
  paymentStats.forEach(stat => {
    if (stat.status === 'completed') {
      completedAmount = stat.totalAmount;
      totalRevenue += stat.totalAmount;
    } else if (stat.status === 'pending') {
      pendingAmount = stat.totalAmount;
    }
  });

  // Get consultation statistics
  const consultationStats = await Consultation.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        status: '$_id',
        count: 1
      }
    }
  ]);

  // Calculate total, completed and upcoming consultations
  let totalConsultations = 0;
  let completedConsultations = 0;
  let upcomingConsultations = 0;
  
  consultationStats.forEach(stat => {
    totalConsultations += stat.count;
    if (stat.status === 'completed') {
      completedConsultations = stat.count;
    } else if (stat.status === 'scheduled') {
      upcomingConsultations = stat.count;
    }
  });

  // Calculate growth rates (mock data for now, can be implemented with actual historical data)
  const paymentGrowth = 12.5; // Mock growth rate
  const consultationGrowth = 8.3; // Mock growth rate

  // Get today's appointments (only successful/completed ones)
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));
  
  const todaysAppointments = await Consultation.find({
    slotDate: { $gte: startOfDay, $lte: endOfDay },
    status: 'completed'
  }).sort({ slotStartTime: 1 }).limit(5);
  
  // Format the appointments for the frontend
  const formattedAppointments = todaysAppointments.map(appointment => ({
    _id: appointment._id,
    patientName: appointment.name,
    slotTime: appointment.slotStartTime,
    consultationType: appointment.service,
    status: appointment.status
  }));

  // Get recent payments
  const recentPayments = await Payment.find()
    .populate('consultationId')
    .sort({ createdAt: -1 })
    .limit(3);

  res.status(200).json({
    status: 'success',
    data: {
      paymentStats: {
        total: totalRevenue,
        pending: pendingAmount,
        completed: completedAmount,
        growth: paymentGrowth
      },
      consultationStats: {
        total: totalConsultations,
        completed: completedConsultations,
        upcoming: upcomingConsultations,
        growth: consultationGrowth
      },
      todaysAppointments: formattedAppointments,
      recentPayments
    }
  });
});

// Get monthly analytics data
export const getMonthlyAnalytics = catchAsync(async (req, res, next) => {
  const { year = new Date().getFullYear() } = req.query;
  
  // Get monthly payment data
  const monthlyPayments = await Payment.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        month: '$_id',
        totalAmount: 1,
        count: 1
      }
    },
    { $sort: { month: 1 } }
  ]);

  // Get monthly consultation data
  const monthlyConsultations = await Consultation.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        month: '$_id',
        count: 1
      }
    },
    { $sort: { month: 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      monthlyPayments,
      monthlyConsultations
    }
  });
});