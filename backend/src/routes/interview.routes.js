const express = require('express');
const { Interview, Resume, JobDescription, Report } = require('../models');
const qwenService = require('../services/qwen.service');
const livekitService = require('../services/livekit.service');
const aiAgentService = require('../services/ai-agent.service');
const emailService = require('../services/email.service');

const router = express.Router();

/**
 * @route POST /api/interview/create
 * @desc Create a new interview session
 */
router.post('/create', async (req, res) => {
  try {
    const { resumeId, jdId } = req.body;

    // Validate resume and JD exist
    const resume = await Resume.findByPk(resumeId);
    const jd = await JobDescription.findByPk(jdId);

    if (!resume || !jd) {
      return res.status(404).json({ 
        success: false, 
        message: 'Resume or Job Description not found' 
      });
    }

    // Create interview record
    const interview = await Interview.create({
      resume_id: resumeId,
      jd_id: jdId,
      status: 'pending'
    });

    // Auto-generate questions
    try {
      const resumeData = {
        name: resume.candidate_name,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education
      };
      const questions = await qwenService.generateInterviewQuestions(
        resumeData,
        jd.description
      );
      await interview.update({
        interview_questions: questions.questions,
        status: 'questions_generated'
      });
    } catch (qError) {
      console.error('Auto-generate questions failed:', qError.message);
    }

    // Auto-create LiveKit room and schedule
    try {
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const roomInfo = await livekitService.createRoom({
        interviewId: interview.id,
        subject: `面试 - ${jd.title}`,
        duration: 20
      });

      await interview.update({
        scheduled_time: scheduledTime,
        duration: 20,
        meeting_url: roomInfo.meetingUrl,
        meeting_id: roomInfo.roomName,
        meeting_token: roomInfo.candidateToken,
        meeting_token_expires: roomInfo.tokenExpires,
        status: 'email_sent'
      });

      // Auto-send invitation email if candidate email exists
      if (resume.candidate_email) {
        try {
          const interviewTime = new Date(scheduledTime).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          await emailService.sendInterviewInvitation({
            to: resume.candidate_email,
            candidateName: resume.candidate_name,
            position: jd.title,
            companyName: jd.company,
            interviewTime: interviewTime,
            duration: interview.duration || 20,
            meetingUrl: roomInfo.meetingUrl,
            meetingId: roomInfo.roomName,
            interviewId: interview.id,
            frontendUrl: process.env.FRONTEND_URL,
            tokenExpires: roomInfo.tokenExpires
          });
          await interview.update({ auto_email_sent: true });
        } catch (eError) {
          console.error('Auto-send email failed:', eError.message);
        }
      }
    } catch (roomError) {
      console.error('Auto-create room failed:', roomError.message);
    }

    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Create interview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/generate-questions
 * @desc Generate interview questions based on resume and JD
 */
router.post('/:id/generate-questions', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Generate questions using AI
    const resumeData = {
      name: interview.resume.candidate_name,
      skills: interview.resume.skills,
      experience: interview.resume.experience,
      education: interview.resume.education
    };

    const questions = await qwenService.generateInterviewQuestions(
      resumeData,
      interview.jobDescription.description
    );

    // Update interview with generated questions
    await interview.update({
      interview_questions: questions.questions,
      status: 'questions_generated'
    });

    res.json({
      success: true,
      data: {
        interviewId: interview.id,
        questions: questions.questions
      }
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/confirm-questions
 * @desc Confirm or modify interview questions
 */
router.post('/:id/confirm-questions', async (req, res) => {
  try {
    const { questions } = req.body;

    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    await interview.update({
      confirmed_questions: questions,
      status: 'confirmed'
    });

    res.json({
      success: true,
      message: 'Questions confirmed successfully'
    });
  } catch (error) {
    console.error('Confirm questions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/schedule
 * @desc Schedule interview and create LiveKit room
 */
router.post('/:id/schedule', async (req, res) => {
  try {
    const { scheduledTime, duration } = req.body;

    const interview = await Interview.findByPk(req.params.id, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Create LiveKit room
    const roomInfo = await livekitService.createRoom({
      interviewId: interview.id,
      subject: `面试 - ${interview.jobDescription.title}`,
      duration: duration || 20
    });

    // Update interview with meeting info
    await interview.update({
      scheduled_time: scheduledTime,
      duration: duration || 20,
      meeting_url: roomInfo.meetingUrl,
      meeting_id: roomInfo.roomName,
      meeting_token: roomInfo.candidateToken,
      meeting_token_expires: roomInfo.tokenExpires,
      status: 'email_sent'
    });

    res.json({
      success: true,
      data: {
        interviewId: interview.id,
        meetingUrl: roomInfo.meetingUrl,
        meetingId: roomInfo.roomName,
        tokenExpires: roomInfo.tokenExpires,
        scheduledTime: scheduledTime
      }
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/interview/list
 * @desc Get all interviews
 */
router.get('/list', async (req, res) => {
  try {
    const interviews = await Interview.findAll({
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: interviews
    });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/interview/:id
 * @desc Get interview details
 */
router.get('/:id', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' },
        { model: Report, as: 'report' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.json({
      success: true,
      data: interview
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/start
 * @desc Start the interview (manual trigger)
 */
router.post('/:id/start', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    await interview.update({ status: 'in_progress' });

    res.json({
      success: true,
      message: 'Interview started',
      data: {
        questions: interview.confirmed_questions || interview.interview_questions
      }
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/end
 * @desc End the interview manually
 */
router.post('/:id/end', async (req, res) => {
  try {
    const { transcript, recordingUrl } = req.body;

    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Stop AI Agent if active
    if (aiAgentService.isAgentActive(interview.id)) {
      await aiAgentService.endInterview(interview.id, 'manual_end');
    }

    await interview.update({
      status: 'completed',
      transcript: transcript,
      recording_url: recordingUrl,
      interview_ended_at: new Date()
    });

    res.json({
      success: true,
      message: 'Interview completed'
    });
  } catch (error) {
    console.error('End interview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/accept
 * @desc Candidate accepts the interview invitation
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    await interview.update({
      candidate_accepted: true,
      accepted_at: new Date()
    });

    res.json({
      success: true,
      message: 'Interview invitation accepted'
    });
  } catch (error) {
    console.error('Accept interview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/join
 * @desc Candidate joins the LiveKit meeting - triggers AI Agent auto-join
 */
router.post('/:id/join', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Update candidate join status
    await interview.update({
      candidate_joined: true,
      joined_at: new Date()
    });

    // Auto-start AI Agent when candidate joins
    try {
      if (!aiAgentService.isAgentActive(interview.id) && interview.meeting_id && interview.meeting_token) {
        // Generate fresh agent token
        const agentToken = livekitService.generateAgentToken(interview.meeting_id, interview.id);
        
        // Start recording
        const recordingInfo = await livekitService.startRecording(interview.meeting_id);
        
        // Start AI Agent
        await aiAgentService.startAgent(interview.id, interview.meeting_id, agentToken);
        
        // Store recording info
        await interview.update({
          recording_egress_id: recordingInfo.egressId
        });
      }
    } catch (agentError) {
      console.error('Auto-start AI Agent failed:', agentError.message);
      // Don't fail the join if agent start fails
    }

    res.json({
      success: true,
      message: 'Candidate joined the meeting',
      data: {
        meetingUrl: interview.meeting_url,
        // 返回给前端的是公网WebSocket地址
        wsUrl: process.env.LIVEKIT_PUBLIC_WS_URL || process.env.LIVEKIT_WS_URL
      }
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/interview/:id/status
 * @desc Get interview status for candidate tracking
 */
router.get('/:id/status', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    res.json({
      success: true,
      data: {
        id: interview.id,
        status: interview.status,
        candidate_accepted: interview.candidate_accepted,
        accepted_at: interview.accepted_at,
        candidate_joined: interview.candidate_joined,
        joined_at: interview.joined_at,
        ai_agent_joined: interview.ai_agent_joined,
        meeting_url: interview.meeting_url,
        meeting_id: interview.meeting_id,
        meeting_token_expires: interview.meeting_token_expires,
        scheduled_time: interview.scheduled_time,
        candidate_name: interview.resume?.candidate_name,
        position: interview.jobDescription?.title
      }
    });
  } catch (error) {
    console.error('Get interview status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/refresh-token
 * @desc Refresh candidate's LiveKit token, or create a room if none exists
 */
router.post('/:id/refresh-token', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // If no meeting exists, create one
    if (!interview.meeting_id) {
      const scheduledTime = interview.scheduled_time || new Date(Date.now() + 24 * 60 * 60 * 1000);
      const roomInfo = await livekitService.createRoom({
        interviewId: interview.id,
        subject: `面试 - ${interview.jobDescription?.title || '未知职位'}`,
        duration: interview.duration || 20
      });

      await interview.update({
        scheduled_time: scheduledTime,
        duration: roomInfo.duration || 20,
        meeting_url: roomInfo.meetingUrl,
        meeting_id: roomInfo.roomName,
        meeting_token: roomInfo.candidateToken,
        meeting_token_expires: roomInfo.tokenExpires,
        status: 'email_sent'
      });

      const meetingUrl = roomInfo.meetingUrl;

      return res.json({
        success: true,
        data: {
          token: roomInfo.candidateToken,
          meetingUrl,
          tokenExpires: roomInfo.tokenExpires,
          scheduledTime: scheduledTime,
          meetingId: roomInfo.roomName
        }
      });
    }

    // Meeting exists, generate fresh token
    const newToken = livekitService.generateCandidateToken(interview.meeting_id, interview.id);
    const tokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await interview.update({
      meeting_token: newToken,
      meeting_token_expires: tokenExpires,
      meeting_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/livekit/meeting?token=${encodeURIComponent(newToken)}&room=${interview.meeting_id}`
    });

    const meetingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/livekit/meeting?token=${encodeURIComponent(newToken)}&room=${interview.meeting_id}`;

    res.json({
      success: true,
      data: {
        token: newToken,
        meetingUrl,
        tokenExpires,
        scheduledTime: interview.scheduled_time,
        meetingId: interview.meeting_id
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/transcript
 * @desc Receive candidate transcript from frontend speech recognition
 */
router.post('/:id/transcript', async (req, res) => {
  try {
    const { text } = req.body;
    const interviewId = req.params.id;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Transcript text is required' });
    }

    const interview = await Interview.findByPk(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Forward to AI Agent for processing
    if (aiAgentService.isAgentActive(interviewId)) {
      await aiAgentService.handleCandidateTranscript(interviewId, text);
      res.json({
        success: true,
        message: 'Transcript received and processed'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'AI Agent is not active for this interview'
      });
    }
  } catch (error) {
    console.error('Transcript processing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/interview/:id/evaluate
 * @desc Generate AI evaluation from interview transcript
 */
router.post('/:id/evaluate', async (req, res) => {
  try {
    const interview = await Interview.findByPk(req.params.id, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    if (!interview.transcript) {
      return res.status(400).json({ success: false, message: 'No transcript available for evaluation' });
    }

    // Generate evaluation using AI
    const evaluation = await qwenService.evaluateInterview(
      interview.transcript,
      interview.confirmed_questions || interview.interview_questions,
      interview.jobDescription.description
    );

    // Calculate overall score
    const scores = [
      evaluation.fluency_score,
      evaluation.professionalism_score,
      evaluation.communication_score,
      evaluation.technical_depth_score
    ];
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Update interview with evaluation
    await interview.update({
      ai_evaluation: evaluation,
      overall_score: overallScore,
      meeting_minutes: evaluation.meeting_minutes
    });

    res.json({
      success: true,
      data: {
        evaluation,
        overallScore,
        meetingMinutes: evaluation.meeting_minutes
      }
    });
  } catch (error) {
    console.error('Evaluate interview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;