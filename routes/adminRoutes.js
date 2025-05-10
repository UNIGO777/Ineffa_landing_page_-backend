import express from 'express';
import { login, sendOtp, getProfile } from '../controllers/adminController.js';
import adminAuth from '../middleware/Auth.js';

const router = express.Router();

// Public routes
router.post('/send-otp', sendOtp);
router.post('/login', login);

// Protected routes
router.get('/profile', adminAuth, getProfile);

export default router;