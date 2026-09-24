
# HỆ THỐNG TUYỂN DỤNG NỘI BỘ

## INTERNAL RECRUITMENT MANAGEMENT SYSTEM

**Tên dự án:** Hệ thống tuyển dụng nội bộ

**Tên repository:** TTCS_T926_K5S6_N4

**Nhóm thực hiện:** Nhóm 2

**Loại dự án:** Dự án thực tập – Ứng dụng web quản lý tuyển dụng

**Thời gian thực hiện dự kiến:** 8 tuần

**Số lượng thành viên dự kiến:** 5 người

**Trạng thái:** Đang phát triển

---

## 1. GIỚI THIỆU DỰ ÁN

### 1.1. Tổng quan

Hệ thống tuyển dụng nội bộ (Internal Recruitment Management System) là ứng dụng web được xây dựng nhằm hỗ trợ doanh nghiệp quản lý tập trung các hoạt động tuyển dụng nhân sự.

Hệ thống hoạt động theo mô hình Applicant Tracking System (ATS), cho phép bộ phận nhân sự quản lý toàn bộ vòng đời tuyển dụng, từ tiếp nhận nhu cầu tuyển dụng của các phòng ban đến khi ứng viên được lựa chọn và tiếp nhận vào làm việc.

Ứng dụng hỗ trợ quản lý yêu cầu tuyển dụng, phê duyệt nhu cầu nhân sự, đăng tin tuyển dụng, tiếp nhận hồ sơ, sàng lọc ứng viên, tổ chức phỏng vấn, đánh giá năng lực, gửi thư mời nhận việc và theo dõi quá trình tiếp nhận nhân sự.

Bên cạnh đó, hệ thống cung cấp cổng tuyển dụng công khai để ứng viên bên ngoài doanh nghiệp có thể tìm kiếm vị trí phù hợp, nộp hồ sơ trực tuyến và tra cứu trạng thái ứng tuyển.

Các bộ phận tham gia tuyển dụng có thể phối hợp và theo dõi tiến độ trên cùng một nền tảng, giúp hạn chế tình trạng dữ liệu phân tán và tăng khả năng kiểm soát quy trình tuyển dụng.

### 1.2. Bối cảnh và vấn đề thực tế

Trong quy trình tuyển dụng truyền thống, doanh nghiệp thường sử dụng nhiều công cụ riêng lẻ như Excel, email và các dịch vụ lưu trữ tài liệu để quản lý ứng viên.

Việc sử dụng nhiều công cụ khác nhau có thể gây ra những khó khăn như:

- Dữ liệu tuyển dụng không được quản lý tập trung.
- Khó theo dõi trạng thái của từng vị trí đang tuyển.
- Thiếu lịch sử phê duyệt nhu cầu tuyển dụng.
- Hồ sơ ứng viên có thể bị trùng lặp hoặc bỏ sót.
- Tốn thời gian tìm kiếm và sàng lọc CV.
- Khó phối hợp lịch phỏng vấn giữa các bên.
- Thiếu sự thống nhất trong tiêu chí đánh giá ứng viên.
- Ứng viên không được cập nhật kịp thời về trạng thái hồ sơ.
- Khó tổng hợp số liệu và đánh giá hiệu quả tuyển dụng.

Dự án được xây dựng nhằm giải quyết những vấn đề trên thông qua một hệ thống quản lý tuyển dụng thống nhất.

### 1.3. Mục tiêu dự án

Mục tiêu tổng quát là xây dựng một hệ thống quản lý tuyển dụng trên nền tảng web, hỗ trợ doanh nghiệp số hóa và theo dõi toàn bộ quy trình tuyển dụng.

Các mục tiêu cụ thể bao gồm:

