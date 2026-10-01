/**
 * app.js
 * Creates and configures the Express application.
 */

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes     = require('./routes/authRoutes');
const userRoutes     = require('./routes/userRoutes');
const roleRoutes     = require('./routes/roleRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ── Global Middleware ────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SPRINT 1 FINAL: Configure CORS strictly for the frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Restrict to the React frontend running on Vite ports
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Health Check ─────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Internal Recruitment System API is running.',
    version: 'Sprint 1 - Final',
  });
});

const statsRoutes    = require('./routes/statsRoutes');

// ── API Routes ────────────────────────────────────────────────

app.use('/api/auth',  authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/stats', statsRoutes);

// ── 404 Handler ───────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global Error Handler (must be last) ──────────────────────

app.use(errorHandler);

module.exports = app;
