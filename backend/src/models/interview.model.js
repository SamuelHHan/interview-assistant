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
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Tencent meeting URL'
  },
  meeting_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Tencent meeting ID'
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
  transcript: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Interview transcript'
  }
}, {
  tableName: 'interviews',
  timestamps: true
});

module.exports = Interview;