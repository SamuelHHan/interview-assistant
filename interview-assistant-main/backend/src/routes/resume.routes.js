const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const { Resume, JobDescription } = require('../models');
const qwenService = require('../services/qwen.service');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/resumes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @route POST /api/resume/upload
 * @desc Upload and parse a resume PDF
 */
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Create resume record
    const resume = await Resume.create({
      file_name: req.file.originalname,
      file_path: req.file.path,
      status: 'pending'
    });

    // Parse PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    const resumeText = pdfData.text;

    // Update with parsed content
    await resume.update({ parsed_content: resumeText, status: 'parsed' });

    // Use AI to extract structured information
    const parsedInfo = await qwenService.parseResume(resumeText);

    // Update with extracted information
    await resume.update({
      candidate_name: parsedInfo.name,
      candidate_email: parsedInfo.email,
      candidate_phone: parsedInfo.phone,
      skills: parsedInfo.skills,
      experience: parsedInfo.experience,
      education: parsedInfo.education,
      status: 'analyzed'
    });

    res.json({
      success: true,
      data: {
        id: resume.id,
        fileName: resume.file_name,
        candidateName: parsedInfo.name,
        candidateEmail: parsedInfo.email,
        candidatePhone: parsedInfo.phone,
        skills: parsedInfo.skills,
        experience: parsedInfo.experience,
        education: parsedInfo.education,
        summary: parsedInfo.summary,
        status: 'analyzed'
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/resume/list
 * @desc Get all resumes
 */
router.get('/list', async (req, res) => {
  try {
    const resumes = await Resume.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/resume/:id
 * @desc Get resume by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const resume = await Resume.findByPk(req.params.id);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    res.json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/resume/jd
 * @desc Create a job description
 */
router.post('/jd', async (req, res) => {
  try {
    const { title, company, department, description, requirements, required_skills, experience_years, salary_range, location } = req.body;

    const jd = await JobDescription.create({
      title,
      company,
      department,
      description,
      requirements,
      required_skills,
      experience_years,
      salary_range,
      location
    });

    res.json({
      success: true,
      data: jd
    });
  } catch (error) {
    console.error('Create JD error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/resume/jd/list
 * @desc Get all job descriptions
 */
router.get('/jd/list', async (req, res) => {
  try {
    const jds = await JobDescription.findAll({
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: jds
    });
  } catch (error) {
    console.error('Get JDs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/resume/jd/:id
 * @desc Get job description by ID
 */
router.get('/jd/:id', async (req, res) => {
  try {
    const jd = await JobDescription.findByPk(req.params.id);

    if (!jd) {
      return res.status(404).json({ success: false, message: 'Job description not found' });
    }

    res.json({
      success: true,
      data: jd
    });
  } catch (error) {
    console.error('Get JD error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;