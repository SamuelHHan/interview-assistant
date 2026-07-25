const express = require('express');
const { Interview, Resume, JobDescription, Report } = require('../models');
const qwenService = require('../services/qwen.service');

const router = express.Router();

/**
 * @route POST /api/report/generate
 * @desc Generate interview report
 */
router.post('/generate', async (req, res) => {
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

    if (!interview.transcript) {
      return res.status(400).json({ success: false, message: 'Interview transcript not found' });
    }

    // Analyze interview using AI
    const resumeData = {
      name: interview.resume.candidate_name,
      skills: interview.resume.skills,
      experience: interview.resume.experience,
      education: interview.resume.education
    };

    const questions = interview.confirmed_questions || interview.interview_questions;

    const analysisResult = await qwenService.analyzeInterview(
      interview.transcript,
      questions,
      resumeData,
      interview.jobDescription.description
    );

    // Create report
    const report = await Report.create({
      interview_id: interviewId,
      overall_score: analysisResult.overall_score,
      technical_score: analysisResult.technical_score,
      communication_score: analysisResult.communication_score,
      problem_solving_score: analysisResult.problem_solving_score,
      cultural_fit_score: analysisResult.cultural_fit_score,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      question_analysis: analysisResult.question_analysis,
      recommendation: analysisResult.recommendation,
      recommendation_reason: analysisResult.recommendation_reason,
      summary: analysisResult.summary,
      detailed_report: JSON.stringify(analysisResult)
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/report/:interviewId
 * @desc Get report by interview ID
 */
router.get('/:interviewId', async (req, res) => {
  try {
    const report = await Report.findOne({
      where: { interview_id: req.params.interviewId },
      include: [
        {
          model: Interview,
          as: 'interview',
          include: [
            { model: Resume, as: 'resume' },
            { model: JobDescription, as: 'jobDescription' }
          ]
        }
      ]
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/report/list
 * @desc Get all reports
 */
router.get('/list', async (req, res) => {
  try {
    const reports = await Report.findAll({
      include: [
        {
          model: Interview,
          as: 'interview',
          include: [
            { model: Resume, as: 'resume' },
            { model: JobDescription, as: 'jobDescription' }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;