const { AccessToken, RoomServiceClient, EgressClient, EncodedFileOutput, S3Upload } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

dotenv.config();

class LiveKitService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    // 后端调用LiveKit使用Docker内网地址
    this.wsUrl = process.env.LIVEKIT_WS_URL;
    this.httpUrl = process.env.LIVEKIT_HTTP_URL;
    // 给前端用的公网WebSocket地址（浏览器直接访问）
    this.publicWsUrl = process.env.LIVEKIT_PUBLIC_WS_URL || this.wsUrl;
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.roomService = new RoomServiceClient(this.httpUrl, this.apiKey, this.apiSecret);
    this.egressClient = new EgressClient(this.httpUrl, this.apiKey, this.apiSecret);
  }

  /**
   * Generate a unique room name for the interview
   * @param {number} interviewId - Interview ID
   * @returns {string} - Room name
   */
  generateRoomName(interviewId) {
    return `interview-${interviewId}-${Date.now()}`;
  }

  /**
   * Create an Access Token for a participant
   * @param {string} identity - Participant identity
   * @param {string} roomName - Room name
   * @param {object} options - Token options
   * @returns {string} - JWT token
   */
  async createToken(identity, roomName, options = {}) {
    const {
      ttl = 7 * 24 * 60 * 60, // 7 days default
      canPublish = true,
      canSubscribe = true,
      canPublishData = true,
      metadata = {}
    } = options;

    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      ttl,
      metadata: JSON.stringify(metadata)
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
      canPublishData,
      roomRecord: true
    });

    // livekit-server-sdk v2 toJwt() returns a Promise<string>
    const jwtResult = await token.toJwt();
    console.log('toJwt result type:', typeof jwtResult, 'value type:', Array.isArray(jwtResult) ? 'array' : typeof jwtResult);
    
    // Ensure we always return a pure string
    let jwtString;
    if (typeof jwtResult === 'string') {
      jwtString = jwtResult.trim();
    } else if (Array.isArray(jwtResult)) {
      jwtString = jwtResult[0];
    } else {
      jwtString = String(jwtResult);
    }
    
    console.log('Final JWT string length:', jwtString.length);
    return jwtString;
  }

  /**
   * Create a LiveKit room for an interview
   * @param {object} options - Room options
   * @returns {Promise<object>} - Room info
   */
  async createRoom(options) {
    const { interviewId, subject, duration } = options;

    try {
      const roomName = this.generateRoomName(interviewId);
      
      // Create room with settings
      await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 60, // Room closes 60 seconds after last participant leaves
        maxParticipants: 10,
        metadata: JSON.stringify({
          interviewId,
          subject,
          duration,
          createdAt: new Date().toISOString()
        })
      });

      // Generate candidate token (valid for 7 days)
      const candidateToken = await this.createToken(`candidate-${interviewId}`, roomName, {
        ttl: 7 * 24 * 60 * 60, // 7 days in seconds
        metadata: {
          role: 'candidate',
          interviewId
        }
      });

      // Generate AI Agent token
      const agentToken = await this.createToken(`ai-agent-${interviewId}`, roomName, {
        ttl: 7 * 24 * 60 * 60,
        metadata: {
          role: 'ai_agent',
          interviewId
        }
      });

      // Meeting URL for candidate (direct join)
      const meetingUrl = `${this.frontendUrl}/livekit/meeting?token=${encodeURIComponent(candidateToken)}&room=${roomName}`;

      // Calculate token expiration
      const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      return {
        roomName,
        meetingUrl,
        candidateToken,
        agentToken,
        tokenExpires,
        // 给前端用的是公网WebSocket地址
        wsUrl: this.publicWsUrl
      };
    } catch (error) {
      console.error('Failed to create LiveKit room:', error);
      throw new Error(`Failed to create room: ${error.message}`);
    }
  }

  /**
   * Generate a fresh token for a candidate to join an existing room
   * @param {string} roomName - Room name
   * @param {number} interviewId - Interview ID
   * @returns {Promise<string>} - New token
   */
  async generateCandidateToken(roomName, interviewId) {
    return await this.createToken(`candidate-${interviewId}`, roomName, {
      ttl: 7 * 24 * 60 * 60,
      metadata: {
        role: 'candidate',
        interviewId
      }
    });
  }

  /**
   * Generate a token for AI Agent
   * @param {string} roomName - Room name
   * @param {number} interviewId - Interview ID
   * @returns {Promise<string>} - Agent token
   */
  async generateAgentToken(roomName, interviewId) {
    return await this.createToken(`ai-agent-${interviewId}`, roomName, {
      ttl: 7 * 24 * 60 * 60,
      metadata: {
        role: 'ai_agent',
        interviewId
      }
    });
  }

  /**
   * Start room recording (egress)
   * @param {string} roomName - Room name
   * @returns {Promise<object>} - Egress info
   */
  async startRecording(roomName) {
    try {
      const fileOutput = new EncodedFileOutput({
        filepath: `interview-recordings/${roomName}.mp4`,
        disableManifest: true
      });

      const egressInfo = await this.egressClient.startRoomCompositeEgress(roomName, {
        file: fileOutput
      });

      return {
        egressId: egressInfo.egressId,
        status: egressInfo.status
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Stop room recording
   * @param {string} egressId - Egress ID
   * @returns {Promise<object>} - Recording info
   */
  async stopRecording(egressId) {
    try {
      const egressInfo = await this.egressClient.stopEgress(egressId);
      return {
        egressId: egressInfo.egressId,
        status: egressInfo.status,
        filePath: egressInfo.fileResults?.[0]?.filename
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw new Error(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * List recordings for a room
   * @param {string} roomName - Room name
   * @returns {Promise<object>} - List of recordings
   */
  async listRecordings(roomName) {
    try {
      const recordings = await this.egressClient.listEgress({ roomName });
      return recordings;
    } catch (error) {
      console.error('Failed to list recordings:', error);
      throw new Error(`Failed to list recordings: ${error.message}`);
    }
  }

  /**
   * Delete a room
   * @param {string} roomName - Room name
   * @returns {Promise<boolean>} - Success
   */
  async deleteRoom(roomName) {
    try {
      await this.roomService.deleteRoom(roomName);
      return true;
    } catch (error) {
      console.error('Failed to delete room:', error);
      return false;
    }
  }

  /**
   * Get room participants
   * @param {string} roomName - Room name
   * @returns {Promise<Array>} - Participants
   */
  async getParticipants(roomName) {
    try {
      const participants = await this.roomService.listParticipants(roomName);
      return participants;
    } catch (error) {
      console.error('Failed to get participants:', error);
      throw new Error(`Failed to get participants: ${error.message}`);
    }
  }

  /**
   * Send data message to room participants
   * @param {string} roomName - Room name
   * @param {string} data - Message data
   * @returns {Promise<boolean>} - Success
   */
  async sendDataMessage(roomName, data) {
    try {
      await this.roomService.sendData(roomName, data, 0 /* reliable */);
      return true;
    } catch (error) {
      console.error('Failed to send data message:', error);
      return false;
    }
  }
}

module.exports = new LiveKitService();