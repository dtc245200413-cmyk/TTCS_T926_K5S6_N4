/**
 * Định dạng tiền tệ VNĐ (ví dụ: 15.000.000 ₫)
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Định dạng số với dấu phân cách hàng nghìn (15.000.000)
 */
export const formatNumberWithDots = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const num = String(value).replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('vi-VN');
};

/**
 * Phân tích chuỗi số có dấu chấm/phẩy thành số nguyên
 */
export const parseRawNumber = (str) => {
  if (!str) return 0;
  const cleaned = String(str).replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

/**
 * Danh sách cấp bậc chức danh chuẩn
 */
export const POSITION_LEVELS = [
  { value: 'Intern', label: 'Thực tập sinh (Intern)', color: 'gray' },
  { value: 'Fresher', label: 'Mới tốt nghiệp (Fresher)', color: 'blue' },
  { value: 'Junior', label: 'Nhân viên (Junior)', color: 'cyan' },
  { value: 'Middle', label: 'Chuyên viên (Middle)', color: 'emerald' },
  { value: 'Senior', label: 'Chuyên viên cấp cao (Senior)', color: 'purple' },
  { value: 'Lead', label: 'Trưởng nhóm (Lead)', color: 'orange' },
  { value: 'Manager', label: 'Trưởng phòng (Manager)', color: 'red' },
  { value: 'Director', label: 'Giám đốc khối (Director)', color: 'amber' },
];

/**
 * Lấy nhãn hiển thị cho cấp bậc
 */
export const getLevelBadge = (levelValue) => {
  const found = POSITION_LEVELS.find((l) => l.value === levelValue);
  return found || { value: levelValue, label: levelValue, color: 'blue' };
};
