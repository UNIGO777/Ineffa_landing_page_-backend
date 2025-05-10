import express from 'express';
import {
  getDashboardStats,
  getMonthlyAnalytics
} from '../controllers/dashboardController.js';
import adminAuth from '../middleware/Auth.js';

const router = express.Router();

// All dashboard routes are protected
router.use(adminAuth);

// Dashboard routes
router.get('/stats', getDashboardStats);
router.get('/analytics', getMonthlyAnalytics);

export default router;