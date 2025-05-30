import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// Function to send OTP email
export const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Ineffa Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP for Ineffa Login',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333366;">Ineffa Authentication</h2>
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) for login is:</p>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
        <p>Regards,<br>Ineffa Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Internal notification emails
const notificationEmails = [
  'naman13399@gmail.com',
  'care@ineffa.design', 
  'sales@ineffa.design',
  'marketing@ineffa.design',
  'anant@ineffa.design'
];


// Function to send internal notification
export const  sendInternalNotification = async (subject, content) => {
  const mailOptions = {
    from: `"Ineffa System" <${process.env.EMAIL_USER}>`,
    to: notificationEmails,
    subject: subject,
    html: content
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending internal notification:', error);
    return { success: false, error: error.message };
  }
};

// Function to send consultation booking confirmation email
export const sendConsultationConfirmation = async (email, bookingDetails) => {
  const mailOptions = {
    from: `"Ineffa Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Consultation Booking Confirmation - Ineffa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333366;">Consultation Booking Confirmation</h2>
        <p>Dear ${bookingDetails.name},</p>
        <p>Thank you for booking a consultation with Ineffa. Your booking has been confirmed.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #333366;">Booking Details:</h3>
          <p><strong>Date:</strong> ${bookingDetails.date}</p>
          <p><strong>Time:</strong> ${bookingDetails.time}</p>
          <p><strong>Service:</strong> ${bookingDetails.service}</p>
         
          ${bookingDetails.zoomLink ? `
          <div style="margin-top: 15px; padding: 10px; background-color: #e6f3ff; border-radius: 5px;">
            <p style="margin: 0;"><strong>Zoom Meeting Link:</strong></p>
            <a href="${bookingDetails.zoomLink}" style="color: #0066cc; text-decoration: none; word-break: break-all;">${bookingDetails.zoomLink}</a>
          </div>
          ` : ''}
        </div>

        <p>Please make sure to join the consultation at the scheduled time using the Zoom link provided above.</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://ineffa.tech/reshedule-consultaion" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block;
                    font-weight: bold;">
                    Reschedule Appointment
          </a>
        </div>
        
        <p>If you need to cancel your consultation, please contact us at least 24 hours before the scheduled time.</p>
        
        <p>For any queries, feel free to reach out to our support team.</p>
        
        <p>Best regards,<br>Ineffa Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // Send internal notification
    const internalContent = `
      <div style="font-family: Arial, sans-serif;">
        <h3>New Consultation Booking</h3>
        <p><strong>Client:</strong> ${bookingDetails.name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${bookingDetails.date}</p>
        <p><strong>Time:</strong> ${bookingDetails.time}</p>
        <p><strong>Service:</strong> ${bookingDetails.service}</p>
      </div>
    `;
    await sendInternalNotification('New Consultation Booking Alert', internalContent);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending consultation confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Function to send reschedule confirmation email
export const sendRescheduleConfirmation = async (email, bookingDetails) => {
  const mailOptions = {
    from: `"Ineffa Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Consultation Reschedule Confirmation - Ineffa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333366;">Consultation Reschedule Confirmation</h2>
        <p>Dear ${bookingDetails.name},</p>
        <p>Your consultation with Ineffa has been successfully rescheduled. Here are your updated booking details:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #333366;">New Booking Details:</h3>
          <p><strong>Date:</strong> ${bookingDetails.date}</p>
          <p><strong>Time:</strong> ${bookingDetails.time}</p>
          <p><strong>Service:</strong> ${bookingDetails.service}</p>
         
          ${bookingDetails.zoomLink ? `
          <div style="margin-top: 15px; padding: 10px; background-color: #e6f3ff; border-radius: 5px;">
            <p style="margin: 0;"><strong>Updated Zoom Meeting Link:</strong></p>
            <a href="${bookingDetails.zoomLink}" style="color: #0066cc; text-decoration: none; word-break: break-all;">${bookingDetails.zoomLink}</a>
          </div>
          ` : ''}
        </div>

        <p>Please make sure to join the consultation at the newly scheduled time using the updated Zoom link provided above.</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://ineffa.tech/reshedule-consultaion" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block;
                    font-weight: bold;">
                    Reschedule Again
          </a>
        </div>
        
        <p>If you need to cancel your consultation, please contact us at least 24 hours before the scheduled time.</p>
        
        <p>For any queries, feel free to reach out to our support team.</p>
        
        <p>Best regards,<br>Ineffa Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // Send internal notification
    const internalContent = `
      <div style="font-family: Arial, sans-serif;">
        <h3>Consultation Rescheduled</h3>
        <p><strong>Client:</strong> ${bookingDetails.name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>New Date:</strong> ${bookingDetails.date}</p>
        <p><strong>New Time:</strong> ${bookingDetails.time}</p>
        <p><strong>Service:</strong> ${bookingDetails.service}</p>
      </div>
    `;
    await sendInternalNotification('Consultation Reschedule Alert', internalContent);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending reschedule confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Function to send reminder emails for consultations
export const sendReminderEmail = async (email, reminderDetails) => {
  const mailOptions = {
    from: `"Ineffa Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: reminderDetails.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333366;">${reminderDetails.heading}</h2>
        <p>Dear ${reminderDetails.name},</p>
        <p>${reminderDetails.subheading}</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #333366;">Consultation Details:</h3>
          <p><strong>Date:</strong> ${reminderDetails.date}</p>
          <p><strong>Time:</strong> ${reminderDetails.time}</p>
          <p><strong>Service:</strong> ${reminderDetails.service}</p>
         
          ${reminderDetails.meetingLink ? `
          <div style="margin-top: 15px; padding: 10px; background-color: #e6f3ff; border-radius: 5px;">
            <p style="margin: 0;"><strong>Zoom Meeting Link:</strong></p>
            <a href="${reminderDetails.meetingLink}" style="color: #0066cc; text-decoration: none; word-break: break-all;">${reminderDetails.meetingLink}</a>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="https://ineffa.tech/reshedule-consultaion" 
             style="background-color: #4CAF50; 
                    color: white; 
                    padding: 12px 25px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    display: inline-block;
                    font-weight: bold;">
                    Reschedule Appointment
          </a>
        </div>
        
        <p>If you need to cancel your consultation, please contact us at least 24 hours before the scheduled time.</p>
        
        <p>For any queries, feel free to reach out to our support team.</p>
        
        <p>Best regards,<br>Ineffa Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // Send internal notification
    const internalContent = `
      <div style="font-family: Arial, sans-serif;">
        <h3>Consultation Reminder Sent</h3>
        <p><strong>Client:</strong> ${reminderDetails.name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${reminderDetails.date}</p>
        <p><strong>Time:</strong> ${reminderDetails.time}</p>
        <p><strong>Service:</strong> ${reminderDetails.service}</p>
      </div>
    `;
    await sendInternalNotification('Consultation Reminder Alert', internalContent);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return { success: false, error: error.message };
  }
};

export default transporter;