1. Quản lý tập trung yêu cầu tuyển dụng và thông tin ứng viên.
2. Xây dựng quy trình phê duyệt nhu cầu tuyển dụng theo thẩm quyền.
3. Quản lý các vị trí và tin tuyển dụng của doanh nghiệp.
4. Cung cấp cổng ứng tuyển trực tuyến cho ứng viên.
5. Hỗ trợ tiếp nhận, lưu trữ và sàng lọc hồ sơ.
6. Theo dõi tiến độ tuyển dụng thông qua Pipeline dạng Kanban.
7. Quản lý lịch phỏng vấn và đánh giá ứng viên.
8. Hỗ trợ phê duyệt và gửi thư mời nhận việc (Offer).
9. Quản lý danh sách công việc tiếp nhận nhân viên mới (Onboarding).
10. Tự động hóa email và thông báo trong quá trình tuyển dụng.
11. Cung cấp Dashboard và báo cáo thống kê.
12. Bảo vệ dữ liệu cá nhân và kiểm soát quyền truy cập của người dùng.

---

## 2. ĐỐI TƯỢNG SỬ DỤNG

Hệ thống được thiết kế cho bảy vai trò chính.

### 2.1. Ứng viên (Candidate)

Ứng viên là người tìm kiếm cơ hội việc làm và nộp hồ sơ vào các vị trí tuyển dụng của doanh nghiệp.

Các chức năng:

- Xem danh sách tin tuyển dụng công khai.
- Tìm kiếm và xem chi tiết vị trí tuyển dụng.
- Nộp hồ sơ ứng tuyển trực tuyến.
- Tải lên CV và thông tin cá nhân.
- Tra cứu trạng thái hồ sơ bằng mã tra cứu.
- Xác nhận hoặc đề nghị thay đổi lịch phỏng vấn.
- Phản hồi thư mời nhận việc.

Ứng viên không cần tài khoản nội bộ để thực hiện các chức năng ứng tuyển công khai.

### 2.2. Nhân viên tuyển dụng (Recruiter)

Recruiter chịu trách nhiệm vận hành các hoạt động tuyển dụng hằng ngày.

Các chức năng:

- Quản lý các vị trí tuyển dụng được phân công.
- Tiếp nhận và sàng lọc CV.
- Quản lý hồ sơ ứng viên.
- Theo dõi Pipeline tuyển dụng.
- Lên lịch phỏng vấn.
- Điều phối người phỏng vấn.
- Soạn thảo đề xuất Offer.
- Gửi email và thông báo cho ứng viên.

### 2.3. Trưởng bộ phận (Hiring Manager)

Trưởng bộ phận là người phát sinh nhu cầu tuyển dụng nhân sự cho phòng ban.

Các chức năng:

- Tạo yêu cầu tuyển dụng.
- Theo dõi quá trình phê duyệt yêu cầu.
- Xem ứng viên thuộc vị trí mình phụ trách.
- Theo dõi tiến độ tuyển dụng.
- Xem kết quả đánh giá và quyết định tuyển dụng theo thẩm quyền.

### 2.4. Người phỏng vấn (Interviewer)

Người phỏng vấn là nhân sự được phân công tham gia đánh giá ứng viên.

Các chức năng:

- Xem lịch phỏng vấn được phân công.
- Xem thông tin và CV của ứng viên theo quyền.
- Sử dụng bộ câu hỏi phỏng vấn theo khung năng lực.
- Ghi nhận nhận xét và kết quả đánh giá.
- Nộp phiếu đánh giá sau phỏng vấn.

### 2.5. Trưởng phòng Nhân sự (HR Manager)

Trưởng phòng Nhân sự chịu trách nhiệm quản lý và giám sát toàn bộ hoạt động tuyển dụng.

Các chức năng:

- Quản lý danh mục tổ chức và chức danh.
- Quản lý khung năng lực.
- Theo dõi nhu cầu và ngân sách tuyển dụng.
- Phân công nhân viên tuyển dụng.
- Phê duyệt các nghiệp vụ theo thẩm quyền.
- Quản lý hiệu quả tuyển dụng.
- Theo dõi báo cáo và Dashboard.

### 2.6. Người duyệt (Approver)

Người duyệt là cá nhân có thẩm quyền phê duyệt yêu cầu tuyển dụng hoặc Offer theo quy định của doanh nghiệp.

Các chức năng:

- Xem các yêu cầu đang chờ phê duyệt.
- Phê duyệt, từ chối hoặc yêu cầu bổ sung thông tin.
- Xem các đề xuất Offer thuộc phạm vi thẩm quyền.
- Theo dõi lịch sử phê duyệt.

