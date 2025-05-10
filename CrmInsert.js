import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const crmApi = 'https://www.api.365leadmanagement.com/wpaddwebsiteleads';

const sendToCRM = async (consultation) => {
  try {
    // Using dummy data for testing
    const dummyConsultation = {
      name: "John Doe",
      email: "johndoe@example.com", 
      phone: "+1234567890",
      message: "I'm interested in your services"
    };

    // Use dummy data instead of actual consultation
    const response = await axios.post(crmApi, {
      customerName: dummyConsultation.name,
      customerEmail: dummyConsultation.email,
      customerMobile: dummyConsultation.phone,
      customerComment: dummyConsultation.message
    }, {
      headers: {
        'Authorization': process.env.CRM_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('CRM API Response:', response.data);
    return response.data;

  } catch (error) {
    console.error('Error sending data to CRM:', error.message);
    throw error;
  }
};

sendToCRM();