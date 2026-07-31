const express = require('express');
const { Interview, Resume, JobDescription } = require('../models');
const emailService = require('../services/email.service');

const router = express.Router();

/**
 * @route POST /api/email/send-invitation
 * @desc Send interview invitation email
 */
router.post('/send-invitation', async (req, res) => {
  try {
    const { interviewId } = req.body;

    const interview = await Interview.findByPk(interviewId, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    if (!interview.resume.candidate_email) {
      return res.status(400).json({ success: false, message: 'Candidate email not found' });
    }

    // Format interview time
    const interviewTime = new Date(interview.scheduled_time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send invitation email
    const result = await emailService.sendInterviewInvitation({
      to: interview.resume.candidate_email,
      candidateName: interview.resume.candidate_name,
      position: interview.jobDescription.title,
      companyName: interview.jobDescription.company,
      interviewTime: interviewTime,
      duration: interview.duration,
      meetingUrl: interview.meeting_url,
      meetingId: interview.meeting_id,
      interviewId: interview.id,
      frontendUrl: process.env.FRONTEND_URL,
      tokenExpires: interview.meeting_token_expires
    });

    // Update interview status to email_sent
    await interview.update({
      status: 'email_sent',
      auto_email_sent: true
    });

    res.json({
      success: true,
      message: 'Interview invitation sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send invitation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/email/send-result
 * @desc Send interview result notification
 */
router.post('/send-result', async (req, res) => {
  try {
    const { interviewId, reportUrl } = req.body;

    const interview = await Interview.findByPk(interviewId, {
      include: [
        { model: Resume, as: 'resume' },
        { model: JobDescription, as: 'jobDescription' },
        { model: Report, as: 'report' }
      ]
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    if (!interview.resume.candidate_email) {
      return res.status(400).json({ success: false, message: 'Candidate email not found' });
    }

    if (!interview.report) {
      return res.status(400).json({ success: false, message: 'Interview report not found' });
    }

    // Send result email
    const result = await emailService.sendInterviewResult({
      to: interview.resume.candidate_email,
      candidateName: interview.resume.candidate_name,
      position: interview.jobDescription.title,
      result: {
        overall_score: interview.report.overall_score,
        technical_score: interview.report.technical_score,
        communication_score: interview.report.communication_score,
        problem_solving_score: interview.report.problem_solving_score,
        cultural_fit_score: interview.report.cultural_fit_score,
        recommendation: interview.report.recommendation
      },
      reportUrl
    });

    res.json({
      success: true,
      message: 'Interview result sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send result error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/email/verify
 * @desc Verify email configuration
 */
router.post('/verify', async (req, res) => {
  try {
    const isValid = await emailService.verifyConnection();
    res.json({
      success: true,
      data: { isValid }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;