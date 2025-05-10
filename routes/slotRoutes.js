import express from 'express';
import {
  getAvailableSlots,
  getBusinessConfig
} from '../controllers/slotController.js';
import adminAuth from '../middleware/Auth.js';

const router = express.Router();

// Public routes
router.get('/available', getAvailableSlots);
router.get('/business-config', getBusinessConfig);

// Protected routes for admin to update business configuration
router.use(adminAuth);
// Future endpoints for admin to update business hours, etc.

export default router;