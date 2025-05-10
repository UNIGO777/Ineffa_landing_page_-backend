import dotenv from 'dotenv';
import Razorpay from 'razorpay';

// Load environment variables
dotenv.config();

// Initialize Razorpay with API keys
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export default razorpayInstance;