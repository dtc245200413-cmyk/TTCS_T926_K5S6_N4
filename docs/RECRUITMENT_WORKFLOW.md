# Quy trình yêu cầu tuyển dụng và đăng tin

## Mục tiêu

Tách biệt việc đề xuất nhu cầu nhân sự với việc công khai tin tuyển dụng, giúp tránh đăng tin từ yêu cầu chưa được phê duyệt.

## Các bước nghiệp vụ

1. **Tạo yêu cầu:** người dùng có quyền nhập vị trí, mô tả công việc, yêu cầu ứng viên, địa điểm, loại hình làm việc, mức lương và ngày cần nhân sự.
2. **Phê duyệt yêu cầu:** người có thẩm quyền xem xét và cập nhật trạng thái yêu cầu.
3. **Tạo bản nháp:** chỉ yêu cầu đã được duyệt mới được dùng để tạo tin. Thông tin từ yêu cầu được dùng làm giá trị mặc định để hạn chế nhập lại.
4. **Kiểm tra hợp lệ:** backend kiểm tra mã yêu cầu, tin đang hoạt động trùng lặp và hạn tuyển dụng.
5. **Duyệt tin:** người phụ trách xem trước nội dung và phê duyệt hoặc từ chối.
6. **Xuất bản:** tin đã qua bước kiểm tra trạng thái mới được xuất bản trên cổng việc làm.
7. **Theo dõi:** các thao tác quan trọng được ghi nhật ký để hỗ trợ kiểm tra và xử lý sự cố.

## Điểm cần kiểm thử

- Không cho tạo tin khi thiếu mã yêu cầu hoặc yêu cầu chưa được duyệt.
- Không tạo nhiều tin đang xử lý/đã duyệt/đang tuyển cho cùng một yêu cầu.
- Từ chối hạn tuyển dụng không hợp lệ hoặc đã qua.
- Không cho xuất bản tin chưa đạt trạng thái cần thiết.
- Kiểm tra quyền truy cập các endpoint theo vai trò.

## Cấu hình API

Frontend đọc biến `VITE_API_URL` trong `Frontend/.env`. Giá trị mẫu nằm trong `Frontend/.env.example`; các modal của phân hệ yêu cầu tuyển dụng ghép đường dẫn endpoint từ cấu hình này thay vì cố định host trong mã nguồn.
