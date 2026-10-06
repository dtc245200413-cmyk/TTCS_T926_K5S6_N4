const xlsx = require('xlsx');

// Tạo dữ liệu giả lập bao phủ mọi trường hợp test (Đúng, Sai, Thiếu, Trùng)
const data = [
  ['Mã Nhân Viên (*)', 'Họ Tên (*)', 'Email Công Ty (*)', 'Mật Khẩu (*)', 'Số Điện Thoại', 'Chức Danh', 'Phòng Ban'],
  // 1. Trường hợp ĐÚNG HOÀN TOÀN (Sẽ báo Hợp lệ và được nhập)
  ['TEST001', 'Nguyễn Văn Hoàn Hảo', 'test001@ictu.edu.vn', '123456', '0123456789', 'Nhân viên (Staff)', 'IT'],
  
  // 2. Trường hợp ĐÚNG HOÀN TOÀN (Sẽ báo Hợp lệ và được nhập)
  ['TEST002', 'Trần Thị Xuất Sắc', 'test002@ictu.edu.vn', '123456', '', '', 'Marketing'],
  
  // 3. SAI LỖI: Bỏ trống trường bắt buộc
  ['', 'Lê Bỏ Trống Mã', 'botrong@ictu.edu.vn', '123456', '', '', ''],
  ['TEST004', '', 'thieuten@ictu.edu.vn', '123456', '', '', ''],
  
  // 4. SAI LỖI: Email không hợp lệ
  ['TEST005', 'Sai Định Dạng Email', 'abcxyz.com', '123456', '', '', ''],
  
  // 5. SAI LỖI: Mật khẩu quá ngắn (dưới 6 ký tự)
  ['TEST006', 'Mật Khẩu Ngắn', 'mkngan@ictu.edu.vn', '123', '', '', ''],
  
  // 6. SAI LỖI: Trùng lặp với dữ liệu đã có trong hệ thống (EMP001)
  ['EMP001', 'Trùng Mã NV Hệ Thống', 'trungma@ictu.edu.vn', '123456', '', '', ''],
  
  // 7. SAI LỖI: Phòng ban không tồn tại
  ['TEST008', 'Phòng Ban Ảo', 'phongao@ictu.edu.vn', '123456', '', 'Nhân viên (Staff)', 'Hội Pháp Sư']
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(data);

// Chỉnh độ rộng cột cho đẹp
ws['!cols'] = [{wch: 15}, {wch: 25}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 25}, {wch: 15}];

xlsx.utils.book_append_sheet(wb, ws, 'DuLieuTest');
xlsx.writeFile(wb, 'Test_Import_KiemTraLoi.xlsx');

console.log("Đã tạo file test thành công!");
