const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { sendSuccess } = require('../utils/response');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT department_id, department_code, department_name FROM departments ORDER BY department_name');
    return sendSuccess(res, 'Success', rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
