

const SendScheduledEmails = async (details) => {
  const meetingTime = convertToISTDateTime(details.slotDate, details.slotStartTime);
  const meetingDateTime = new Date(meetingTime);

  const scheduledMessages = [
      {
          timing: new Date(meetingDateTime.getTime() - (24 * 60 * 60 * 1000)), // 24 hours before
          subject: "24 Hour Reminder: Your Consultation Tomorrow",
          heading: "Your consultation is scheduled for tomorrow",
          subheading: "We're looking forward to meeting you",
      },
      {
          timing: new Date(meetingDateTime.getTime() - (30 * 60 * 1000)), // 30 minutes before
          subject: "30 Minutes Until Your Consultation",
          heading: "Your consultation starts in 30 minutes",
          subheading: "Please prepare to join the meeting",
      },
      {
          timing: new Date(meetingDateTime.getTime() - (10 * 60 * 1000)), // 10 minutes before
          subject: "10 Minutes Until Your Consultation",
          heading: "Your consultation starts in 10 minutes",
          subheading: "Please get ready to join",
      },
      {
          timing: meetingDateTime, // At meeting time
          subject: "Your Consultation is Starting Now",
          heading: "Your consultation is starting now",
          subheading: "Please join the meeting",
      },
      {
          timing: new Date(meetingDateTime.getTime() + (5 * 60 * 1000)), // 5 minutes after
          subject: "Consultation Follow-up",
          heading: "Your consultation should be in progress",
          subheading: "If you haven't joined yet, please join now or reschedule",
      }
  ];

  try {
      const nowUTC = new Date();
      const nowIST = new Date(nowUTC.getTime() + (5.5 * 60 * 60 * 1000));

      // Filter out reminders in the past
      const validReminders = scheduledMessages.filter(message => message.timing > nowIST);

      if (validReminders.length === 0) {
          console.log('No valid reminders to schedule (all times are in the past).');
          return;
      }

      const EmailReminder = (await import('./models/EmailReminders.js')).default;

      const remindersArray = validReminders.map(message => ({
          subject: message.subject,
          heading: message.heading,
          subheading: message.subheading,
          scheduledTime: message.timing,
          sent: false
      }));

      const emailReminder = await EmailReminder.create({
          consultationId: details._id,
          reminders: remindersArray
      });

      console.log('Email reminders created successfully:', emailReminder._id);
  } catch (error) {
      console.error('Failed to create email reminders:', error);
  }
}




const convertToISTDateTime = (slotDate, slotStartTime) => {
  // Parse the date and time
  const [hours, minutes] = slotStartTime.split(':').map(Number);
  
  // Create a new date object from slotDate and set to UTC
  const date = new Date(slotDate);
  
  // Set the hours and minutes in UTC
  date.setUTCHours(hours, minutes, 0, 0);
  
  // Convert to IST by adding 5:30
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  
  // Format to ISO string with IST offset
  return istDate.toISOString().replace('Z', '+05:30');
}


export default SendScheduledEmails;