import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Resume APIs
export const resumeApi = {
  upload: (formData) => api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getList: () => api.get('/resume/list'),
  getById: (id) => api.get(`/resume/${id}`),
};

// Job Description APIs
export const jdApi = {
  create: (data) => api.post('/resume/jd', data),
  getList: () => api.get('/resume/jd/list'),
  getById: (id) => api.get(`/resume/jd/${id}`),
};

// Interview APIs
export const interviewApi = {
  create: (resumeId, jdId) => api.post('/interview/create', { resumeId, jdId }),
  generateQuestions: (id) => api.post(`/interview/${id}/generate-questions`),
  confirmQuestions: (id, questions) => api.post(`/interview/${id}/confirm-questions`, { questions }),
  schedule: (id, scheduledTime, duration) => api.post(`/interview/${id}/schedule`, { scheduledTime, duration }),
  getList: () => api.get('/interview/list'),
  getById: (id) => api.get(`/interview/${id}`),
  start: (id) => api.post(`/interview/${id}/start`),
  end: (id, transcript, recordingUrl) => api.post(`/interview/${id}/end`, { transcript, recordingUrl }),
};

// Email APIs
export const emailApi = {
  sendInvitation: (interviewId) => api.post('/email/send-invitation', { interviewId }),
  sendResult: (interviewId, reportUrl) => api.post('/email/send-result', { interviewId, reportUrl }),
  verify: () => api.post('/email/verify'),
};

// Meeting APIs
export const meetingApi = {
  create: (subject, startTime, duration) => api.post('/meeting/create', { subject, startTime, duration }),
  getById: (meetingId) => api.get(`/meeting/${meetingId}`),
  end: (meetingId) => api.post(`/meeting/${meetingId}/end`),
  getRecordings: (meetingId) => api.get(`/meeting/${meetingId}/recordings`),
};

// Report APIs
export const reportApi = {
  generate: (interviewId) => api.post('/report/generate', { interviewId }),
  getByInterviewId: (interviewId) => api.get(`/report/${interviewId}`),
  getList: () => api.get('/report/list'),
};

export default api;