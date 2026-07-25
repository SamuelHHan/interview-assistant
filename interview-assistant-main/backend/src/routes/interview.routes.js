const express = require('express');
const { Interview, Resume, JobDescription, Report } = require('../models');
const qwenService = require('../services/qwen.service');
const meetingService = require('../services/meeting.service');

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
 * @desc Schedule interview and create meeting
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

    // Create meeting (use mock if API not available)
    let meetingInfo;
    try {
      meetingInfo = await meetingService.createMeeting({
        subject: `面试 - ${interview.jobDescription.title}`,
        startTime: scheduledTime,
        duration: duration || 20,
        hostUserId: 'ai_interviewer',
        nickName: 'AI面试官'
      });
    } catch (meetingError) {
      console.log('Using mock meeting:', meetingError.message);
      meetingInfo = meetingService.generateMockMeeting();
    }

    // Update interview with meeting info
    await interview.update({
      scheduled_time: scheduledTime,
      duration: duration || 20,
      meeting_url: meetingInfo.meetingUrl,
      meeting_id: meetingInfo.meetingId,
      status: 'email_sent'
    });

    res.json({
      success: true,
      data: {
        interviewId: interview.id,
        meetingUrl: meetingInfo.meetingUrl,
        meetingId: meetingInfo.meetingId,
        scheduledTime: scheduledTime
      }
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
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
 * @route POST /api/interview/:id/start
 * @desc Start the interview
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
 * @desc End the interview
 */
router.post('/:id/end', async (req, res) => {
  try {
    const { transcript, recordingUrl } = req.body;

    const interview = await Interview.findByPk(req.params.id);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    await interview.update({
      status: 'completed',
      transcript: transcript,
      recording_url: recordingUrl
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

module.exports = router;