import express from 'express';
import {
  getAllPayments,
  getPayment,
  createPayment,
  updatePaymentStatus,
  deletePayment,
  getPaymentStats
} from '../controllers/paymentController.js';
import adminAuth from '../middleware/Auth.js';

const router = express.Router();

// All payment routes are protected
router.use(adminAuth);

router.get('/', getAllPayments);
router.get('/stats', getPaymentStats);
router.get('/:id', getPayment);
router.post('/', createPayment);
router.patch('/:id', updatePaymentStatus);
router.delete('/:id', deletePayment);

export default router;