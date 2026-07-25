const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Resume = sequelize.define('Resume', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Original file name'
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'File storage path'
  },
  parsed_content: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Parsed resume content'
  },
  candidate_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Candidate name extracted from resume'
  },
  candidate_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Candidate email'
  },
  candidate_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Candidate phone number'
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Extracted skills'
  },
  experience: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Work experience'
  },
  education: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Education background'
  },
  status: {
    type: DataTypes.ENUM('pending', 'parsed', 'analyzed', 'interviewed', 'completed'),
    defaultValue: 'pending',
    comment: 'Resume processing status'
  }
}, {
  tableName: 'resumes',
  timestamps: true
});

module.exports = Resume;