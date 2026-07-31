const livekitService = require('./livekit.service');
const qwenService = require('./qwen.service');
const { Interview, JobDescription } = require('../models');

/**
 * AI Agent Service - 管理AI面试官的状态和面试流程
 * 注意：后端使用livekit-server-sdk的RoomServiceClient发送数据消息
 * 不需要像前端那样建立WebRTC连接
 */
class AIAgentService {
  constructor() {
    this.activeAgents = new Map(); // interviewId -> agent instance
    this.transcripts = new Map(); // interviewId -> transcript array
    this.timers = new Map(); // interviewId -> timeout timer
  }

  /**
   * Start AI Agent for an interview
   * @param {number} interviewId - Interview ID
   * @param {string} roomName - LiveKit room name
   * @param {string} agentToken - LiveKit agent token (保留以备后续使用)
   */
  async startAgent(interviewId, roomName, agentToken) {
    try {
      const interview = await Interview.findByPk(interviewId, {
        include: [
          { model: JobDescription, as: 'jobDescription' }
        ]
      });
      if (!interview) {
        throw new Error('Interview not found');
      }

      // Store agent instance (不需要WebRTC连接，仅管理状态)
      this.activeAgents.set(interviewId, {
        interviewId,
        roomName,
        agentToken,
        startTime: new Date(),
        currentQuestionIndex: 0,
        phase: 'greeting', // greeting, interviewing, closing
      });

      // Initialize transcript
      this.transcripts.set(interviewId, []);

      // Update interview status
      await interview.update({
        ai_agent_joined: true,
        ai_agent_joined_at: new Date(),
        status: 'in_progress',
        interview_started_at: new Date(),
      });

      // Send greeting message after a short delay
      setTimeout(() => {
        this.sendGreeting(interviewId, interview);
      }, 2000);

      // Start 20-minute timer
      this.startInterviewTimer(interviewId, interview.duration || 20);

      console.log(`AI Agent started for interview ${interviewId} in room ${roomName}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to start AI Agent for interview ${interviewId}:`, error);
      throw error;
    }
  }

  /**
   * Send greeting message to candidate
   */
  async sendGreeting(interviewId, interview) {
    const resume = await interview.getResume();
    const jd = await interview.getJobDescription();
    
    const greeting = `你好${resume ? resume.candidate_name : ''}，欢迎参加${jd ? jd.company : ''}的${jd ? jd.title : ''}职位面试。我是AI面试官，将为您进行面试。整个面试大约需要20分钟，请您保持放松，如实回答即可。那我们开始吧！`;

    await this.sendAgentMessage(interviewId, greeting, 'greeting');
    
    // Move to interviewing phase after greeting
    const agent = this.activeAgents.get(interviewId);
    if (agent) {
      agent.phase = 'interviewing';
      // Ask first question after greeting
      setTimeout(() => {
        this.askNextQuestion(interviewId, interview);
      }, 3000);
    }
  }

  /**
   * Ask next interview question
   */
  async askNextQuestion(interviewId, interview) {
    const agent = this.activeAgents.get(interviewId);
    if (!agent || agent.phase !== 'interviewing') return;

    const questions = interview.confirmed_questions || interview.interview_questions || [];
    
    if (agent.currentQuestionIndex >= questions.length) {
      // All questions asked, move to closing
      await this.sendClosingMessage(interviewId, interview);
      return;
    }

    const question = questions[agent.currentQuestionIndex];
    const questionText = typeof question === 'string' ? question : question.question;
    
    await this.sendAgentMessage(interviewId, questionText, 'question');
    agent.currentQuestionIndex++;
  }

  /**
   * Handle candidate's transcript/response
   */
  async handleCandidateTranscript(interviewId, text) {
    const agent = this.activeAgents.get(interviewId);
    if (!agent) return;

    // Store in transcript
    const transcript = this.transcripts.get(interviewId);
    transcript.push({
      speaker: 'candidate',
      text,
      timestamp: new Date().toISOString(),
    });

    const interview = await Interview.findByPk(interviewId);
    const questions = interview.confirmed_questions || interview.interview_questions || [];
    const currentQuestion = questions[agent.currentQuestionIndex - 1];

    // Generate follow-up or acknowledge response
    if (agent.currentQuestionIndex < questions.length) {
      // Brief acknowledgment then next question
      const acknowledgment = this.generateAcknowledgment(text, currentQuestion);
      await this.sendAgentMessage(interviewId, acknowledgment, 'acknowledgment');
      
      setTimeout(() => {
        this.askNextQuestion(interviewId, interview);
      }, 2000);
    } else if (agent.currentQuestionIndex >= questions.length && agent.phase === 'interviewing') {
      // This was the last question, move to closing
      const acknowledgment = this.generateAcknowledgment(text, currentQuestion);
      await this.sendAgentMessage(interviewId, acknowledgment, 'acknowledgment');
      
      setTimeout(() => {
        this.sendClosingMessage(interviewId, interview);
      }, 2000);
    }
  }

  /**
   * Generate acknowledgment response
   */
  generateAcknowledgment(answer, question) {
    const acknowledgments = [
      '好的，感谢您的回答。',
      '明白了，请继续。',
      '感谢您的分享。',
      '收到，感谢您的回答。',
    ];
    
    // If answer is very short, encourage more detail
    if (answer.length < 20) {
      return '能否请您再详细说明一下呢？';
    }
    
    return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
  }

