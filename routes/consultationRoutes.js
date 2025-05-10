import express from 'express';
import {
  getAllConsultations,
  getConsultation,
  createConsultation,
  updateConsultationStatus,
  deleteConsultation,
  getConsultationStats,
  checkSlotAvailability,
  initiateConsultationPayment,
  getUpcomingConsultations
} from '../controllers/consultationController.js';
import adminAuth from '../middleware/Auth.js';

const router = express.Router();

// Public routes
router.post('/', createConsultation);
router.post('/check-slot', checkSlotAvailability); // Endpoint to check if a slot is available
router.post('/payment', initiateConsultationPayment); // Endpoint to initiate payment for a consultation

// Protected routes
router.use(adminAuth); // All routes below this middleware require authentication
router.get('/', getAllConsultations);
router.get('/upcoming', getUpcomingConsultations); // New endpoint for upcoming consultations
router.get('/stats', getConsultationStats);
router.get('/:id', getConsultation);
router.patch('/:id', updateConsultationStatus);
router.delete('/:id', deleteConsultation);

export default router;