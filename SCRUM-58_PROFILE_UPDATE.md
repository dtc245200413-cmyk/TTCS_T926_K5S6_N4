# SCRUM-58 — Cập nhật hồ sơ nhân sự nội bộ

## User Story
Là nhân sự nội bộ, tôi muốn xem và cập nhật hồ sơ cá nhân, để thông tin liên lạc của tôi luôn đúng để nhận được lời mời tham gia phỏng vấn.

## Acceptance Criteria
- Có thể cập nhật: họ tên, số điện thoại, chức danh hiển thị.
- Không thể cập nhật: email, phòng ban và vai trò.
- Số điện thoại phải đúng định dạng số di động Việt Nam: `0[35789]xxxxxxxx` hoặc `+84[35789]xxxxxxxx`.
- Backend kiểm tra lại các quy tắc trên, không chỉ dựa vào giao diện.
- API không chấp nhận các trường ngoài danh sách được phép cập nhật.