  /**
   * Send closing message
   */
  async sendClosingMessage(interviewId, interview) {
    const agent = this.activeAgents.get(interviewId);
    if (!agent) return;

    agent.phase = 'closing';

    const closing = `好的，我们的面试到此结束。感谢您参加本次面试，面试结果会在近期通过邮件通知您。祝您有愉快的一天！`;
    
    await this.sendAgentMessage(interviewId, closing, 'closing');
    
    // End interview after closing message
    setTimeout(() => {
      this.endInterview(interviewId, 'completed');
    }, 5000);
  }

  /**
   * Send message as AI Agent - 使用LiveKit Server SDK发送数据消息
   */
  async sendAgentMessage(interviewId, text, type = 'message') {
    const agent = this.activeAgents.get(interviewId);
    if (!agent) return;

    const { roomName } = agent;

    // Store in transcript
    const transcript = this.transcripts.get(interviewId);
    transcript.push({
      speaker: 'ai_agent',
      text,
      type,
      timestamp: new Date().toISOString(),
    });

    // Publish as data message via server SDK
    const messageData = JSON.stringify({
      type: 'agent_message',
      text,
      messageType: type,
      timestamp: new Date().toISOString(),
    });

    try {
      // 使用RoomServiceClient发送数据到房间
      await livekitService.sendDataMessage(roomName, messageData);
    } catch (error) {
      console.error('Failed to send agent message via server SDK:', error);
    }

    console.log(`AI Agent [${type}]: ${text}`);
  }

  /**
   * Start interview timer (20 minutes)
   */
  startInterviewTimer(interviewId, durationMinutes) {
    const durationMs = durationMinutes * 60 * 1000;
    
    const timer = setTimeout(() => {
      console.log(`Interview ${interviewId} timeout reached (${durationMinutes} minutes)`);
      this.sendTimeUpMessage(interviewId);
    }, durationMs);

    this.timers.set(interviewId, timer);
  }

  /**
   * Send time-up warning and end interview
   */
  async sendTimeUpMessage(interviewId) {
    const agent = this.activeAgents.get(interviewId);
    if (!agent) return;

    const timeUpMessage = `时间到了，我们的面试需要结束了。感谢您参加本次面试！`;
    await this.sendAgentMessage(interviewId, timeUpMessage, 'time_up');

    setTimeout(() => {
      this.endInterview(interviewId, 'timeout');
    }, 3000);
  }

  /**
   * End interview and cleanup
   */
  async endInterview(interviewId, reason = 'completed') {
    console.log(`Ending interview ${interviewId}, reason: ${reason}`);

    // Clear timer
    const timer = this.timers.get(interviewId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(interviewId);
    }

    // Get transcript
    const transcript = this.transcripts.get(interviewId) || [];
    const transcriptText = this.formatTranscript(transcript);

    // Get agent info before cleanup
    const agent = this.activeAgents.get(interviewId);

    // Stop recording if we have egress ID
    let recordingStopped = false;
    try {
      const interview = await Interview.findByPk(interviewId);
      if (interview && interview.recording_egress_id) {
        await livekitService.stopRecording(interview.recording_egress_id);
        recordingStopped = true;
        console.log(`Recording stopped for interview ${interviewId}`);
      }
    } catch (recordingError) {
      console.error('Failed to stop recording:', recordingError.message);
    }

    // Update interview record
    try {
      const interview = await Interview.findByPk(interviewId, {
        include: [
          { model: JobDescription, as: 'jobDescription' }
        ]
      });
      if (interview) {
        await interview.update({
          status: 'completed',
          transcript: transcriptText,
          interview_ended_at: new Date(),
        });

        // Trigger AI evaluation automatically
        try {
          const evaluation = await qwenService.evaluateInterview(
            transcriptText,
            interview.confirmed_questions || interview.interview_questions,
            interview.jobDescription?.description || ''
          );

          // Calculate overall score
          const scores = [
            evaluation.fluency_score,
            evaluation.professionalism_score,
            evaluation.communication_score,
            evaluation.technical_depth_score
          ];
          const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

          await interview.update({
            ai_evaluation: evaluation,
            overall_score: overallScore,
            meeting_minutes: evaluation.meeting_minutes
          });

          console.log(`AI evaluation completed for interview ${interviewId}, overall score: ${overallScore}`);
        } catch (evalError) {
          console.error('AI evaluation failed:', evalError.message);
        }
      }
    } catch (error) {
      console.error('Failed to update interview on end:', error);
    }

    // Cleanup
    this.activeAgents.delete(interviewId);
    this.transcripts.delete(interviewId);

    console.log(`Interview ${interviewId} ended, recording stopped: ${recordingStopped}`);
    return { transcript, reason };
  }

  /**
   * Format transcript array to text
   */
  formatTranscript(transcript) {
    return transcript.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN');
      const speaker = entry.speaker === 'ai_agent' ? 'AI面试官' : '候选人';
      return `[${time}] ${speaker}: ${entry.text}`;
    }).join('\n');
  }

  /**
   * Get current transcript for an interview
   */
  getTranscript(interviewId) {
    return this.transcripts.get(interviewId) || [];
  }

  /**
   * Check if agent is active
   */
  isAgentActive(interviewId) {
    return this.activeAgents.has(interviewId);
  }

  /**
   * Stop all active agents (for shutdown)
   */
  async stopAllAgents() {
    const promises = [];
    for (const [interviewId] of this.activeAgents) {
      promises.push(this.endInterview(interviewId, 'system_shutdown'));
    }
    await Promise.all(promises);
  }
}

module.exports = new AIAgentService();