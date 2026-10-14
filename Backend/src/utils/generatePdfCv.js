const puppeteer = require('d:/ttcs/TTCS_T926_K5S6_N4/Frontend/node_modules/puppeteer');
const path = require('path');
const fs = require('fs');

function removeVietnameseTones(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function getCandidateCvData(candidate = {}) {
  const name = candidate.full_name || 'Nguyễn Văn Minh';
  const posName = candidate.position_name || candidate.position_title || 'Lập trình viên Backend';
  const posLower = posName.toLowerCase();
  const cleanAsciiName = removeVietnameseTones(name).replace(/[^a-zA-Z0-9]/g, '');

  let bio = 'Lập trình viên Backend với kinh nghiệm phát triển RESTful API, hệ thống quản lý và làm việc với cơ sở dữ liệu.';
  let educationSchool = 'Đại học Công nghệ Thông tin và Truyền thông';
  let educationMajor = 'Công nghệ thông tin • 2020–2024 (Ví dụ)';
  let skills = ['Java', 'Spring Boot', 'MySQL', 'REST API', 'Git', 'Docker'];
  let jobTitle = 'Backend Developer — Công ty ABC';
  let jobPeriod = '2024–2026';
  let jobDesc = 'Xây dựng API, thiết kế cơ sở dữ liệu và tối ưu hiệu năng hệ thống.';
  let projectDesc = 'Hệ thống quản lý tuyển dụng — phát triển chức năng đăng nhập, quản lý ứng viên và phân quyền.';
  let experience = '2 năm';

  if (posLower.includes('tuyển dụng') || posLower.includes('nhân sự') || posLower.includes('hr')) {
    bio = 'Chuyên viên Nhân sự & Tuyển dụng với kinh nghiệm thu hút nhân tài công nghệ, tối ưu quy trình phỏng vấn và quản lý ứng viên.';
    educationSchool = 'Đại học Kinh tế Quốc dân';
    educationMajor = 'Quản trị Nhân lực • 2020–2024';
    skills = ['Tuyển dụng IT', 'Headhunting', 'Phỏng vấn', 'Sàng lọc CV', 'Onboarding', 'HRIS'];
    jobTitle = 'HR Executive — Tập đoàn ABC';
    jobPeriod = '2024–2026';
    jobDesc = 'Lên kế hoạch tuyển dụng, tìm nguồn ứng viên và phối hợp phỏng vấn các phòng ban kỹ thuật.';
    projectDesc = 'Chương trình tuyển dụng Tech Fresh Graduate — tiếp cận hơn 500 hồ sơ và tuyển dụng thành công 30 kỹ sư.';
    experience = '3 năm';
  } else if (posLower.includes('tài chính') || posLower.includes('kế toán')) {
    bio = 'Chuyên viên Tài chính với kinh nghiệm thẩm định số liệu, lập mô hình dự báo tài chính và tối ưu ngân sách hoạt động.';
    educationSchool = 'Học viện Tài chính';
    educationMajor = 'Tài chính - Ngân hàng • 2020–2024';
    skills = ['Phân tích Tài chính', 'Báo cáo Thuế', 'Excel / Power BI', 'ERP', 'Kiểm toán', 'Dòng tiền'];
    jobTitle = 'Financial Analyst — Công ty ABC';
    jobPeriod = '2024–2026';
    jobDesc = 'Kiểm soát chi phí vận hành, xây dựng báo cáo phân tích hiệu quả kinh doanh định kỳ.';
    projectDesc = 'Chuẩn hóa hệ thống báo cáo quản trị — triển khai bảng điều khiển tài chính thời gian thực giúp ban giám đốc ra quyết định kịp thời.';
    experience = '2 năm';
  } else if (posLower.includes('vận hành') || posLower.includes('giám đốc')) {
    bio = 'Nhà quản lý vận hành giàu kinh nghiệm trong việc thiết lập chuẩn quy trình, nâng cao năng suất tổ chức và phát triển đội ngũ.';
    educationSchool = 'Đại học Ngoại Thương';
    educationMajor = 'Quản trị Kinh doanh Quốc tế • 2018–2022';
    skills = ['Quản lý Vận hành', 'OKRs / KPIs', 'Tối ưu Quy trình', 'Lãnh đạo', 'Quản trị Rủi ro', 'Scrum'];
    jobTitle = 'Operations Manager — Công ty ABC';
    jobPeriod = '2023–2026';
    jobDesc = 'Chỉ đạo toàn bộ quy trình vận hành và cải tiến chất lượng dịch vụ nội bộ.';
    projectDesc = 'Chuyển đổi số quy trình tuyển dụng và nhân sự — tự động hóa 80% quy trình phê duyệt yêu cầu tuyển dụng và tiếp nhận nhân sự mới.';
    experience = '4 năm';
  } else if (posLower.includes('senior')) {
    experience = '3 năm';
    bio = 'Lập trình viên Senior Backend với kinh nghiệm phát triển RESTful API, thiết kế vi dịch vụ (Microservices), tối ưu hóa cơ sở dữ liệu lớn và bảo mật hệ thống.';
    educationSchool = 'Đại học Bách Khoa Hà Nội';
    educationMajor = 'Công nghệ thông tin • 2019–2023 (Tốt nghiệp loại Giỏi)';
    skills = ['Java', 'Spring Boot', 'MySQL', 'REST API', 'Git', 'Docker', 'Redis', 'Kafka'];
    jobTitle = 'Senior Backend Developer — Công ty ABC';
    jobPeriod = '2023–2026';
    jobDesc = 'Xây dựng API, thiết kế cơ sở dữ liệu và tối ưu hiệu năng hệ thống quản lý quy mô lớn.';
    projectDesc = 'Hệ thống quản lý tuyển dụng — phát triển chức năng đăng nhập, quản lý ứng viên và phân quyền.';
  }

  return {
    fullName: name,
    appliedPosition: posName,
    email: candidate.email || 'minh.nguyen@example.com',
    phone: candidate.phone || '09xx xxx xxx',
    address: candidate.address || 'Hà Nội',
    experience,
    bio,
    educationSchool,
    educationMajor,
    skills,
    jobTitle,
    jobPeriod,
    jobDesc,
    projectDesc,
    attachmentFileName: `${cleanAsciiName || 'Candidate'}_CV.pdf`
  };
}

function getCvHtml(data) {
  const {
    fullName = 'Nguyễn Văn Minh',
    appliedPosition = 'Lập trình viên Backend',
    email = 'minh.nguyen@example.com',
    phone = '09xx xxx xxx',
    address = 'Hà Nội',
    experience = '2 năm',
    bio = 'Lập trình viên Backend với kinh nghiệm phát triển RESTful API, hệ thống quản lý và làm việc với cơ sở dữ liệu.',
    educationSchool = 'Đại học Công nghệ Thông tin và Truyền thông',
    educationMajor = 'Công nghệ thông tin • 2020–2024 (Ví dụ)',
    skills = ['Java', 'Spring Boot', 'MySQL', 'REST API', 'Git', 'Docker'],
    jobTitle = 'Backend Developer — Công ty ABC',
    jobPeriod = '2024–2026',
    jobDesc = 'Xây dựng API, thiết kế cơ sở dữ liệu và tối ưu hiệu năng hệ thống.',
    projectDesc = 'Hệ thống quản lý tuyển dụng — phát triển chức năng đăng nhập, quản lý ứng viên và phân quyền.',
    attachmentFileName = 'NguyenVanMinh_CV.pdf'
  } = data;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TECHCORP - HỒ SƠ ỨNG VIÊN - ${fullName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 16mm 18mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      line-height: 1.5;
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }

    .cv-container {
      max-width: 820px;
      margin: 0 auto;
      padding: 10px 0;
    }

    /* Header */
    .breadcrumb {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #4b5563;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .candidate-name {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .candidate-role {
      font-size: 15px;
      color: #4b5563;
    }

    .avatar-circle {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 1.5px solid #d1d5db;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9fafb;
      color: #374151;
      flex-shrink: 0;
    }

    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 16px 0 22px 0;
    }

    /* 4-Item Grid */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 40px;
      row-gap: 18px;
      margin-bottom: 24px;
    }

    .meta-item .meta-label {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 3px;
    }

    .meta-item .meta-value {
      font-size: 15px;
      font-weight: 500;
      color: #111827;
    }

    /* Section Styles */
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-top: 22px;
      margin-bottom: 10px;
    }

    .section-text {
      font-size: 14.5px;
      color: #374151;
      line-height: 1.6;
    }

    .school-name {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }

    .school-meta {
      font-size: 13.5px;
      color: #6b7280;
    }

    /* Skills Pill Tags */
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }

    .skill-pill {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 9999px;
      background-color: #f3f4f6;
      border: 1px solid #e5e7eb;
      color: #374151;
      font-size: 13.5px;
      font-weight: 500;
    }

    /* Experience */
    .job-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }

    .job-period {
      font-size: 13.5px;
      color: #6b7280;
      margin-bottom: 6px;
    }

    .job-desc {
      font-size: 14.5px;
      color: #374151;
      line-height: 1.5;
    }

    /* Attachment Card */
    .attachment-card {
      margin-top: 32px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .attachment-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .file-icon {
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .file-name {
      font-size: 14.5px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 2px;
    }

    .file-subtext {
      font-size: 12.5px;
      color: #6b7280;
    }

    .attachment-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .download-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #374151;
      background: #ffffff;
    }

    .pdf-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 6px;
      background-color: #f3f4f6;
      color: #4b5563;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
  </style>
</head>
<body>
  <div class="cv-container">
    <!-- Breadcrumb -->
    <div class="breadcrumb">TECHCORP / HỒ SƠ ỨNG VIÊN</div>

    <!-- Header -->
    <div class="header-row">
      <div>
        <h1 class="candidate-name">${fullName}</h1>
        <div class="candidate-role">Ứng tuyển: ${appliedPosition}</div>
      </div>
      <div class="avatar-circle">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
    </div>

    <div class="divider"></div>

    <!-- 4-Item Grid -->
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">Email</div>
        <div class="meta-value">${email}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Số điện thoại</div>
        <div class="meta-value">${phone}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Địa chỉ</div>
        <div class="meta-value">${address}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Kinh nghiệm</div>
        <div class="meta-value">${experience}</div>
      </div>
    </div>

    <!-- Giới thiệu bản thân -->
    <h3 class="section-title">Giới thiệu bản thân</h3>
    <p class="section-text">${bio}</p>

    <!-- Học vấn -->
    <h3 class="section-title">Học vấn</h3>
    <div class="school-name">${educationSchool}</div>
    <div class="school-meta">${educationMajor}</div>

    <!-- Kỹ năng chuyên môn -->
    <h3 class="section-title">Kỹ năng chuyên môn</h3>
    <div class="skills-list">
      ${skills.map(s => `<span class="skill-pill">${s}</span>`).join('\n      ')}
    </div>

    <!-- Kinh nghiệm làm việc -->
    <h3 class="section-title">Kinh nghiệm làm việc</h3>
    <div class="job-title">${jobTitle}</div>
    <div class="job-period">${jobPeriod}</div>
    <p class="job-desc">${jobDesc}</p>

    <!-- Dự án tiêu biểu -->
    <h3 class="section-title">Dự án tiêu biểu</h3>
    <p class="section-text">${projectDesc}</p>

    <!-- Attachment Card -->
    <div class="attachment-card">
      <div class="attachment-left">
        <div class="file-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
            <line x1="7" y1="8" x2="11" y2="8"></line>
            <line x1="7" y1="12" x2="17" y2="12"></line>
            <line x1="7" y1="16" x2="17" y2="16"></line>
          </svg>
        </div>
        <div>
          <div class="file-name">${attachmentFileName}</div>
          <div class="file-subtext">Tệp CV đính kèm (minh họa)</div>
        </div>
      </div>
      <div class="attachment-right">
        <div class="download-circle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </div>
        <span class="pdf-badge">PDF</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function renderHtmlToPdf(html, outputPath) {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '18mm',
        right: '18mm'
      }
    });
  } finally {
    await browser.close();
  }
}

module.exports = {
  getCandidateCvData,
  getCvHtml,
  renderHtmlToPdf
};
