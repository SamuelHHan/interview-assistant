const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  resume_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'resumes',
      key: 'id'
    }
  },
  jd_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'job_descriptions',
      key: 'id'
    }
  },
  interview_questions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Generated interview questions'
  },
  confirmed_questions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'HR confirmed questions'
  },
  scheduled_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Scheduled interview time'
  },
  duration: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    comment: 'Interview duration in minutes'
  },
  meeting_url: {
    type: DataTypes.STRING(2000),
    allowNull: true,
    comment: 'LiveKit meeting URL (includes JWT token)'
  },
  meeting_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'LiveKit room name'
  },
  meeting_token: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'LiveKit candidate token (valid for 7 days)'
  },
  meeting_token_expires: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the meeting token expires'
  },
  status: {
    type: DataTypes.ENUM('pending', 'questions_generated', 'confirmed', 'email_sent', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending',
    comment: 'Interview status'
  },
  recording_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Interview recording URL'
  },
  recording_egress_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'LiveKit egress ID for recording'
  },
  transcript: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Interview transcript'
  },
  meeting_minutes: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Meeting minutes from interview conversation'
  },
  ai_evaluation: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'AI evaluation: fluency, professionalism, etc.'
  },
  overall_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    comment: 'Overall interview score'
  },
  candidate_accepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether candidate accepted the interview invitation'
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When candidate accepted the invitation'
  },
  candidate_joined: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether candidate joined the meeting'
  },
  joined_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When candidate joined the meeting'
  },
  auto_email_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether invitation email was auto-sent'
  },
  ai_agent_joined: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether AI agent joined the meeting'
  },
  ai_agent_joined_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When AI agent joined the meeting'
  },
  interview_started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When interview started'
  },
  interview_ended_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When interview ended'
  }
}, {
  tableName: 'interviews',
  timestamps: true
});

module.exports = Interview;