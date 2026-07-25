const express = require('express');
const meetingService = require('../services/meeting.service');

const router = express.Router();

/**
 * @route POST /api/meeting/create
 * @desc Create a new meeting
 */
router.post('/create', async (req, res) => {
  try {
    const { subject, startTime, duration } = req.body;

    let meetingInfo;
    try {
      meetingInfo = await meetingService.createMeeting({
        subject,
        startTime,
        duration: duration || 20,
        hostUserId: 'ai_interviewer',
        nickName: 'AI面试官'
      });
    } catch (error) {
      console.log('Using mock meeting:', error.message);
      meetingInfo = meetingService.generateMockMeeting();
    }

    res.json({
      success: true,
      data: meetingInfo
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/meeting/:meetingId
 * @desc Get meeting info
 */
router.get('/:meetingId', async (req, res) => {
  try {
    const meetingInfo = await meetingService.getMeetingInfo(
      req.params.meetingId,
      'ai_interviewer'
    );

    res.json({
      success: true,
      data: meetingInfo
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/meeting/:meetingId/end
 * @desc End a meeting
 */
router.post('/:meetingId/end', async (req, res) => {
  try {
    const result = await meetingService.endMeeting(
      req.params.meetingId,
      'ai_interviewer'
    );

    res.json({
      success: result,
      message: result ? 'Meeting ended successfully' : 'Failed to end meeting'
    });
  } catch (error) {
    console.error('End meeting error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route GET /api/meeting/:meetingId/recordings
 * @desc Get meeting recordings
 */
router.get('/:meetingId/recordings', async (req, res) => {
  try {
    const recordings = await meetingService.getMeetingRecordings(
      req.params.meetingId,
      'ai_interviewer'
    );

    res.json({
      success: true,
      data: recordings
    });
  } catch (error) {
    console.error('Get recordings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;