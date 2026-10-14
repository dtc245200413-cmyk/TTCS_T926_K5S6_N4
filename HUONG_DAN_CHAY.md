# Chạy dự án trên Windows

1. Cài Node.js và MySQL Server 8.0. Bật dịch vụ MySQL. Dự án dùng MySQL, không dùng SQL Server/SSMS.
2. Mở database.sql bằng MySQL Workbench và chạy script trên database thử mới.
   CHÚ Ý: script có DROP DATABASE, sẽ xoá internal_recruitment_system nếu đã tồn tại. Sao lưu trước nếu có dữ liệu cần giữ.
3. Mở terminal trong Backend. Nếu chưa có .env, chạy `Copy-Item .env.example .env`.
   Sửa DB_HOST, DB_PORT, DB_USER, DB_PASSWORD cho đúng MySQL trên máy.
   DB_NAME=internal_recruitment_system. Đặt JWT_SECRET là chuỗi ngẫu nhiên dài.
   Chạy `npm ci` rồi `npm start`. API: http://localhost:5000/.
4. Mở terminal thứ hai trong Frontend. Nếu chưa có .env, chạy `Copy-Item .env.example .env`.
   Chạy `npm ci` rồi `npm run dev`. Mở http://localhost:5173/.
5. Giữ cả hai terminal chạy. Backend chỉ khởi động khi kết nối MySQL và migration thành công.

## Đã sửa
- Mock thiếu trong test người dùng; thêm test số điện thoại trùng.
- className và backgroundColor trùng, giữ giá trị đang có hiệu lực.
- Phần email trong Backend/.env.example chứa byte NULL, chuyển về UTF-8 sạch.
- Lỗi MySQL hiển thị mã lỗi và hướng dẫn xử lý thay vì thông báo trống.
- Bắt lỗi migration khi khởi động và đóng pool khi thất bại.

## Kiểm tra
Backend: `npm test -- --runInBand`.
Frontend: `npm run build`.
Build/test không thay thế kiểm tra nghiệp vụ với MySQL thật.
ZIP không kèm node_modules, .env chứa thông tin riêng hay .git. Chạy npm ci để cài dependency.
