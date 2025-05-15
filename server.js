import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cron from 'node-cron';
import EmailReminder from './models/EmailReminders.js';
import { sendReminderEmail } from './config/nodemailer.js';

// Import routes
import routes from './routes/index.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.send('Ineffa API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;


mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Setup cron job to check and send email reminders
    // Run every minute for more timely reminders
    cron.schedule('* * * * *', async () => {
      try {
        console.log('Running email reminder cron job...');
        
        // Get current time in IST (+5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
        const istTime = new Date(now.getTime() + istOffset);
        
        console.log(`Current IST time: ${istTime.toISOString()}`);
        
        // Find all email reminder documents with unsent reminders
        const emailReminders = await EmailReminder.find({
          reminders: {
            $elemMatch: {
              sent: false,
              scheduledTime: { $lte: istTime } // Only get reminders scheduled for now or earlier
            }
          }
        }).populate('consultationId');
        
        if (emailReminders.length > 0) {
          console.log(`Found ${emailReminders.length} email reminder documents with pending reminders`);
          
          for (const reminderDoc of emailReminders) {
            const consultation = reminderDoc.consultationId;
            
            if (!consultation) {
              console.log(`Consultation not found for reminder ${reminderDoc._id}`);
              continue;
            }
            
            console.log(`Processing reminders for consultation: ${consultation.name} (${consultation._id})`);
            let remindersSent = 0;
            
            // Sort reminders by scheduledTime to process them in order
            const sortedReminders = reminderDoc.reminders.sort((a, b) => 
              new Date(a.scheduledTime) - new Date(b.scheduledTime)
            );
            
            for (const reminder of sortedReminders) {
              const scheduledTime = new Date(reminder.scheduledTime);
              
              // Only process reminders that are due
              if (!reminder.sent && scheduledTime <= istTime) {
                console.log(`Reminder: ${reminder.subject}, Scheduled: ${scheduledTime.toISOString()}, Sent: ${reminder.sent}`);
                
                try {
                  console.log(`Sending reminder: ${reminder.subject}`);
                  
                  const reminderDetails = {
                    subject: reminder.subject,
                    heading: reminder.heading,
                    subheading: reminder.subheading,
                    name: consultation.name,
                    date: new Date(consultation.slotDate).toLocaleDateString('en-IN'),
                    time: consultation.slotStartTime,
                    meetingLink: consultation.meetingLink,
                    service: consultation.service,
                    zoomLink: consultation.zoomLink
                  };
                  console.log(consultation.meetingLink, "server");
                  
                  const result = await sendReminderEmail(consultation.email, reminderDetails);
                  
                  if (result.success) {
                    console.log(`✓ Reminder email "${reminder.subject}" sent to ${consultation.email}`);
                    reminder.sent = true;
                    reminder.sentAt = new Date();
                    await reminderDoc.save();
                    remindersSent++;
                  } else {
                    console.error(`✗ Failed to send reminder email: ${result.error}`);
                  }
                } catch (error) {
                  console.error(`Error processing reminder: ${error.message}`);
                }
              }
            }
            
            console.log(`Sent ${remindersSent} reminders for consultation ${consultation._id}`);
            
            const allSent = reminderDoc.reminders.every(r => r.sent);
            
            if (allSent) {
              await EmailReminder.findByIdAndDelete(reminderDoc._id);
              console.log(`✓ Removed completed reminder document ${reminderDoc._id}`);
            } else {
              const pendingReminders = reminderDoc.reminders.filter(r => !r.sent).length;
              console.log(`${pendingReminders} reminders still pending for document ${reminderDoc._id}`);
            }
          }
        } else {
          console.log('No pending email reminders found');
        }
      } catch (error) {
        console.error(`Error in email reminder cron job: ${error.message}`);
      }
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });