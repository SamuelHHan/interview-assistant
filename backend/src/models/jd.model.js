const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobDescription = sequelize.define('JobDescription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Job title'
  },
  company: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Company name'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Department'
  },
  description: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'Job description content'
  },
  requirements: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Job requirements'
  },
  required_skills: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Required skills'
  },
  experience_years: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Required experience years'
  },
  salary_range: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Salary range'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Job location'
  },
  status: {
    type: DataTypes.ENUM('active', 'closed', 'draft'),
    defaultValue: 'active',
    comment: 'JD status'
  }
}, {
  tableName: 'job_descriptions',
  timestamps: true
});

module.exports = JobDescription;