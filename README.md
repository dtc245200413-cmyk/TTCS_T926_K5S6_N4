 HỆ THỐNG TUYỂN DỤNG NỘI BỘ

 Internal Recruitment Management System

Repository: `TTCS_T926_K5S6_N4
Nhóm thực hiện: Nhóm 4  
Loại dự án: Dự án thực tập  
Thời gian: 8 tuần - 8 Sprint  
Thành viên: 9 
Trạng thái: Đang phát triển  


 1. Giới thiệu

Hệ thống tuyển dụng nội bộ là ứng dụng web theo mô hình **Applicant Tracking System (ATS)**, hỗ trợ doanh nghiệp quản lý tập trung toàn bộ quy trình tuyển dụng.

Hệ thống được xây dựng nhằm thay thế cách quản lý phân tán bằng Excel, Gmail và Google Drive, giúp thông tin tuyển dụng, hồ sơ ứng viên, lịch phỏng vấn và kết quả đánh giá được quản lý trên một nền tảng thống nhất.

Quy trình chính:

text
Yêu cầu tuyển dụng
        ↓
     Phê duyệt
        ↓
    Đăng tuyển
        ↓
Ứng viên nộp hồ sơ
        ↓
   Sàng lọc CV
        ↓
    Phỏng vấn
        ↓
      Offer
        ↓
    Onboarding


 2. Mục tiêu dự án

- Quản lý tập trung toàn bộ quy trình tuyển dụng.
- Theo dõi trạng thái của từng vị trí và ứng viên.
- Lưu lại lịch sử phê duyệt yêu cầu tuyển dụng.
- Hỗ trợ sàng lọc và quản lý ứng viên bằng Pipeline Kanban.
- Chuẩn hóa quá trình phỏng vấn và đánh giá ứng viên.
- Quản lý Offer và quá trình tiếp nhận nhân viên mới.
- Tự động gửi email và thông báo trong các giai đoạn tuyển dụng.
- Cung cấp Dashboard và báo cáo phục vụ quản lý.


 3. Thông số Product Backlog

| Nội dung | Giá trị |
|---|---|
| Thời gian | 8 tuần |
| Sprint | 8 Sprint × 1 tuần |
| User Story | 76 |
| Epic | 9 |
| Tổng Story Point | 350 |
| Đội ngũ dự kiến | 5 thành viên Fullstack |
| Velocity mục tiêu | 42 - 45 point/Sprint |


 4. Vai trò người dùng

Hệ thống có 7 vai trò chính:

| Vai trò | Chức năng chính |
|---|---|
| Candidate | Nộp CV, tra cứu trạng thái, xác nhận phỏng vấn và phản hồi Offer |
| Recruiter | Sàng lọc CV, quản lý Pipeline, đặt lịch phỏng vấn, soạn Offer |
| Hiring Manager | Tạo yêu cầu tuyển dụng, theo dõi ứng viên và quyết định tuyển |
| Interviewer | Xem CV, tham gia phỏng vấn và nộp phiếu đánh giá |
| HR Manager | Quản lý hoạt động tuyển dụng, ngân sách và báo cáo |
| Approver | Phê duyệt yêu cầu tuyển dụng và Offer |
| Admin | Quản lý tài khoản, vai trò, danh mục và nhật ký hệ thống |

 Ứng viên bên ngoài không cần tài khoản nội bộ và có thể tra cứu hồ sơ bằng mã tra cứu.

 5. Các chức năng chính

Product Backlog được chia thành **9 Epic**:

 EP-01: Tài khoản, Phân quyền & Hồ sơ

- Đăng nhập, đăng xuất.
- Quên và đổi mật khẩu.
- Phân quyền theo vai trò.
- Quản lý tài khoản.
- Quản lý hồ sơ cá nhân.
- Khóa/mở khóa tài khoản.
- Import nhân sự từ Excel.

 EP-02: Danh mục Tổ chức & Vị trí

- Quản lý phòng ban.
- Quản lý chức danh.
- Quản lý dải lương.
- Quản lý khung năng lực.
- Ngân hàng câu hỏi phỏng vấn.
- Danh mục dùng chung.

 EP-03: Yêu cầu tuyển dụng & Phê duyệt

- Tạo yêu cầu tuyển dụng.
- Quản lý Headcount.
- Phê duyệt nhiều cấp.
- Theo dõi lịch sử phê duyệt.
- Quản lý ngân sách tuyển dụng.
- Phân công Recruiter.
- Tạm dừng, đóng hoặc hủy yêu cầu.

 EP-04: Đăng tin & Cổng ứng tuyển

- Soạn và xuất bản tin tuyển dụng.
- Trang tuyển dụng công khai.
- Tìm kiếm việc làm.
- Nộp CV trực tuyến.
- Tra cứu trạng thái hồ sơ.
- Rút hồ sơ.
- Giới thiệu ứng viên nội bộ.

 EP-05: Hồ sơ ứng viên & Pipeline

- Quản lý hồ sơ ứng viên.
- Phát hiện hồ sơ trùng.
- Pipeline tuyển dụng dạng Kanban.
- Chuyển ứng viên qua các giai đoạn.
- Gắn nhãn và ghi chú sàng lọc.
- Tìm kiếm và lọc ứng viên.
- Quản lý kho ứng viên tiềm năng.
- Theo dõi lịch sử tương tác.

Pipeline chính:

text
Hồ sơ mới
   ↓
Sàng lọc
   ↓
Phỏng vấn
   ↓
Đề xuất Offer
   ↓
Nhận việc

Hoặc → Loại


 EP-06: Phỏng vấn & Đánh giá

- Đặt lịch phỏng vấn.
- Kiểm tra trùng lịch.
- Gửi thư mời phỏng vấn.
- Quản lý bộ câu hỏi.
- Phiếu đánh giá theo khung năng lực.
- Tổng hợp và so sánh kết quả.
- Ra quyết định tuyển dụng.

 EP-07: Offer & Onboarding

- Tạo đề xuất Offer.
- Phê duyệt Offer theo hạn mức.
- Gửi thư mời nhận việc.
- Ghi nhận phản hồi của ứng viên.
- Xử lý từ chối hoặc thương lượng.
- Checklist Onboarding.

 EP-08: Thông báo & Email tự động

- Quản lý mẫu email.
- Email xác nhận nhận hồ sơ.
- Email mời phỏng vấn.
- Email từ chối.
- Email Offer.
- Nhật ký email.
- Thông báo trong ứng dụng.
- Nhắc công việc quá hạn.

 EP-09: Báo cáo & Dashboard

- Dashboard tuyển dụng.
- Phễu tuyển dụng.
- Tỷ lệ chuyển đổi.
- Time-to-hire.
- Cost-per-hire.
- Hiệu quả nguồn ứng viên.
- Báo cáo tiến độ tuyển dụng.


 6. Công nghệ dự kiến

| Thành phần | Công nghệ |
|---|---|
| Frontend | React + TypeScript |
| Backend | Spring Boot (Java) hoặc NestJS |
| Database | PostgreSQL |
| Authentication | JWT Access Token + Refresh Token |
| File Storage | Object Storage |
| Email | SMTP + Queue |
| Version Control | Git + GitHub |

 Backend sẽ được chốt theo công nghệ chính thức của nhóm.

 7. Yêu cầu phi chức năng

Hệ thống cần đảm bảo:

- Phân quyền và kiểm tra quyền tại Backend.
- Mật khẩu được mã hóa bằng bcrypt.
- Bảo vệ dữ liệu cá nhân của ứng viên.
- Ghi nhật ký các thao tác truy cập quan trọng.
- Giao diện responsive từ màn hình 360px.
- Hỗ trợ tiếng Việt.
- Cổng ứng tuyển chịu được khoảng 100 lượt nộp hồ sơ/giờ.
- Danh sách ứng viên phản hồi dưới 1,5 giây với dữ liệu kiểm thử.
- Sao lưu cơ sở dữ liệu và CV hằng ngày.


 8. Phạm vi dự án

 Trong phạm vi

- Tài khoản và phân quyền.
- Phòng ban, chức danh và khung năng lực.
- Yêu cầu tuyển dụng và phê duyệt.
- Đăng tin và cổng ứng tuyển.
- Hồ sơ ứng viên và Pipeline.
- Phỏng vấn và đánh giá.
- Offer và Onboarding.
- Email và thông báo.
- Dashboard và báo cáo.

 Ngoài phạm vi hiện tại

- AI so khớp CV với mô tả công việc.
- Tự động đăng tin lên VietnamWorks, TopCV, LinkedIn.
- Đồng bộ Google Calendar hoặc Outlook.
- Phỏng vấn video trong ứng dụng.
- Thi trực tuyến và chấm điểm tự động.
- Ký số hợp đồng lao động.
- Chấm công và tính lương.
- Ứng dụng mobile native.


 9. Kế hoạch Sprint

| Sprint | Nội dung chính |
|---|---|
| Sprint 1 | Tài khoản & phân quyền |
| Sprint 2 | Danh mục tổ chức & vị trí |
| Sprint 3 | Phê duyệt & đăng tin |
| Sprint 4 | Cổng ứng tuyển |
| Sprint 5 | Hồ sơ ứng viên & Pipeline |
| Sprint 6 | Phỏng vấn & đánh giá |
| Sprint 7 | Offer & Onboarding |
| Sprint 8 | Thông báo & báo cáo |


 10. Hướng dẫn tải dự án

bash
git clone https://github.com/dtc245200413-cmyk/TTCS_T926_K5S6_N4.git

Di chuyển vào thư mục dự án:

bash
cd TTCS_T926_K5S6_N4

Hướng dẫn cài đặt Frontend, Backend và Database sẽ được cập nhật theo tiến độ phát triển.


 11. Trạng thái dự án

Dự án hiện đang được phát triển theo Product Backlog gồm 76 User Story, 9 Epic và 8 Sprint.

README sẽ tiếp tục được cập nhật khi nhóm hoàn thiện kiến trúc, công nghệ và các chức năng của hệ thống.

