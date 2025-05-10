import getUnixTimestampFromLocal from "./GenerateTimeStamp.js";
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const SendScheduledWhatsappMessages = async (details) => {
    const baseUrl = `https://wa.iconicsolution.co.in/wapp/api/v2/send/bytemplate?apikey=${process.env.Whatsapp_api_key}&templatename=`
    
    console.log(process.env.Whatsapp_api_key);
  
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
  
    // const reminderTime24hours = new Date(details.slotDate);
    // reminderTime24hours.setDate(reminderTime24hours.getDate() - 1); // Subtract 1 day
    // const formattedDate = reminderTime24hours.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    // const unixTimeStamp = getUnixTimestampFromLocal(formattedDate, details.slotStartTime);
    // console.log(unixTimeStamp);
    // const whatsappApiUrl = `${baseUrl}${scheduledMessages[0].url}${unixTimeStamp}&dvariables=${scheduledMessages[0].dvariables}`;
    // await fetch(whatsappApiUrl, { method: 'GET' }).then((res) => {
    //   console.log(res)
    // });
  
    // // Get hours and minutes from slot time
    // const [hours30, minutes30] = details.slotStartTime.split(':').map(Number);
    
    // // Calculate time 30 minutes before slot time
    // const totalMinutes30 = hours30 * 60 + minutes30;
    // const newTotalMinutes30 = totalMinutes30 - 30;
    // const newHours30 = Math.floor(newTotalMinutes30 / 60);
    // const newMinutes30 = newTotalMinutes30 % 60;
    
    // // Format as HH:MM
    // const formattedTime30min = `${newHours30.toString().padStart(2, '0')}:${newMinutes30.toString().padStart(2, '0')}`;
    
    // const unixTimeStamp30min = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], formattedTime30min);
    // const whatsappApiUrl30min = `${baseUrl}${scheduledMessages[1].url}${unixTimeStamp30min}&dvariables=${scheduledMessages[1].dvariables}`;
    // await fetch(whatsappApiUrl30min, { method: 'GET' }).then((res) => {
    //   console.log(res)
    // });
  
  
    // // Get hours and minutes from slot time (e.g. "16:00")
    const [hours10, minutes10] = details.slotStartTime.split(':').map(Number);
    
    // Calculate time 10 minutes before slot time
    const totalMinutes = hours10 * 60 + minutes10;
    const newTotalMinutes = totalMinutes - 10;
    const newHours = Math.floor(newTotalMinutes / 60);
    const newMinutes = newTotalMinutes % 60;
    
    
    // Format as HH:MM
    const formattedTime10min = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    console.log(formattedTime10min);
    const unixTimeStamp10min = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], formattedTime10min);
    const whatsappApiUrl10min = `${baseUrl}${scheduledMessages[2].url}${unixTimeStamp10min}&dvariables=${scheduledMessages[2].dvariables}`;
    console.log(whatsappApiUrl10min);
    await fetch(whatsappApiUrl10min, { method: 'GET' }).then((res) => {
    //   console.log(res)
  
    });
  
  
    // const unixTimeStampLive = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], details.slotStartTime);
    // const whatsappApiUrlLive = `${baseUrl}${scheduledMessages[3].url}${unixTimeStampLive}&dvariables=${scheduledMessages[3].dvariables}`;
    // console.log(whatsappApiUrlLive);
    // await fetch(whatsappApiUrlLive, { method: 'GET' }).then((res) => {
    //   console.log(res.body)
    // });
  
    // Get hours and minutes from slot time
    // const [hours5, minutes5] = details.slotStartTime.split(':').map(Number);
    
    // // Calculate time 5 minutes after slot time
    // const totalMinutes5 = hours5 * 60 + minutes5;
    // const newTotalMinutes5 = totalMinutes5 + 5;
    // const newHours5 = Math.floor(newTotalMinutes5 / 60);
    // const newMinutes5 = newTotalMinutes5 % 60;
    
    // // Format as HH:MM
    // const formattedTime5min = `${newHours5.toString().padStart(2, '0')}:${newMinutes5.toString().padStart(2, '0')}`;
    
    // const unixTimeStamp5min = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], formattedTime5min);
    // const whatsappApiUrl5min = `${baseUrl}${scheduledMessages[4].url}${unixTimeStamp5min}&dvariables=${scheduledMessages[4].dvariables}`;
    // await fetch(whatsappApiUrl5min, { method: 'GET' }).then((res) => {
    //   console.log(res.body)
    // });
  }



// Test function to check scheduled WhatsApp messages
const testScheduledMessages = async () => {
  const testDetails = {
    name: "naman jain",
    phone: "7000610047",
    service: "consultation",
    slotDate: new Date("2025-05-11T00:00:00.000+00:00"),
    slotStartTime: "4:02",
    meetingLink: "https://dummy-meeting-link.com"
  };

  try {
    await SendScheduledWhatsappMessages(testDetails);
    console.log("Test completed successfully!");
    console.log("Test details:", {
      name: testDetails.name,
      phone: testDetails.phone,
      date: testDetails.slotDate.toISOString().split('T')[0],
      time: testDetails.slotStartTime
    });
  } catch (error) {
    console.error("Error during test:", error);
  }
};

// Execute test
testScheduledMessages();

// Helper function to convert local time to Unix timestamp

