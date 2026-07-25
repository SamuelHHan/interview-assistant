const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

class MeetingService {
  constructor() {
    this.appId = process.env.TENCENT_MEETING_APP_ID;
    this.secretId = process.env.TENCENT_MEETING_SECRET_ID;
    this.secretKey = process.env.TENCENT_MEETING_SECRET_KEY;
    this.baseUrl = 'https://api.meeting.qq.com/v1';
  }

  /**
   * Generate signature for Tencent Meeting API
   * @param {string} httpMethod - HTTP method
   * @param {string} urlPath - URL path
   * @param {object} params - Query parameters
   * @param {number} timestamp - Unix timestamp
   * @returns {string} - Signature
   */
  generateSignature(httpMethod, urlPath, params, timestamp) {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringToSign = `${httpMethod}\n${urlPath}\n${sortedParams}\n${timestamp}`;
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(stringToSign);
    return hmac.digest('hex');
  }

  /**
   * Create a meeting
   * @param {object} options - Meeting options
   * @returns {Promise<object>} - Meeting info
   */
  async createMeeting(options) {
    const {
      subject,
      startTime,
      duration,
      hostUserId,
      nickName
    } = options;

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const urlPath = '/meetings';
      
      const body = {
        userid: hostUserId,
        instanceid: this.appId,
        subject: subject,
        start_time: Math.floor(new Date(startTime).getTime() / 1000),
        duration: duration,
        type: 0, // 0 for scheduled meeting
        attendees: [],
        settings: {
          mute_enable_join: false,
          allow_unmute: true,
          mute_all_enable: false
        }
      };

      const response = await axios.post(
        `${this.baseUrl}${urlPath}`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-TC-Action': 'CreateMeeting',
            'X-TC-Timestamp': timestamp,
            'X-TC-Version': '1.0',
            'Authorization': this.generateSignature('POST', urlPath, {}, timestamp)
          }
        }
      );

      if (response.data.error_code) {
        throw new Error(response.data.error_message);
      }

      return {
        meetingId: response.data.meeting_number,
        meetingUrl: response.data.join_url,
        hostUrl: response.data.host_url
      };
    } catch (error) {
      console.error('Failed to create meeting:', error.response?.data || error.message);
      throw new Error(`Failed to create meeting: ${error.message}`);
    }
  }

  /**
   * Get meeting info
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Meeting info
   */
  async getMeetingInfo(meetingId, userId) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const urlPath = `/meetings/${meetingId}`;

      const response = await axios.get(
        `${this.baseUrl}${urlPath}`,
        {
          params: {
            userid: userId,
            instanceid: this.appId
          },
          headers: {
            'Content-Type': 'application/json',
            'X-TC-Timestamp': timestamp,
            'Authorization': this.generateSignature('GET', urlPath, { userid: userId, instanceid: this.appId }, timestamp)
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get meeting info:', error.response?.data || error.message);
      throw new Error(`Failed to get meeting info: ${error.message}`);
    }
  }

  /**
   * End meeting
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async endMeeting(meetingId, userId) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const urlPath = `/meetings/${meetingId}/end`;

      const response = await axios.put(
        `${this.baseUrl}${urlPath}`,
        {
          userid: userId,
          instanceid: this.appId,
          end_reason: 'Interview completed'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-TC-Timestamp': timestamp,
            'Authorization': this.generateSignature('PUT', urlPath, {}, timestamp)
          }
        }
      );

      return response.data.error_code === 0;
    } catch (error) {
      console.error('Failed to end meeting:', error.response?.data || error.message);
      throw new Error(`Failed to end meeting: ${error.message}`);
    }
  }

  /**
   * Get meeting recordings
   * @param {string} meetingId - Meeting ID
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Recording info
   */
  async getMeetingRecordings(meetingId, userId) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const urlPath = `/meetings/${meetingId}/recordings`;

      const response = await axios.get(
        `${this.baseUrl}${urlPath}`,
        {
          params: {
            userid: userId,
            instanceid: this.appId
          },
          headers: {
            'Content-Type': 'application/json',
            'X-TC-Timestamp': timestamp,
            'Authorization': this.generateSignature('GET', urlPath, { userid: userId, instanceid: this.appId }, timestamp)
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to get recordings:', error.response?.data || error.message);
      throw new Error(`Failed to get recordings: ${error.message}`);
    }
  }

  /**
   * Generate mock meeting for development (when API is not available)
   * @returns {object} - Mock meeting info
   */
  generateMockMeeting() {
    const meetingId = Math.floor(Math.random() * 900000000 + 100000000).toString();
    return {
      meetingId,
      meetingUrl: `https://meeting.tencent.com/dm/${meetingId}`,
      hostUrl: `https://meeting.tencent.com/dm/${meetingId}?host=1`
    };
  }
}

module.exports = new MeetingService();