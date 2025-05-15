import express from 'express';
import { getAvailableSlotsForReschedule, rescheduleConsultation, verifyOTPAndGetConsultations, verifyPhoneAndCheckConsultations } from '../controllers/rescheduleConsultaionController.js';

const router = express.Router();

router.post('/verify-phone', verifyPhoneAndCheckConsultations);
router.post('/verify-otp', verifyOTPAndGetConsultations);
router.get('/available-slots', getAvailableSlotsForReschedule);
router.post('/confirm', rescheduleConsultation);


export default router