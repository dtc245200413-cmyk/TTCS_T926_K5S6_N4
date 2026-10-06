const xlsx = require('xlsx');
const { pool } = require('../config/database');
const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

/**
 * Download Excel template
 */
async function generateTemplate() {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.aoa_to_sheet([
    ['Mã Nhân Viên (*)', 'Họ Tên (*)', 'Email Công Ty (*)', 'Mật Khẩu (*)', 'Số Điện Thoại', 'Chức Danh', 'Phòng Ban'],
    ['EMP010', 'Nguyễn Văn A', 'nguyenvana@ictu.edu.vn', '123456', '0987654321', 'Nhân viên (Staff)', 'Marketing'],
  ]);

  ws['!cols'] = [
    { wch: 18 }, // Mã Nhân Viên
    { wch: 25 }, // Họ Tên
    { wch: 30 }, // Email Công Ty
    { wch: 15 }, // Mật Khẩu
    { wch: 15 }, // Số Điện Thoại
    { wch: 25 }, // Chức Danh
    { wch: 20 }, // Phòng Ban
  ];

  xlsx.utils.book_append_sheet(wb, ws, 'Template');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Preview import from Excel buffer
 */
async function previewImport(buffer) {
  const wb = xlsx.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

  if (!data || data.length < 2) {
    throw new Error('Tệp không có dữ liệu hoặc sai định dạng.');
  }

  // Fetch existing users to validate unique constraints
  const [users] = await pool.query('SELECT employee_code, company_email FROM users');
  const existingCodes = new Set(users.map(u => u.employee_code.toLowerCase()));
  const existingEmails = new Set(users.map(u => u.company_email.toLowerCase()));

  // Fetch departments to map names to IDs
  const [departments] = await pool.query('SELECT department_id, department_name FROM departments');
  const departmentMap = {};
  departments.forEach(d => {
    departmentMap[d.department_name.toLowerCase()] = d.department_id;
  });

  const validJobTitles = [
    'Quản trị hệ thống', 'Trưởng phòng', 'Quản lý (Manager)', 
    'Chuyên viên Tuyển dụng', 'Trưởng nhóm (Leader)', 
    'Chuyên viên (Specialist)', 'Lập trình viên (Developer)', 
    'Nhân viên (Staff)', 'Thực tập sinh (Intern)'
  ];

  const results = [];
  const rows = data.slice(1); // skip header
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty rows
    if (!row || row.length === 0 || row.every(cell => !cell)) continue;

    const employee_code = (row[0] || '').toString().trim();
    const full_name = (row[1] || '').toString().trim();
    const company_email = (row[2] || '').toString().trim();
    const password = (row[3] || '').toString().trim();
    const phone_number = (row[4] || '').toString().trim();
    const job_title = (row[5] || '').toString().trim();
    const department_name = (row[6] || '').toString().trim();

    const errors = [];

    // Validations
    if (!employee_code) errors.push('Mã Nhân Viên là bắt buộc.');
    else if (existingCodes.has(employee_code.toLowerCase())) errors.push('Mã Nhân Viên đã tồn tại.');

    if (!full_name) errors.push('Họ Tên là bắt buộc.');

    if (!company_email) errors.push('Email là bắt buộc.');
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(company_email)) errors.push('Email không hợp lệ.');
      else if (existingEmails.has(company_email.toLowerCase())) errors.push('Email đã tồn tại.');
    }

    if (!password) errors.push('Mật khẩu là bắt buộc.');
    else if (password.length < 6) errors.push('Mật khẩu phải từ 6 ký tự.');

    let department_id = null;
    if (department_name) {
      department_id = departmentMap[department_name.toLowerCase()];
      if (!department_id) errors.push('Phòng ban không tồn tại trong hệ thống.');
    }

    if (job_title && !validJobTitles.includes(job_title)) {
      errors.push('Chức danh không hợp lệ.');
    }

    // Keep track of duplicates in the file itself
    if (employee_code) existingCodes.add(employee_code.toLowerCase());
    if (company_email) existingEmails.add(company_email.toLowerCase());

    results.push({
      row_index: i + 2, // Excel row number (1-based + 1 header)
      data: {
        employee_code,
        full_name,
        company_email,
        password,
        phone_number,
        job_title,
        department_name,
        department_id
      },
      errors
    });
  }

  return results;
}

/**
 * Confirm import
 */
async function confirmImport(validRows, performedByUserId, ipAddress) {
  let successCount = 0;
  let failedCount = 0;
  const errors = [];

  for (const row of validRows) {
    try {
      const {
        employee_code,
        full_name,
        company_email,
        password,
        phone_number,
        job_title,
        department_id
      } = row.data;

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      await userRepository.create({
        departmentId: department_id || null,
        employeeCode: employee_code,
        fullName: full_name,
        companyEmail: company_email,
        phoneNumber: phone_number || null,
        jobTitle: job_title || null,
        passwordHash
      });
      
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push(`Dòng ${row.row_index}: Lỗi hệ thống (${error.message})`);
    }
  }

  return { successCount, failedCount, errors };
}

module.exports = {
  generateTemplate,
  previewImport,
  confirmImport
};
