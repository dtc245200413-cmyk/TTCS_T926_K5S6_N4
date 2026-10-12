const { pool } = require('../config/database');
const budgetRepo = require('../repositories/departmentBudgetRepository');
const auditRepo = require('../repositories/auditRepository');

const {
  businessError,
  positiveInteger,
  validateYear,
  moneyToCents,
  formatMoney,
  requireHrPermission,
} = require('../utils/recruitmentBudget');

async function getAvailability(
  departmentId,
  year,
  connection = pool,
  lock = false
) {
  departmentId = positiveInteger(
    departmentId,
    'Phòng ban'
  );

  year = validateYear(year);

  const budget =
    await budgetRepo.findByDepartmentYear(
      departmentId,
      year,
      connection,
      lock
    );

  if (
    !budget ||
    budget.total_salary_budget === null
  ) {
    throw businessError(
      'Chưa thiết lập đầy đủ chỉ tiêu phòng ban cho năm này.',
      409,
      'BUDGET_NOT_CONFIGURED'
    );
  }

  const usage =
    await budgetRepo.getUsage(
      departmentId,
      year,
      connection
    );

  if (usage.invalid_requisition_id) {
    throw businessError(
      'Yêu cầu đã duyệt cũ thiếu hoặc lệch dữ liệu ngân sách. Cần kiểm tra dữ liệu trước khi tiếp tục.',
      409,
      'LEGACY_BUDGET_DATA_INVALID',
      {
        requisition_id:
          usage.invalid_requisition_id,
      }
    );
  }

  const total = moneyToCents(
    budget.total_salary_budget
  );

  const used = moneyToCents(
    usage.used_salary_budget
  );

  return {
    department_id: departmentId,
    budget_year: year,

    total_headcount: Number(
      budget.total_headcount
    ),

    used_headcount: Number(
      usage.used_headcount
    ),

    remaining_headcount:
      Number(budget.total_headcount) -
      Number(usage.used_headcount),

    total_salary_budget:
      formatMoney(total),

    used_salary_budget:
      formatMoney(used),

    remaining_salary_budget:
      formatMoney(total - used),
  };
}

/*
 * Danh sách chỉ tiêu theo năm.
 * Quan trọng:
 * Mỗi phòng ban phải kèm số đã sử dụng và số còn lại.
 */
async function getBudgets(year) {
  year = validateYear(year);

  const budgets =
    await budgetRepo.getAll(year);

  const result = await Promise.all(
    budgets.map(async (budget) => {
      const availability =
        await getAvailability(
          budget.department_id,
          year
        );

      return {
        ...budget,
        ...availability,

        // Giữ tên phòng ban từ query danh sách
        department_name:
          budget.department_name,

        department_code:
          budget.department_code,
      };
    })
  );

  return result;
}

async function saveBudget(
  departmentId,
  year,
  data,
  user,
  ipAddress
) {
  requireHrPermission(
    user,
    'DEPARTMENT_BUDGET_MANAGE'
  );

  departmentId = positiveInteger(
    departmentId,
    'Phòng ban'
  );

  year = validateYear(year);

  const values = {
    total_headcount: positiveInteger(
      data.total_headcount,
      'Chỉ tiêu nhân sự',
      true
    ),

    total_salary_budget: formatMoney(
      moneyToCents(
        data.total_salary_budget
      )
    ),
  };

  const connection =
    await pool.getConnection();

  try {
    await connection.query(
      'SET TRANSACTION ISOLATION LEVEL READ COMMITTED'
    );

    await connection.beginTransaction();

    const [departments] =
      await connection.execute(
        `
        SELECT department_id
        FROM departments
        WHERE department_id = ?
        `,
        [departmentId]
      );

    if (!departments.length) {
      throw businessError(
        'Phòng ban không tồn tại.',
        404,
        'DEPARTMENT_NOT_FOUND'
      );
    }

    const before =
      await budgetRepo.findByDepartmentYear(
        departmentId,
        year,
        connection,
        true
      );

    await budgetRepo.upsert(
      departmentId,
      year,
      values,
      user.user_id,
      connection
    );

    const availability =
      await getAvailability(
        departmentId,
        year,
        connection,
        true
      );

    if (
      availability.remaining_headcount < 0 ||
      availability.remaining_salary_budget.startsWith(
        '-'
      )
    ) {
      throw businessError(
        'Chỉ tiêu không được thấp hơn mức đã được phê duyệt.',
        409,
        'BUDGET_BELOW_COMMITMENTS'
      );
    }

    await auditRepo.createLog(
      {
        userId: user.user_id,
        performedBy: user.user_id,

        action:
          'DEPARTMENT_BUDGET_UPDATED',

        entityType:
          'department_budgets',

        entityId:
          `${departmentId}-${year}`,

        description:
          JSON.stringify({
            before,
            after: values,
          }),

        ipAddress,
      },
      connection
    );

    await connection.commit();

    return availability;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getBudgets,
  getAvailability,
  saveBudget,
};