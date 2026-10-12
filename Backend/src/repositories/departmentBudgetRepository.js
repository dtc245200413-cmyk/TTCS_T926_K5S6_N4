const { pool } = require('../config/database');

async function getAll(year) {
  const [rows] = await pool.execute(`
    SELECT b.*, d.department_name FROM department_budgets b
    JOIN departments d ON d.department_id = b.department_id
    WHERE b.budget_year = ? ORDER BY d.department_name`, [year]);
  return rows;
}

async function findByDepartmentYear(departmentId, year, connection = pool, lock = false) {
  const [rows] = await connection.execute(`
    SELECT * FROM department_budgets WHERE department_id = ? AND budget_year = ?${lock ? ' FOR UPDATE' : ''}`,
  [departmentId, year]);
  return rows[0] || null;
}

async function getUsage(departmentId, year, connection = pool) {
  // Legacy approvals are counted without rewriting their data. Invalid legacy
  // records block availability instead of silently undercounting commitments.
  const [invalid] = await connection.execute(`
    SELECT requisition_id FROM job_requisitions WHERE department_id = ? AND status = 'APPROVED'
    AND (date_needed IS NULL OR YEAR(date_needed) < 1000
      OR headcount IS NULL OR headcount <= 0
      OR proposed_max_salary IS NULL OR proposed_max_salary < 0
      OR (budget_year IS NOT NULL AND budget_year <> YEAR(date_needed))
      OR (estimated_salary_cost IS NOT NULL AND estimated_salary_cost <> headcount * proposed_max_salary * 12))
    LIMIT 1`, [departmentId]);
  if (invalid.length) return { invalid_requisition_id: invalid[0].requisition_id };
  const [rows] = await connection.execute(`
    SELECT COALESCE(SUM(headcount), 0) AS used_headcount,
      COALESCE(SUM(COALESCE(estimated_salary_cost, headcount * proposed_max_salary * 12)), 0) AS used_salary_budget
    FROM job_requisitions
    WHERE department_id = ? AND status = 'APPROVED'
      AND COALESCE(budget_year, YEAR(date_needed)) = ?`, [departmentId, year]);
  return rows[0];
}

async function upsert(departmentId, year, data, userId, connection) {
  await connection.execute(`
    INSERT INTO department_budgets
      (department_id, budget_year, total_headcount, total_salary_budget, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE total_headcount = VALUES(total_headcount),
      total_salary_budget = VALUES(total_salary_budget), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`,
  [departmentId, year, data.total_headcount, data.total_salary_budget, userId, userId]);
}

module.exports = { getAll, findByDepartmentYear, getUsage, upsert };
