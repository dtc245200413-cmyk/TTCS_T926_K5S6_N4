async function create(data, connection) {
  await connection.execute(`
    INSERT INTO recruitment_request_approvals
      (requisition_id, approver_id, action, comments, is_override, override_reason, exceeded_headcount, exceeded_salary_budget)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [data.requisition_id, data.user_id, data.status, data.comments, data.is_override,
    data.override_reason, data.exceeded_headcount, data.exceeded_salary_budget]);
}

module.exports = { create };