### 2.7. Quản trị hệ thống (Admin)

Quản trị viên chịu trách nhiệm quản lý tài khoản và cấu hình hệ thống.

Các chức năng:

- Tạo và quản lý tài khoản nội bộ.
- Gán và thu hồi vai trò người dùng.
- Khóa hoặc mở khóa tài khoản.
- Quản lý các danh mục và cấu hình dùng chung theo quyền.
- Theo dõi nhật ký hoạt động hệ thống.

---

## 3. CÁC NHÓM CHỨC NĂNG CHÍNH

Hệ thống được phân chia thành 9 nhóm chức năng (Epic).

### EP-01. Tài khoản, phân quyền và hồ sơ

Quản lý việc xác thực và phân quyền người dùng nội bộ.

Các chức năng dự kiến:

- Đăng nhập và đăng xuất.
- Khôi phục và thay đổi mật khẩu.
- Quản lý phiên đăng nhập.
- Phân quyền theo vai trò.
- Quản lý tài khoản người dùng.
- Quản lý hồ sơ cá nhân.
- Khóa và mở khóa tài khoản.
- Nhập danh sách nhân sự từ Excel.

Hệ thống cần kiểm tra quyền truy cập ở phía máy chủ để bảo vệ dữ liệu tuyển dụng.

### EP-02. Danh mục tổ chức và vị trí

Quản lý các thông tin tổ chức làm cơ sở cho quá trình tuyển dụng.

Các chức năng dự kiến:

- Quản lý phòng ban và cơ cấu tổ chức.
- Quản lý chức danh và cấp bậc.
- Quản lý dải lương theo chức danh.
- Xây dựng khung năng lực.
- Quản lý ngân hàng câu hỏi phỏng vấn.
- Quản lý các danh mục dùng chung.

Khung năng lực được sử dụng để xây dựng tiêu chí đánh giá ứng viên trong quá trình phỏng vấn.

### EP-03. Yêu cầu tuyển dụng và phê duyệt

Hỗ trợ các phòng ban đề xuất nhu cầu tuyển dụng và theo dõi quá trình phê duyệt.

Các chức năng dự kiến:

- Tạo yêu cầu tuyển dụng.
- Quản lý số lượng nhân sự cần tuyển (Headcount).
- Thiết lập quy trình phê duyệt nhiều cấp.
- Phê duyệt hoặc từ chối yêu cầu.
- Yêu cầu bổ sung thông tin tuyển dụng.
- Quản lý ngân sách tuyển dụng theo phòng ban.
- Phân công Recruiter phụ trách.
- Theo dõi lịch sử phê duyệt.
- Tạm dừng, đóng hoặc hủy yêu cầu tuyển dụng.

Mọi quyết định phê duyệt cần được ghi nhận để có thể tra cứu lịch sử khi cần thiết.

### EP-04. Đăng tin và cổng ứng tuyển

Cung cấp chức năng quản lý tin tuyển dụng và tiếp nhận hồ sơ từ ứng viên.

Các chức năng dự kiến:

- Soạn thảo tin tuyển dụng.
- Duyệt và xuất bản tin tuyển dụng.
- Hiển thị danh sách việc làm công khai.
- Tìm kiếm và lọc vị trí tuyển dụng.
- Xem thông tin chi tiết công việc.
- Nộp hồ sơ ứng tuyển trực tuyến.
- Tải lên CV.
- Tra cứu trạng thái ứng tuyển.
- Rút hồ sơ ứng tuyển.
- Giới thiệu ứng viên thông qua nhân sự nội bộ.
- Gỡ tin hoặc tự động đóng tin hết hạn.

Ứng viên có thể sử dụng cổng tuyển dụng công khai mà không cần đăng nhập bằng tài khoản nhân viên của doanh nghiệp.

### EP-05. Hồ sơ ứng viên và Pipeline

Quản lý tập trung thông tin ứng viên và quá trình xử lý hồ sơ.

Các chức năng dự kiến:

