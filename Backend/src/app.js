/**
 * app.js
 * Creates and configures the Express application.
 * UPDATED in Part 2: added /api/users routes.
 */

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const authRoutes     = require('./routes/authRoutes');
const userRoutes     = require('./routes/userRoutes');      // NEW in Part 2
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ── Global Middleware ────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin:         '*',  // In production: change to your frontend URL
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Health Check ─────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Internal Recruitment System API is running.',
    version: 'Sprint 1 - Part 2',
  });
});

// ── API Routes ────────────────────────────────────────────────

app.use('/api/auth',  authRoutes);   // Authentication endpoints
app.use('/api/users', userRoutes);   // User management endpoints (NEW)

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
