import razorpayInstance from '../config/razorpay.js';
import Payment from '../models/Payment.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import crypto from 'crypto';
import { sendConsultationConfirmation, sendInternalNotification } from '../config/nodemailer.js';
import getUnixTimestampFromLocal from '../GenerateTimeStamp.js';
import axios from 'axios';
import SendScheduledEmails from '../GenrateReminderEmail.js';
import SendScheduledWhatsappMessages from '../WhatsappMsgReminders.js';



// Create a Razorpay order
export const createOrder = catchAsync(async (req, res, next) => {
  const { consultationId } = req.body;

  const  amount  = 99;

  if (!consultationId || !amount) {
    return next(new AppError('Please provide consultation ID and amount', 400));
  }

  // Check if consultation exists
  const consultation = await Consultation.findById(consultationId);

  if (!consultation) {
    return next(new AppError('No consultation found with that ID', 404));
  }

  // Create Razorpay order
  const options = {
    amount: amount * 100, // Razorpay amount is in paisa (1/100 of INR)
    currency: 'INR',
    receipt: `consultation_${consultationId}`,
    payment_capture: 1 // Auto-capture payment
  };

  try {
    const order = await razorpayInstance.orders.create(options);

    // Create a pending payment record
    const payment = await Payment.create({
      consultationId,
      amount,
      paymentMethod: 'razorpay',
      transactionId: order.id,
      status: 'pending',
      metadata: { orderId: order.id }
    });

    res.status(200).json({
      status: 'success',
      data: {
        order,
        payment,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    return next(new AppError(`Razorpay order creation failed: ${error.message}`, 500));
  }
});

// Verify Razorpay payment
export const verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Missing payment verification parameters', 400));
  }

  // Find the payment by order ID
  const payment = await Payment.findOne({
    'metadata.orderId': razorpay_order_id
  }).populate('consultationId');

  if (!payment) {
    return next(new AppError('No payment found with that order ID', 404));
  }

  // Verify signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    // Update payment status to failed
    payment.status = 'failed';
    await payment.save();

    return next(new AppError('Invalid payment signature', 400));
  }

  // Update payment status to completed
  payment.status = 'completed';
  payment.transactionId = razorpay_payment_id;
  await payment.save();

  // Update consultation payment status
  let consultation = null;
  if (payment.consultationId) {
    consultation = await Consultation.findByIdAndUpdate(
      payment.consultationId._id,
      { status: 'booked', paymentStatus: 'completed' },
      { new: true }
    );
  }

  // ✅ Send response immediately
  res.status(200).json({
    status: 'success',
    data: {
      payment
    }
  });

  // ✅ Run notification logic in the background
  (async () => {
    if (!consultation) return;

    try {
      // Create DB notification
      await Notification.create({
        title: 'Payment Completed',
        message: `Payment has been completed for the consultation booked by ${consultation.name} for ${consultation.service} service on ${new Date(consultation.slotDate).toLocaleDateString()}.`,
        type: 'success'
      });

      // Send WhatsApp message
      const whatsappApiUrl = `http://ow.ewiths.com/wapp/api/v2/send/bytemplate?apikey=${process.env.Whatsapp_api_key}&templatename=consultation_confirmation_1&mobile=${consultation.phone}&dvariables=${consultation.name},${consultation.service.toLowerCase().includes('consultation')? consultation.service : `${consultation.service} consultation`},${consultation.slotDate.toISOString().split('T')[0] + " " + consultation.slotStartTime},${consultation.meetingLink}`;
      
      const response = await fetch(whatsappApiUrl, { method: 'GET' });


      // Send scheduled WhatsApp messages
      await SendScheduledWhatsappMessages(consultation);

      await SendScheduledEmails(consultation);


      const crmApi = 'https://www.api.365leadmanagement.com/wpaddwebsiteleads';
      
      try {
        const response = await axios.post(crmApi, {
          customerName: consultation.name,
          customerEmail: consultation.email, 
          customerMobile: consultation.phone,
          customerComment: consultation.message,
          zoomLink: consultation.meetingLink,
        }, {
          headers: {
            'Authorization': process.env.CRM_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        
      } catch (error) {
        console.error('Error sending data to CRM:', error.message);
      }



      if (!response.ok) {
        console.error('Failed to send WhatsApp notification:', await response.text());
      }

      // Send confirmation email
      const bookingDetails = {
        name: consultation.name,
        date: new Date(consultation.slotDate).toLocaleDateString(),
        time: `${consultation.slotStartTime} - ${consultation.slotEndTime}`,
        service: consultation.service,
        zoomLink: consultation.meetingLink,
        consultantName: consultation.consultantName
      };

      const emailResult = await sendConsultationConfirmation(consultation.email, bookingDetails);
      const internalEmailResult = await sendInternalNotification(
        'New Consultation Booking', 
        `<h2>New Consultation Booking Details</h2>
         <p>Client Name: ${bookingDetails.name}</p>
         <p>Client Email: ${consultation.email}</p>
         <p>Service: ${bookingDetails.service}</p>
         <p>Date: ${bookingDetails.date}</p>
         <p>Time: ${bookingDetails.time}</p>
         <p>Meeting Link: ${bookingDetails.zoomLink}</p>`
      );

      if (!internalEmailResult.success) {
        console.error('Error sending confirmation email:', emailResult.error);
      }
      if (!emailResult.success) {
        console.error('Error sending confirmation email:', emailResult.error);
      }



    } catch (error) {
      console.error('Error in background notification process:', error);
    }
  })();
});

// Get Razorpay key
export const getRazorpayKey = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      key_id: process.env.RAZORPAY_KEY_ID
    }
  });
});









