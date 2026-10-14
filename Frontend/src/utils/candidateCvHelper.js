function removeVietnameseTones(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function getCandidateCvData(candidate = {}) {
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
