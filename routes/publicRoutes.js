import express from 'express';
import { updatePaymentStatus, getPaymentStatus } from '../controllers/publicPaymentController.js';

const router = express.Router();

// Public routes for payment processing
router.post('/payment/update-status', updatePaymentStatus);
router.get('/payment/status/:orderId', getPaymentStatus);

export default router;