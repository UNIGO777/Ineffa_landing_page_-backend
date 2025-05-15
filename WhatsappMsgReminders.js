import getUnixTimestampFromLocal from "./GenerateTimeStamp.js";
import dotenv from 'dotenv';
import Consultation from "./models/Consultation.js";
dotenv.config();


const SendScheduledWhatsappMessages = async (details) => {
  const baseUrl = `https://wa.iconicsolution.co.in/wapp/api/v2/send/bytemplate?apikey=${process.env.Whatsapp_api_key}&templatename=`;
  
  const scheduledMessages = [
    {
      delayLabel: '24hr_reminder',
      url: `consultation_reminders_24_hour_before&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.service.toLowerCase().includes('consultation') ? details.service : `${details.service} consultation`},${details.slotDate.toISOString().split('T')[0]},${details.slotStartTime},${details.meetingLink}`
    },
    {
      delayLabel: '30min_reminder',
      url: `consultation_reminders_30_min_before&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.service.toLowerCase().includes('consultation') ? details.service : `${details.service} consultation`},${details.meetingLink}`
    },
    {
      delayLabel: '10min_reminder',
      url: `consultation_reminders_10_min_before&mobile=${details.phone}&scheduledate=`,
      dvariables: `${details.name},${details.service.toLowerCase().includes('consultation') ? details.service : `${details.service} consultation`},${details.meetingLink}`
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

  const requestIds = [];

  // 1. 24hr reminder
  const reminderTime24 = new Date(details.slotDate);
  reminderTime24.setDate(reminderTime24.getDate() - 1);
  const unix24 = getUnixTimestampFromLocal(reminderTime24.toISOString().split('T')[0], details.slotStartTime);
  await sendRequest(0, unix24);

  // 2. 30 min before
  const [h30, m30] = details.slotStartTime.split(':').map(Number);
  const t30 = h30 * 60 + m30 - 30;
  const time30 = `${String(Math.floor(t30 / 60)).padStart(2, '0')}:${String(t30 % 60).padStart(2, '0')}`;
  const unix30 = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], time30);
  await sendRequest(1, unix30);

  // 3. 10 min before
  const [h10, m10] = details.slotStartTime.split(':').map(Number);
  const t10 = h10 * 60 + m10 - 10;
  const time10 = `${String(Math.floor(t10 / 60)).padStart(2, '0')}:${String(t10 % 60).padStart(2, '0')}`;
  const unix10 = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], time10);
  await sendRequest(2, unix10);

  // 4. live now
  const unixLive = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], details.slotStartTime);
  await sendRequest(3, unixLive);

  // 5. 5 min after
  const [h5, m5] = details.slotStartTime.split(':').map(Number);
  const t5 = h5 * 60 + m5 + 5;
  const time5 = `${String(Math.floor(t5 / 60)).padStart(2, '0')}:${String(t5 % 60).padStart(2, '0')}`;
  const unix5 = getUnixTimestampFromLocal(details.slotDate.toISOString().split('T')[0], time5);
  await sendRequest(4, unix5);

  // console.log('All Request IDs:', requestIds);

  const consultationId = details._id;
  const consultation = await Consultation.findById(consultationId);
  consultation.WhatsappReminderIds = requestIds.map(item => item.requestid);
  await consultation.save();

  // Helper function to send request and collect requestid
  async function sendRequest(index, unixTimestamp) {
    const msg = scheduledMessages[index];
    const url = `${baseUrl}${msg.url}${unixTimestamp}&dvariables=${msg.dvariables}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();
      // console.log(`Response for ${msg.delayLabel}:`, data);
      if (data.requestid) {
        requestIds.push({ delay: msg.delayLabel, requestid: data.requestid });
      }
    } catch (error) {
      console.error(`Error for ${msg.delayLabel}:`, error);
    }
  }
};






// SendScheduledWhatsappMessages({
//   phone: "7000610047",
//   name: "Rohit",
//   meetingLink: "hello.com",
//   name: "Rohit",
//   service: "Consultation",
//   slotDate: new Date(),
//   slotStartTime: "21:49"
// })



export default SendScheduledWhatsappMessages;
