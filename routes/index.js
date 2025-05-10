import express from 'express';
import adminRoutes from './adminRoutes.js';
import consultationRoutes from './consultationRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import slotRoutes from './slotRoutes.js';
import razorpayRoutes from './razorpayRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import publicRoutes from './publicRoutes.js';

const router = express.Router();

// Mount routes
router.use('/admin', adminRoutes);
router.use('/consultations', consultationRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/slots', slotRoutes);
router.use('/razorpay', razorpayRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/public', publicRoutes);

export default router;