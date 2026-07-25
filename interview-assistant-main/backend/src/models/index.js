const Resume = require('./resume.model');
const JobDescription = require('./jd.model');
const Interview = require('./interview.model');
const Report = require('./report.model');
const { sequelize } = require('../config/database');

// Define associations
// Resume - Interview (One-to-Many)
Resume.hasMany(Interview, { foreignKey: 'resume_id', as: 'interviews' });
Interview.belongsTo(Resume, { foreignKey: 'resume_id', as: 'resume' });

// JobDescription - Interview (One-to-Many)
JobDescription.hasMany(Interview, { foreignKey: 'jd_id', as: 'interviews' });
Interview.belongsTo(JobDescription, { foreignKey: 'jd_id', as: 'jobDescription' });

// Interview - Report (One-to-One)
Interview.hasOne(Report, { foreignKey: 'interview_id', as: 'report' });
Report.belongsTo(Interview, { foreignKey: 'interview_id', as: 'interview' });

module.exports = {
  sequelize,
  Resume,
  JobDescription,
  Interview,
  Report
};