- Quản lý hồ sơ ứng viên hợp nhất.
- Phát hiện và xử lý hồ sơ trùng lặp.
- Quản lý Pipeline tuyển dụng dạng Kanban.
- Chuyển ứng viên giữa các giai đoạn tuyển dụng.
- Gắn nhãn và ghi chú sàng lọc.
- Tìm kiếm và lọc hồ sơ theo nhiều điều kiện.
- Quản lý kho ứng viên tiềm năng.
- Theo dõi lịch sử tương tác với ứng viên.
- Bổ sung hồ sơ ứng viên thủ công.
- Hỗ trợ đánh giá mức độ đáp ứng tiêu chí bắt buộc.
- Xuất danh sách ứng viên ra Excel.

Pipeline dự kiến gồm các giai đoạn:

Hồ sơ mới → Sàng lọc → Phỏng vấn → Đề xuất Offer → Nhận việc.

Hệ thống cũng ghi nhận trạng thái loại ứng viên và lý do loại để phục vụ tra cứu và thống kê.

### EP-06. Phỏng vấn và đánh giá

Hỗ trợ tổ chức phỏng vấn và đánh giá ứng viên theo các tiêu chí thống nhất.

Các chức năng dự kiến:

- Đặt lịch phỏng vấn.
- Đặt lịch phỏng vấn hàng loạt.
- Kiểm tra xung đột lịch phỏng vấn.
- Gửi thư mời phỏng vấn.
- Xác nhận lịch tham dự.
- Dời hoặc hủy lịch phỏng vấn.
- Quản lý bộ câu hỏi phỏng vấn.
- Tạo phiếu đánh giá theo khung năng lực.
- Ghi nhận kết quả đánh giá.
- So sánh kết quả đánh giá giữa các ứng viên.
- Tổng hợp kết quả và ghi nhận quyết định tuyển dụng.

Việc đánh giá sử dụng các tiêu chí và trọng số được xác định theo khung năng lực của từng chức danh.

### EP-07. Offer và Onboarding

Quản lý quá trình đề xuất, phê duyệt và gửi thư mời nhận việc.

Các chức năng dự kiến:

- Soạn thảo đề xuất Offer.
- Quản lý mức lương và các điều khoản đề xuất.
- Phê duyệt Offer theo hạn mức.
- Gửi thư mời nhận việc.
- Ghi nhận phản hồi của ứng viên.
- Xử lý trường hợp ứng viên từ chối hoặc thương lượng lại.
- Tạo checklist tiếp nhận nhân viên mới.
- Phân công người phụ trách các công việc Onboarding.
- Theo dõi tiến độ hoàn thành checklist.

### EP-08. Thông báo và Email tự động

Tự động hóa việc gửi thông báo trong quá trình tuyển dụng.

Các chức năng dự kiến:

- Quản lý mẫu email theo từng giai đoạn.
- Gửi email xác nhận đã nhận hồ sơ.
- Gửi thư mời phỏng vấn.
- Gửi thư cảm ơn và thư từ chối.
- Gửi thư mời nhận việc.
- Theo dõi lịch sử gửi email.
- Gửi lại email bị lỗi.
- Hiển thị thông báo trong ứng dụng.
- Cấu hình loại thông báo được nhận.
- Nhắc việc khi hồ sơ hoặc công việc quá hạn xử lý.

### EP-09. Báo cáo và Dashboard tuyển dụng

Cung cấp công cụ theo dõi và đánh giá hiệu quả tuyển dụng.

Các chức năng dự kiến:

- Dashboard tổng quan hoạt động tuyển dụng.
- Thống kê số lượng vị trí đang tuyển.
- Thống kê hồ sơ ứng tuyển.
- Theo dõi tiến độ tuyển dụng theo phòng ban.
- Báo cáo phễu tuyển dụng.
- Thống kê tỷ lệ chuyển đổi giữa các giai đoạn.
- Báo cáo thời gian tuyển dụng (Time-to-hire).
- Báo cáo chi phí tuyển dụng (Cost-per-hire).
- Đánh giá hiệu quả các nguồn ứng viên.
- Xuất báo cáo Excel.

---

