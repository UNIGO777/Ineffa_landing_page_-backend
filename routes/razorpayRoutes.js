import express from 'express';
import {
  createOrder,
  verifyPayment,
  getRazorpayKey
} from '../controllers/razorpayController.js';
import adminAuth from '../middleware/Auth.js';

const router = express.Router();

// Public routes for payment processing
router.get('/key', getRazorpayKey);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

// Protected routes (if needed in the future)
// router.use(adminAuth);

export default router;