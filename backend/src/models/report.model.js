const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Report = sequelize.define('Report', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  interview_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'interviews',
      key: 'id'
    }
  },
  overall_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    comment: 'Overall interview score (0-10)'
  },
  technical_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    comment: 'Technical skills score'
  },
  communication_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    comment: 'Communication skills score'
  },
  problem_solving_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    comment: 'Problem solving score'
  },
  cultural_fit_score: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    comment: 'Cultural fit score'
  },
  strengths: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Candidate strengths'
  },
  weaknesses: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Candidate weaknesses'
  },
  question_analysis: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Analysis for each question'
  },
  recommendation: {
    type: DataTypes.ENUM('highly_recommend', 'recommend', 'neutral', 'not_recommend', 'strongly_not_recommend'),
    allowNull: true,
    comment: 'Hiring recommendation'
  },
  recommendation_reason: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Reason for recommendation'
  },
  summary: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Interview summary'
  },
  detailed_report: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Detailed analysis report'
  }
}, {
  tableName: 'reports',
  timestamps: true
});

module.exports = Report;