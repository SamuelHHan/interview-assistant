const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const aiAgentService = require('./services/ai-agent.service');
const livekitService = require('./services/livekit.service');
const qwenService = require('./services/qwen.service');
const { Interview } = require('./models');

// Load environment variables
dotenv.config();

// Import routes
const resumeRoutes = require('./routes/resume.routes');
const interviewRoutes = require('./routes/interview.routes');
const emailRoutes = require('./routes/email.routes');
const reportRoutes = require('./routes/report.routes');

// Import database connection
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/resume', resumeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/report', reportRoutes);

// LiveKit webhook endpoint for recording completed events
// Note: this route uses raw body parser for webhook signature verification
app.post('/api/livekit/webhook', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body);
    console.log('LiveKit webhook received:', event.event);

    if (event.event === 'egress_ended' && event.egressInfo) {
      const roomName = event.egressInfo.roomName;
      const filePath = event.egressInfo.fileResults?.[0]?.filename;

      // Find interview by room name
      const interview = await Interview.findOne({ where: { meeting_id: roomName } });
      if (interview && filePath) {
        await interview.update({
          recording_url: filePath,
          status: 'completed'
        });
        console.log(`Recording saved for interview ${interview.id}: ${filePath}`);

        // Trigger AI evaluation if transcript exists
        if (interview.transcript) {
          try {
            const evaluation = await qwenService.evaluateInterview(
              interview.transcript,
              interview.confirmed_questions || interview.interview_questions,
              interview.jd_content || ''
            );

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
            console.log(`AI evaluation completed for interview ${interview.id}`);
          } catch (evalError) {
            console.error('AI evaluation failed:', evalError.message);
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Interview Assistant API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await aiAgentService.stopAllAgents();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await aiAgentService.stopAllAgents();
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
