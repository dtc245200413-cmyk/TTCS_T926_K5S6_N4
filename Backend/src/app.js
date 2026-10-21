/**
 * app.js
 * Creates and configures the Express application.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const statsRoutes = require('./routes/statsRoutes');
const competencyFrameworkRoutes = require('./routes/competencyFrameworkRoutes');
const jobPositionRoutes = require('./routes/jobPositionRoutes');
const jobPostingRoutes = require('./routes/jobPostingRoutes');
const publicJobRoutes = require('./routes/publicJobRoutes');
const slaRoutes = require('./routes/slaRoutes');
const candidatePortalRoutes = require('./routes/candidatePortalRoutes');
const interviewQuestionRoutes = require('./routes/interviewQuestionRoutes');
const questionRoutes = require('./routes/questionRoutes');
const competencyRoutes = require('./routes/competencyRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ── Global Middleware ────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition']
}));

// ── Health Check ─────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Internal Recruitment System API is running.',
    version: 'Sprint 1 - Final'
  });
});

const departmentRoutes = require('./routes/departmentRoutes');
const recruitmentRequestRoutes = require('./routes/recruitmentRequestRoutes');
const approvalWorkflowRoutes = require('./routes/approvalWorkflowRoutes');
const positionRoutes = require('./routes/positionRoutes');
// ── API Routes ────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/recruitment-requests', recruitmentRequestRoutes);
app.use('/api/approval-workflows', approvalWorkflowRoutes);
app.use('/api/job-positions', jobPositionRoutes);
app.use('/api/job-postings', jobPostingRoutes);
app.use('/api/public/jobs', publicJobRoutes);
app.use('/api/candidate-portal', candidatePortalRoutes);
app.use('/api/sla', slaRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/competencies', competencyRoutes);
app.use('/api/positions', positionRoutes);

const companyProfileRoutes = require('./routes/companyProfileRoutes');
app.use('/api/company-profile', companyProfileRoutes);
app.use('/uploads', express.static('uploads'));

const masterDataRoutes = require('./routes/masterDataRoutes');
app.use('/api/master-data', masterDataRoutes);

const candidateRoutes = require('./routes/candidateRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const interviewScheduleRoutes = require('./routes/interviewScheduleRoutes');
app.use('/api/candidates', candidateRoutes);

app.use('/api/competency-frameworks', competencyFrameworkRoutes);
app.use('/api/interview-questions', interviewQuestionRoutes);
app.use('/api/interview-schedules', interviewScheduleRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);
const offerRoutes = require('./routes/offerRoutes');
app.use('/api/offers', offerRoutes);

// ── 404 Handler ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ── Global Error Handler ─────────────────────────────────────

app.use(errorHandler);

module.exports = app;
