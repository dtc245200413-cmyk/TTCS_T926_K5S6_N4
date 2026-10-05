/**
 * competencyRepository.js
 * Quản lý truy vấn CSDL cho Khung năng lực và Tiêu chí đánh giá
 */
const { pool } = require('../config/database');

const competencyRepository = {
  // Lấy tất cả khung năng lực
  async findAll() {
    const [rows] = await pool.query(
      `SELECT f.*, 
              f.framework_id AS id, 
              f.framework_name AS title, 
              f.job_title AS position, 
              COUNT(c.criterion_id) AS total_criteria,
              COUNT(c.criterion_id) AS criteria_count
       FROM competency_frameworks f
       LEFT JOIN competency_criteria c ON f.framework_id = c.framework_id
       GROUP BY f.framework_id
       ORDER BY f.created_at DESC`
    );
    return rows;
  },

  // Lấy chi tiết 1 khung năng lực kèm danh sách tiêu chí
  async findById(frameworkId) {
    const [frameworks] = await pool.query(
      'SELECT * FROM competency_frameworks WHERE framework_id = ?',
      [frameworkId]
    );
    if (frameworks.length === 0) return null;

    const [criteria] = await pool.query(
      'SELECT * FROM competency_criteria WHERE framework_id = ? ORDER BY criterion_id ASC',
      [frameworkId]
    );

    const f = frameworks[0];
    return {
      ...f,
      id: f.framework_id,
      title: f.framework_name,
      position: f.job_title,
      total_criteria: criteria.length,
      criteria_count: criteria.length,
      criteria,
    };
  },

  // Tạo mới khung năng lực kèm các tiêu chí (sử dụng Transaction)
  async create({ job_title, framework_name, position, title, description, criteria }) {
    const finalJobTitle = (job_title || position || '').trim();
    const finalFrameworkName = (framework_name || title || '').trim();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Thêm khung năng lực
      const [fResult] = await conn.query(
        `INSERT INTO competency_frameworks (job_title, framework_name, description)
         VALUES (?, ?, ?)`,
        [finalJobTitle, finalFrameworkName, description || null]
      );
      const frameworkId = fResult.insertId;

      // 2. Thêm danh sách tiêu chí
      if (criteria && criteria.length > 0) {
        for (const item of criteria) {
          await conn.query(
            `INSERT INTO competency_criteria (framework_id, criterion_name, weight, description)
             VALUES (?, ?, ?, ?)`,
            [frameworkId, item.criterion_name, item.weight, item.description || null]
          );
        }
      }

      await conn.commit();
      return frameworkId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Cập nhật khung năng lực và tiêu chí
  async update(frameworkId, { job_title, framework_name, position, title, description, criteria }) {
    const finalJobTitle = (job_title || position || '').trim();
    const finalFrameworkName = (framework_name || title || '').trim();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Cập nhật bảng khung năng lực
      await conn.query(
        `UPDATE competency_frameworks
         SET job_title = ?, framework_name = ?, description = ?
         WHERE framework_id = ?`,
        [finalJobTitle, finalFrameworkName, description || null, frameworkId]
      );

      // 2. Xóa tiêu chí cũ và thêm lại danh sách mới
      await conn.query('DELETE FROM competency_criteria WHERE framework_id = ?', [frameworkId]);

      if (criteria && criteria.length > 0) {
        for (const item of criteria) {
          await conn.query(
            `INSERT INTO competency_criteria (framework_id, criterion_name, weight, description)
             VALUES (?, ?, ?, ?)`,
            [frameworkId, item.criterion_name, item.weight, item.description || null]
          );
        }
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // Xóa khung năng lực (tiêu chí tự động bị xóa theo CASCADE)
  async delete(frameworkId) {
    const [result] = await pool.query(
      'DELETE FROM competency_frameworks WHERE framework_id = ?',
      [frameworkId]
    );
    return result.affectedRows > 0;
  }
};

module.exports = competencyRepository;