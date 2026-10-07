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
const interviewQuestionRoutes = require('./routes/interviewQuestionRoutes');

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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Health Check ─────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Internal Recruitment System API is running.',
    version: 'Sprint 1 - Final'
  });
});

// ── API Routes ────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/competency-frameworks', competencyFrameworkRoutes);
app.use('/api/job-positions', jobPositionRoutes);
app.use('/api/interview-questions', interviewQuestionRoutes);

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