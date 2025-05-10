import axios from 'axios';
import { stringify } from 'querystring';
import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.Meeting_clientId; ;
const clientSecret = process.env.Meeting_clientSecret; // Replace with your actual client secret from the Zoom Marketplace Develope;
const accountId = process.env.Meeting_AccId; // Replace with your actual account ID from the Zoom Marketplace Develope;

// Step 1: Get Access Token
const getAccessToken = async () => {
  const tokenUrl = 'https://zoom.us/oauth/token';

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const data = stringify({
    grant_type: 'account_credentials',
    account_id: accountId,
  });

  const response = await axios.post(tokenUrl, data, { headers });
  return response.data.access_token;
};

// Step 2: Create Meeting
const createZoomMeeting = async (params) => {
  try {
    const token = await getAccessToken();

    const meetingResponse = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Meeting created successfully:', meetingResponse.data.join_url);

    return meetingResponse.data.join_url;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};



export default createZoomMeeting;