## 4. QUY TRÌNH TUYỂN DỤNG TỔNG QUÁT

Quy trình tuyển dụng dự kiến được thực hiện theo các bước sau:

**Bước 1:** Trưởng bộ phận xác định nhu cầu và tạo yêu cầu tuyển dụng.

**Bước 2:** Người có thẩm quyền kiểm tra và phê duyệt yêu cầu.

**Bước 3:** Bộ phận nhân sự phân công Recruiter và tạo tin tuyển dụng.

**Bước 4:** Tin tuyển dụng được phê duyệt và xuất bản lên cổng tuyển dụng.

**Bước 5:** Ứng viên tìm kiếm vị trí phù hợp và nộp hồ sơ.

**Bước 6:** Recruiter tiếp nhận, kiểm tra và sàng lọc hồ sơ.

**Bước 7:** Ứng viên được chuyển qua các giai đoạn Pipeline tuyển dụng.

**Bước 8:** Recruiter tổ chức phỏng vấn và người phỏng vấn thực hiện đánh giá.

**Bước 9:** Hiring Manager tổng hợp kết quả và ghi nhận quyết định tuyển dụng.

**Bước 10:** Recruiter soạn thảo đề xuất Offer và gửi phê duyệt.

**Bước 11:** Ứng viên nhận và phản hồi thư mời nhận việc.

**Bước 12:** Hệ thống khởi tạo checklist Onboarding và ghi nhận kết quả tuyển dụng.

Thông tin và lịch sử xử lý được lưu trữ để phục vụ công tác quản lý, theo dõi và thống kê.

---

## 5. CÔNG NGHỆ SỬ DỤNG

Theo định hướng kỹ thuật trong Product Backlog, hệ thống dự kiến sử dụng:

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | React + TypeScript |
| Backend | Spring Boot (Java) hoặc NestJS |
| Cơ sở dữ liệu | PostgreSQL |
| Xác thực | JWT Access Token và Refresh Token |
| Lưu trữ tài liệu | Dịch vụ lưu trữ đối tượng |
| Gửi email | SMTP nội bộ và hàng đợi |
| Quản lý mã nguồn | Git và GitHub |

Công nghệ Backend sẽ được cập nhật sau khi nhóm và người hướng dẫn thống nhất lựa chọn chính thức.

---

## 6. YÊU CẦU PHI CHỨC NĂNG

Hệ thống cần đáp ứng các yêu cầu dự kiến sau:

### 6.1. Bảo mật

- Xác thực và phân quyền người dùng.
- Kiểm tra quyền truy cập ở phía Backend.
- Băm mật khẩu trước khi lưu trữ.
- Giới hạn quyền truy cập thông tin ứng viên.
- Ghi nhật ký truy cập dữ liệu quan trọng.
- Bảo vệ thông tin cá nhân và tài liệu tuyển dụng.
- Có biện pháp chống spam đối với cổng ứng tuyển.

### 6.2. Hiệu năng

- Danh sách ứng viên trả kết quả dưới 1,5 giây với bộ dữ liệu kiểm thử gồm 20.000 hồ sơ và 200 vị trí.
- Hỗ trợ quy mô 400 người dùng nội bộ.
- Cổng ứng tuyển công khai có khả năng tiếp nhận 100 lượt nộp hồ sơ mỗi giờ.

Các chỉ tiêu trên là yêu cầu thiết kế và cần được kiểm chứng trong quá trình kiểm thử.

### 6.3. Giao diện

- Giao diện tiếng Việt.
- Hỗ trợ thiết bị máy tính và điện thoại.
- Thiết kế responsive từ độ rộng màn hình 360px.
- Hỗ trợ ứng viên nộp hồ sơ trực tiếp trên điện thoại.

### 6.4. Sao lưu dữ liệu

Dự kiến thực hiện sao lưu cơ sở dữ liệu và tài liệu CV hằng ngày, lưu giữ bảy bản sao lưu gần nhất.

---

## 7. PHẠM VI VÀ GIỚI HẠN DỰ ÁN

### 7.1. Các chức năng nằm trong phạm vi

