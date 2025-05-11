import Payment from '../models/Payment.js';
import Consultation from '../models/Consultation.js';
import { catchAsync } from '../utils/catchAsync.js';

// Get dashboard statistics
export const getDashboardStats = catchAsync(async (req, res, next) => {
  // Extract month filter from query params
  const { month } = req.query;
  
  // Create date filter based on month if provided
  let dateFilter = {};
  if (month) {
    const year = new Date().getFullYear();
    const monthNum = parseInt(month);
    if (monthNum >= 1 && monthNum <= 12) {
      const startDate = new Date(year, monthNum - 1, 1); // Month is 0-indexed in JS Date
      const endDate = new Date(year, monthNum, 0); // Last day of the month
      dateFilter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }
  }
  
  // Get payment statistics
  const paymentStats = await Payment.aggregate([
    ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
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
    ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
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

  // Calculate total, completed, upcoming, booked and canceled consultations
  let totalConsultations = 0;
  let completedConsultations = 0;
  let upcomingConsultations = 0;
  let bookedConsultations = 0;
  let canceledConsultations = 0;
  
  consultationStats.forEach(stat => {
    // Sum all consultations for the total
    totalConsultations += stat.count;
    
    // Count by specific status
    if (stat.status === 'booked') {
      bookedConsultations = stat.count;
    } else if (stat.status === 'completed') {
      completedConsultations = stat.count;
    } else if (stat.status === 'scheduled') {
      upcomingConsultations = stat.count;
    } else if (stat.status === 'canceled') {
      canceledConsultations = stat.count;
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
        booked: bookedConsultations,
        completed: completedConsultations,
        upcoming: upcomingConsultations,
        canceled: canceledConsultations,
        growth: consultationGrowth
      },
      todaysAppointments: formattedAppointments,
      recentPayments
    }
  });
});

// Get monthly analytics data
export const getMonthlyAnalytics = catchAsync(async (req, res, next) => {
  const { year = new Date().getFullYear(), month } = req.query;
  
  // Create date filter based on year and optionally month
  let dateFilter = {
    createdAt: {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`)
    }
  };
  
  // If month is provided, refine the date filter
  if (month) {
    const monthNum = parseInt(month);
    if (monthNum >= 1 && monthNum <= 12) {
      const startDate = new Date(year, monthNum - 1, 1); // Month is 0-indexed in JS Date
      const endDate = new Date(year, monthNum, 0); // Last day of the month
      dateFilter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
  }
  
  // Get monthly payment data
  const monthlyPayments = await Payment.aggregate([
    {
      $match: dateFilter
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
        ...dateFilter,
        // Only include consultations with 'booked' status
        status: 'booked'
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