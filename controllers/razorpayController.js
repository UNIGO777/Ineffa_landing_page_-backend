import razorpayInstance from '../config/razorpay.js';
import Payment from '../models/Payment.js';
import Consultation from '../models/Consultation.js';
import Notification from '../models/Notification.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import crypto from 'crypto';
import { sendConsultationConfirmation } from '../config/nodemailer.js';
import getUnixTimestampFromLocal from '../GenerateTimeStamp.js';
import axios from 'axios';


// Create a Razorpay order
export const createOrder = catchAsync(async (req, res, next) => {
  const { consultationId, amount } = req.body;

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
      const whatsappApiUrl = `http://ow.ewiths.com/wapp/api/v2/send/bytemplate?apikey=e1e61ebd1bd9437191c5cf44cdf973cf&templatename=consultation_confirmation&mobile=${consultation.phone}&dvariables=${consultation.name},${consultation.service.toLowerCase().includes('consultation')? consultation.service : `${consultation.service} consultation`},${consultation.slotDate.toISOString().split('T')[0] + " " + consultation.slotStartTime},${consultation.meetingLink}`;
      console.log(whatsappApiUrl);
      const response = await fetch(whatsappApiUrl, { method: 'GET' });


      // Send scheduled WhatsApp messages
      await SendScheduledWhatsappMessages(consultation);


      const crmApi = 'https://www.api.365leadmanagement.com/wpaddwebsiteleads';
      
      try {
        const response = await axios.post(crmApi, {
          customerName: consultation.name,
          customerEmail: consultation.email, 
          customerMobile: consultation.phone,
          customerComment: consultation.message
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



const SendScheduledWhatsappMessages = async (details) => {
  const baseUrl = `https://wa.iconicsolution.co.in/wapp/api/v2/send/bytemplate?apikey=${process.env.Whatsapp_api_key}&templatename=`
  


  const scheduledMessages = [
    {
      delayLabel: '24hr_reminder',
      url: `consultation_reminders_24_hour_before&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.service.toLowerCase().includes('consultation') ? details.service : `${details.service} consultation`},${details.slotDate.toISOString().split('T')[0] + "," + details.slotStartTime},${details.meetingLink}`
    },
    {
      delayLabel: '30min_reminder',
      url: `consultation_reminders_30_min_before&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.service.toLowerCase().includes('consultation')? details.service : `${details.service} consultation`},${details.meetingLink}`
    },
    {
      delayLabel: '10min_reminder',
      url: `consultation_reminders_10_min_before&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.service.toLowerCase().includes('consultation')? details.service : `${details.service} consultation`},${details.meetingLink}`
    },
    {
      delayLabel: 'live_now',
      url: `consultation_reminders_live&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.meetingLink}`
      
    },
    {
      delayLabel: 'after_start_reminder',
      url: `consultation_reminder_after_5_min&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.meetingLink}`
    },
  ];

  const reminderTime24hours = new Date(details.slotDate);
  reminderTime24hours.setDate(reminderTime24hours.getDate() - 1); // Subtract 1 day
  const formattedDate = reminderTime24hours.toISOString().split('T')[0]; // Get YYYY-MM-DD format
  const unixTimeStamp = getUnixTimestampFromLocal(formattedDate, details.slotStartTime);
  const whatsappApiUrl = `${baseUrl}${scheduledMessages[0].url}${unixTimeStamp}&dvariables=${scheduledMessages[0].dvariables}`;
  await fetch(whatsappApiUrl, { method: 'GET' }).then((res) => {
    console.log(res.status)
  });

  // Get hours and minutes from slot time
  const [hours30, minutes30] = details.slotStartTime.split(':').map(Number);
  
  // Calculate time 30 minutes before slot time
  const totalMinutes30 = hours30 * 60 + minutes30;
  const newTotalMinutes30 = totalMinutes30 - 30;
  const newHours30 = Math.floor(newTotalMinutes30 / 60);
  const newMinutes30 = newTotalMinutes30 % 60;
  
  // Format as HH:MM
  const formattedTime30min = `${newHours30.toString().padStart(2, '0')}:${newMinutes30.toString().padStart(2, '0')}`;
  
  const unixTimeStamp30min = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], formattedTime30min);
  const whatsappApiUrl30min = `${baseUrl}${scheduledMessages[1].url}${unixTimeStamp30min}&dvariables=${scheduledMessages[1].dvariables}`;
  await fetch(whatsappApiUrl30min, { method: 'GET' }).then((res) => {
    console.log(res.status)
  });


  // Get hours and minutes from slot time (e.g. "16:00")
  const [hours10, minutes10] = details.slotStartTime.split(':').map(Number);
  
  // Calculate time 10 minutes before slot time
  const totalMinutes = hours10 * 60 + minutes10;
  const newTotalMinutes = totalMinutes - 10;
  const newHours = Math.floor(newTotalMinutes / 60);
  const newMinutes = newTotalMinutes % 60;
  
  // Format as HH:MM
  const formattedTime10min = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  
  const unixTimeStamp10min = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], formattedTime10min);
  const whatsappApiUrl10min = `${baseUrl}${scheduledMessages[2].url}${unixTimeStamp10min}&dvariables=${scheduledMessages[2].dvariables}`;
  await fetch(whatsappApiUrl10min, { method: 'GET' }).then((res) => {
    console.log(res.status)

  });


  const unixTimeStampLive = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], details.slotStartTime);
  const whatsappApiUrlLive = `${baseUrl}${scheduledMessages[3].url}${unixTimeStampLive}&dvariables=${scheduledMessages[3].dvariables}`;
  await fetch(whatsappApiUrlLive, { method: 'GET' }).then((res) => {
    console.log(res.status)
  });

  // Get hours and minutes from slot time
  const [hours5, minutes5] = details.slotStartTime.split(':').map(Number);
  
  // Calculate time 5 minutes after slot time
  const totalMinutes5 = hours5 * 60 + minutes5;
  const newTotalMinutes5 = totalMinutes5 + 5;
  const newHours5 = Math.floor(newTotalMinutes5 / 60);
  const newMinutes5 = newTotalMinutes5 % 60;
  
  // Format as HH:MM
  const formattedTime5min = `${newHours5.toString().padStart(2, '0')}:${newMinutes5.toString().padStart(2, '0')}`;
  
  const unixTimeStamp5min = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], formattedTime5min);
  const whatsappApiUrl5min = `${baseUrl}${scheduledMessages[4].url}${unixTimeStamp5min}&dvariables=${scheduledMessages[4].dvariables}`;
  await fetch(whatsappApiUrl5min, { method: 'GET' }).then((res) => {
    console.log(res.status)
  });
}