/**
 * authRoutes.js
 * Authentication API routes.
 * UPDATED in Part 2: added forgot-password, reset-password, change-password.
 */

const express = require('express');
const router  = express.Router();

const authController   = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// ── PART 1 ──────────────────────────────────────────────────
// POST /api/auth/login       — Public
router.post('/login', authController.login);

// POST /api/auth/logout      — Protected
router.post('/logout', authenticate, authController.logout);

// GET  /api/auth/me          — Protected
router.get('/me', authenticate, authController.me);

// ── PART 2 ──────────────────────────────────────────────────
// POST /api/auth/forgot-password   — Public
// Generates a reset token (returned in response body in dev mode)
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password    — Public
// Consumes the reset token and sets a new password
router.post('/reset-password', authController.resetPassword);

// PUT  /api/auth/change-password   — Protected
// Logged-in user changes their own password
router.put('/change-password', authenticate, authController.changePassword);

module.exports = router;