- Quản lý tài khoản và phân quyền.
- Quản lý tổ chức và vị trí công việc.
- Quản lý yêu cầu tuyển dụng và phê duyệt.
- Cổng ứng tuyển công khai.
- Quản lý hồ sơ ứng viên.
- Quản lý Pipeline tuyển dụng.
- Phỏng vấn và đánh giá.
- Offer và Onboarding.
- Email, thông báo và báo cáo.

### 7.2. Các chức năng không nằm trong phạm vi ban đầu

- Tích hợp AI so khớp ngữ nghĩa CV với mô tả công việc.
- Tự động đăng tin lên các nền tảng tuyển dụng bên ngoài.
- Đồng bộ hai chiều với Google Calendar hoặc Outlook.
- Phỏng vấn video trực tiếp trong ứng dụng.
- Tổ chức và chấm điểm bài kiểm tra năng lực trực tuyến.
- Ký số hợp đồng lao động.
- Quản lý chấm công và tính lương sau khi nhân viên nhận việc.
- Xây dựng ứng dụng di động native.

Các chức năng ngoài phạm vi có thể được xem xét trong những giai đoạn phát triển sau.

---

## 8. KẾ HOẠCH PHÁT TRIỂN

Theo Product Backlog, dự án được chia thành tám Sprint, mỗi Sprint kéo dài một tuần.

| Sprint | Nội dung chính | Kết quả dự kiến |
|--------|----------------|-----------------|
| 1 | Tài khoản và phân quyền | Hoàn thiện xác thực và phân quyền người dùng |
| 2 | Danh mục tổ chức và vị trí | Quản lý tổ chức, khung năng lực và tạo yêu cầu tuyển dụng |
| 3 | Phê duyệt và đăng tin | Hoàn thiện quy trình phê duyệt và xuất bản tin tuyển dụng |
| 4 | Cổng ứng tuyển | Ứng viên có thể nộp CV và tra cứu trạng thái |
| 5 | Hồ sơ ứng viên và Pipeline | Quản lý ứng viên qua các giai đoạn tuyển dụng |
| 6 | Phỏng vấn và đánh giá | Quản lý lịch và phiếu đánh giá phỏng vấn |
| 7 | Offer và Onboarding | Phê duyệt Offer và tiếp nhận nhân sự |
| 8 | Thông báo và báo cáo | Hoàn thiện Dashboard và báo cáo tuyển dụng |

Kế hoạch có thể được điều chỉnh theo tiến độ thực tế và kết quả đánh giá sau mỗi Sprint.

---

## 9. HƯỚNG DẪN CÀI ĐẶT

### 9.1. Tải mã nguồn

Mở Git Bash hoặc Terminal và thực hiện:

```bash
git clone https://github.com/dtc245200413-cmyk/TTCS_T926_K5S6_N4.git
```

Di chuyển vào thư mục dự án:

```bash
cd TTCS_T926_K5S6_N4
```

### 9.2. Cài đặt môi trường

Hướng dẫn cài đặt Frontend, Backend và PostgreSQL sẽ được cập nhật khi nhóm hoàn thành cấu hình môi trường phát triển.

### 9.3. Chạy ứng dụng

Các lệnh khởi chạy hệ thống sẽ được bổ sung sau khi nhóm hoàn thiện mã nguồn và các thành phần kỹ thuật cần thiết.

---

## 10. THÀNH VIÊN THỰC HIỆN

**Nhóm:** Nhóm 2

**Đề tài:** Hệ thống tuyển dụng nội bộ

**Repository:** TTCS_T926_K5S6_N4

Danh sách thành viên và phân công nhiệm vụ sẽ được cập nhật theo thông tin chính thức của nhóm.

---

## 11. TRẠNG THÁI DỰ ÁN

Dự án đang trong quá trình phát triển theo Product Backlog.

Các chức năng và thông tin kỹ thuật trong tài liệu mô tả phạm vi dự kiến, không đồng nghĩa với việc toàn bộ chức năng đã được triển khai hoàn chỉnh.

README.md sẽ tiếp tục được cập nhật theo tiến độ thực tế của dự án.

---

**Nhóm 2 – Hệ thống tuyển dụng nội bộ**
