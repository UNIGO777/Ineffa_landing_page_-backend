
import dotenv from 'dotenv';
dotenv.config();

const CancleScheduledWhatsappMessages = async (reminderIds) => {
    const baseUrl = `https://wa.iconicsolution.co.in/wapp/api/cancel/campaign?apikey=${process.env.Whatsapp_api_key}&campid=`
    for (const id of reminderIds) {
      const url = `${baseUrl}${id}`;
      try {
        const res = await fetch(url, { method: 'GET' });
        const data = await res.json();
        console.log(`Response for ${id}:`, data);
      } catch (error) {
        console.error(`Error for ${id}:`, error);
      }
    }
}

export default CancleScheduledWhatsappMessages;