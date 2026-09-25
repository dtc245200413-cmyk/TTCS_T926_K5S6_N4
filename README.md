HỆ THỐNG TUYỂN DỤNG NỘI BỘ
1.Tổng quan dự án (Project Overview)
Hệ thống Tuyển dụng Nội bộ là một nền tảng quản lý quy trình tuyển dụng toàn diện, được thiết kế để tối ưu hóa và tự động hóa các khâu từ tạo yêu cầu tuyển dụng, đăng tin, quản lý hồ sơ ứng viên, lên lịch phỏng vấn, đánh giá, cho đến khi gửi thư mời nhận việc (Offer). Hệ thống hỗ trợ đa nền tảng và cung cấp luồng quy trình làm việc (workflow) minh bạch cho nhiều vai trò khác nhau trong doanh nghiệp.
- Nhóm thực hiện: TTCS_T926_K5S6_N4
- Quy mô dự án: 76 User Stories/350 Points
- Thời gian triển khai: 8 tuần (8 Sprints)
2.Đối tượng người dùng (User Roles)
Hệ thống được thiết kế để phục vụ 7 nhóm người dùng chính, mỗi người dùng được phân quyền truy cập chức năng riêng biệt:
- Ứng viên (Candidate): Nộp CV, theo dõi trạng thái hồ sơ, xác nhận lịch phỏng vấn và phản hồi offer.
- Nhân viên tuyển dụng (Recruiter): Sàng lọc CV, điều phối pipeline, đặt lịch phỏng vấn, soạn offer.
- Trưởng bộ phận (Hiring Manager): Tạo yêu cầu tuyển dụng, xem danh sách ứng viên, quyết định tuyển.
- Người phỏng vấn (Interviewer): Xem lịch trình, xem trước CV, nộp phiếu đánh giá theo khung năng lực.
- Trưởng phòng Nhân sự (HR Manager): Giám sát toàn bộ quy trình, phân công recruiter, theo dõi ngân sách headcount.
- Người duyệt (Approver): Phê duyệt các yêu cầu tuyển dụng và offer vượt hạn mức lương.
- Quản trị hệ thống (Admin): Quản lý tài khoản, phân quyền, thiết lập các danh mục dùng chung toàn hệ thống.
3.Các phân hệ chức năng chính (Key Epics)
Hệ thống được chia thành 9 phân hệ (Epics) bám sát theo vòng đời tuyển dụng:
- EP-01: Tài khoản, Phân quyền & Hồ sơ: Quản lý đăng nhập, phân quyền chặt chẽ theo vai trò và quản lý hồ sơ cá nhân.
- EP-02: Danh mục Tổ chức & Vị trí: Quản lý phòng ban, chức danh, dải lương, khung năng lực và ngân hàng câu hỏi.
- EP-03 Yêu cầu tuyển dụng & Phê duyệt: Luồng tạo yêu cầu (Requisition), duyệt nhiều cấp, quản lý ngân sách headcount.
- EP-04 | Đăng tin & Cổng ứng tuyển: Quản lý cổng việc làm công khai, cho phép nộp CV, tra cứu trạng thái và giới thiệu nội bộ.
- EP-05: Hồ sơ ứng viên & Pipeline: Quản lý ứng viên theo bảng Kanban, gộp trùng hồ sơ, xây dựng kho ứng viên tiềm năng.
- EP-06: Phỏng vấn & Đánh giá: Lên lịch phỏng vấn (đơn lẻ/hàng loạt), quản lý thư mời và phiếu đánh giá năng lực.
- EP-07: Offer & Onboarding: Đề xuất offer, luồng duyệt offer, thư mời nhận việc và checklist cho ngày đầu làm việc.
- EP-08: Thông báo & Email tự động: Gửi email tự động theo giai đoạn, thư từ chối hàng loạt, nhắc nhở SLA quá hạn.
- EP-09: Báo cáo & Dashboard: Bảng điều khiển tuyển dụng, báo cáo phễu ứng viên và chỉ số thời gian tuyển dụng (Time-to-hire).
4.Lộ trình phát triển (Roadmap)
Dự án được chia thành 8 Sprints (mỗi Sprint kéo dài 1 tuần):
- Sprint 1:Tài khoản & phân quyền (Setup hệ thống, phân quyền 7 vai trò).
- Sprint 2: Danh mục tổ chức, vị trí & tạo yêu cầu tuyển dụng.
- Sprint 3: Phê duyệt yêu cầu & xuất bản tin tuyển dụng công khai.
- Sprint 4: Hoàn thiện cổng ứng tuyển cho ứng viên nộp CV.
- Sprint 5: Quản lý hồ sơ ứng viên trên Kanban pipeline.
- Sprint 6: Đặt lịch phỏng vấn & form đánh giá năng lực.
- Sprint 7: Quy trình tạo, duyệt, gửi Offer & Onboarding.
- Sprint 8: Hoàn thiện hệ thống Dashboard báo cáo và thông báo.
 5.Công nghệ sử dụng (Tech Stack)
- Thiết kế giao diện (UI/UX): Figma
- Frontend: Lập trình trên VS Code (HTML/CSS/JS/...)
- Backend: Xây dựng và kiểm thử RESTful API (sử dụng Postman)
- Database: SQL (SQL Server / MySQL)
- Khác: Git/GitHub, Jira
kiến trúc, công nghệ và các chức năng của hệ thống.

