
HỆ THỐNG TUYỂN DỤNG NỘI BỘ
INTERNAL RECRUITMENT MANAGEMENT SYSTEM

Tên repository: TTCS_T926_K5S6_N4

Nhóm thực hiện: Nhóm 2

Loại dự án: Ứng dụng web quản lý tuyển dụng nội bộ

Trạng thái: Đang phát triển

1. GIỚI THIỆU DỰ ÁN
 1.1. Tổng quan

Hệ thống tuyển dụng nội bộ (Internal Recruitment Management System) là ứng dụng web được xây dựng nhằm hỗ trợ doanh nghiệp quản lý hoạt động tuyển dụng nhân sự từ nguồn nhân lực hiện có.

Hệ thống cho phép doanh nghiệp công khai các vị trí tuyển dụng nội bộ, tiếp nhận hồ sơ ứng tuyển từ nhân viên, tổ chức quá trình xét duyệt, phỏng vấn và ghi nhận kết quả tuyển dụng.

Thông qua hệ thống, bộ phận nhân sự, quản lý phòng ban và nhân viên có thể phối hợp thực hiện quy trình tuyển dụng trên một nền tảng thống nhất.

Ứng dụng hướng đến việc số hóa quy trình tuyển dụng, quản lý tập trung dữ liệu nhân sự và nâng cao tính minh bạch trong hoạt động tuyển dụng nội bộ.

1.2. Lý do lựa chọn đề tài

Trong nhiều doanh nghiệp, quá trình tuyển dụng và điều chuyển nhân sự nội bộ vẫn được thực hiện thông qua email, biểu mẫu giấy hoặc các bảng tính Excel.

Phương pháp quản lý thủ công có thể dẫn đến những hạn chế như:

- Khó quản lý tập trung các yêu cầu tuyển dụng.
- Thông tin về vị trí tuyển dụng chưa được cập nhật đồng bộ.
- Nhân viên khó tiếp cận các cơ hội ứng tuyển nội bộ.
- Bộ phận nhân sự mất nhiều thời gian tiếp nhận và xử lý hồ sơ.
- Khó theo dõi tiến độ xét duyệt và phỏng vấn.
- Dữ liệu tuyển dụng phân tán, gây khó khăn cho công tác thống kê.
- Việc phối hợp giữa phòng nhân sự và các phòng ban chưa hiệu quả.

Vì vậy, việc xây dựng hệ thống tuyển dụng nội bộ là cần thiết nhằm hỗ trợ doanh nghiệp chuẩn hóa quy trình và nâng cao hiệu quả quản lý nguồn nhân lực.

1.3. Mục tiêu dự án

Mục tiêu tổng quát:

Xây dựng ứng dụng web hỗ trợ doanh nghiệp quản lý tập trung và số hóa quy trình tuyển dụng nội bộ, từ việc xác định nhu cầu tuyển dụng đến khi hoàn tất quá trình lựa chọn nhân sự.

Mục tiêu cụ thể:

1. Xây dựng hệ thống đăng nhập và quản lý tài khoản người dùng.
2. Phân quyền truy cập phù hợp với từng vai trò.
3. Quản lý thông tin nhân viên và các phòng ban.
4. Quản lý yêu cầu tuyển dụng và vị trí tuyển dụng nội bộ.
5. Cho phép nhân viên tìm kiếm và ứng tuyển vào các vị trí phù hợp.
6. Hỗ trợ bộ phận nhân sự tiếp nhận và xử lý hồ sơ ứng tuyển.
7. Quản lý lịch phỏng vấn và kết quả đánh giá.
8. Theo dõi trạng thái ứng tuyển trong từng giai đoạn.
9. Quản lý kết quả tuyển dụng và đề xuất điều chuyển nhân sự.
10. Hỗ trợ thống kê và báo cáo hoạt động tuyển dụng.


2. PHẠM VI DỰ ÁN
 2.1. Phạm vi sử dụng

Hệ thống được xây dựng để phục vụ hoạt động tuyển dụng nội bộ tại doanh nghiệp.

Các đối tượng sử dụng dự kiến bao gồm:

- Quản trị viên hệ thống.
- Nhân viên phòng nhân sự.
- Quản lý các phòng ban.
- Nhân viên đang làm việc tại doanh nghiệp.

 2.2. Phạm vi chức năng

Hệ thống tập trung vào các nghiệp vụ:

- Quản lý thông tin người dùng.
- Quản lý cơ cấu phòng ban.
- Quản lý nhu cầu và vị trí tuyển dụng.
- Đăng ký ứng tuyển nội bộ.
- Tiếp nhận và xử lý hồ sơ.
- Tổ chức phỏng vấn và đánh giá.
- Theo dõi kết quả tuyển dụng.
- Thống kê và báo cáo.

 2.3. Giới hạn dự án

Trong phạm vi phát triển ban đầu, hệ thống tập trung vào quản lý tuyển dụng nội bộ thông qua nền tảng web.

Các chức năng nâng cao như tích hợp hệ thống chấm công, tính lương, quản lý hợp đồng lao động hoặc kết nối với hệ thống ERP có thể được xem xét trong các giai đoạn phát triển tiếp theo.


 3. ĐỐI TƯỢNG SỬ DỤNG VÀ PHÂN QUYỀN

Hệ thống dự kiến phân chia người dùng thành bốn nhóm vai trò chính.

 3.1. Quản trị viên (Admin)

Quản trị viên chịu trách nhiệm quản lý và duy trì hoạt động của hệ thống.

Các chức năng:

- Đăng nhập và đăng xuất.
- Quản lý tài khoản người dùng.
- Tạo, cập nhật và khóa tài khoản.
- Phân quyền người dùng.
- Quản lý danh mục phòng ban.
- Quản lý danh mục chức vụ.
- Xem và quản lý thông tin hệ thống theo quyền được cấp.
- Theo dõi hoạt động của hệ thống.

 3.2. Nhân viên nhân sự (HR)

Nhân viên nhân sự chịu trách nhiệm quản lý và điều phối quá trình tuyển dụng.

Các chức năng:

- Quản lý yêu cầu tuyển dụng.
- Tạo và cập nhật thông tin vị trí tuyển dụng.
- Công khai hoặc đóng các vị trí tuyển dụng.
- Tiếp nhận hồ sơ ứng tuyển.
- Tìm kiếm và sàng lọc hồ sơ.
- Cập nhật trạng thái tuyển dụng.
- Tạo và quản lý lịch phỏng vấn.
- Theo dõi kết quả đánh giá ứng viên.
- Tổng hợp và quản lý kết quả tuyển dụng.
- Xem báo cáo và thống kê tuyển dụng.

 3.3. Quản lý phòng ban (Manager)

Quản lý phòng ban tham gia vào việc xác định nhu cầu tuyển dụng và đánh giá nhân sự.

Các chức năng:

- Gửi yêu cầu tuyển dụng nhân sự cho phòng ban.
- Theo dõi trạng thái yêu cầu tuyển dụng.
- Xem thông tin các vị trí tuyển dụng thuộc phòng ban.
- Xem hồ sơ ứng tuyển được phân quyền.
- Tham gia phỏng vấn và đánh giá ứng viên.
- Ghi nhận ý kiến và kết quả đánh giá.
- Theo dõi kết quả tuyển dụng của phòng ban.

 3.4. Nhân viên (Employee)

Nhân viên là người đang làm việc trong doanh nghiệp và có nhu cầu ứng tuyển vào vị trí nội bộ.

Các chức năng:

- Đăng nhập và quản lý thông tin cá nhân.
- Xem danh sách vị trí tuyển dụng nội bộ.
- Tìm kiếm các vị trí phù hợp.
- Xem thông tin chi tiết và điều kiện ứng tuyển.
- Đăng ký ứng tuyển vào vị trí mong muốn.
- Cập nhật hồ sơ cá nhân theo quyền được cấp.
- Theo dõi trạng thái hồ sơ ứng tuyển.
- Xem thông báo và lịch phỏng vấn.
- Xem kết quả ứng tuyển của bản thân.

 3.5. Bảng phân quyền chức năng dự kiến

| Chức năng | Admin | HR | Manager | Employee |
|-----------|:-----:|:--:|:-------:|:--------:|
| Đăng nhập | Có | Có | Có | Có |
| Quản lý tài khoản | Có | Không | Không | Không |
| Quản lý phòng ban | Có | Không | Không | Không |
| Quản lý vị trí tuyển dụng | Theo quyền | Có | Đề xuất | Xem |
| Tạo yêu cầu tuyển dụng | Theo quyền | Có | Có | Không |
| Xem hồ sơ ứng tuyển | Theo quyền | Có | Theo phân công | Hồ sơ của mình |
| Đăng ký ứng tuyển | Không | Không | Không | Có |
| Quản lý lịch phỏng vấn | Theo quyền | Có | Theo phân công | Xem lịch của mình |
| Đánh giá ứng viên | Không | Theo phân công | Theo phân công | Không |
| Xem kết quả ứng tuyển | Theo quyền | Có | Theo phân công | Kết quả của mình |
| Xem báo cáo tuyển dụng | Có | Có | Theo phòng ban | Không |
Lưu ý !!!!

 4. CÁC CHỨC NĂNG CHÍNH CỦA HỆ THỐNG

 4.1. Đăng nhập và quản lý tài khoản

Hệ thống hỗ trợ người dùng đăng nhập bằng tài khoản được cấp.

Sau khi xác thực thành công, người dùng được truy cập các chức năng phù hợp với vai trò của mình.

Chức năng dự kiến:

- Đăng nhập.
- Đăng xuất.
- Đổi mật khẩu.
- Quản lý thông tin tài khoản.
- Kiểm tra quyền truy cập.
- Điều hướng người dùng đến giao diện tương ứng.

 4.2. Quản lý phòng ban

Hỗ trợ quản lý thông tin các phòng ban trong doanh nghiệp.

Thông tin quản lý:

- Mã phòng ban.
- Tên phòng ban.
- Mô tả.
- Người quản lý.
- Trạng thái hoạt động.

Chức năng:

- Thêm phòng ban.
- Cập nhật thông tin phòng ban.
- Tra cứu danh sách phòng ban.
- Quản lý trạng thái phòng ban.

 4.3. Quản lý yêu cầu tuyển dụng

Quản lý phòng ban hoặc bộ phận nhân sự có thể tạo yêu cầu tuyển dụng khi phát sinh nhu cầu bổ sung nhân sự.

Thông tin yêu cầu dự kiến:

- Mã yêu cầu.
- Phòng ban yêu cầu.
- Vị trí cần tuyển.
- Số lượng nhân sự cần tuyển.
- Lý do tuyển dụng.
- Yêu cầu về năng lực.
- Thời gian dự kiến.
- Người tạo yêu cầu.
- Trạng thái phê duyệt.

Quy trình xử lý:

1. Tạo yêu cầu tuyển dụng.
2. Gửi yêu cầu để xét duyệt.
3. Người có thẩm quyền xem xét.
4. Phê duyệt hoặc từ chối yêu cầu.
5. Bộ phận nhân sự triển khai tuyển dụng đối với yêu cầu được phê duyệt.

 4.4. Quản lý vị trí tuyển dụng
Hỗ trợ bộ phận nhân sự tạo và quản lý các vị trí tuyển dụng nội bộ.

Thông tin vị trí tuyển dụng:

- Mã vị trí tuyển dụng.
- Tên vị trí.
- Phòng ban tuyển dụng.
- Số lượng cần tuyển.
- Mô tả công việc.
- Yêu cầu về trình độ.
- Yêu cầu về kinh nghiệm.
- Các kỹ năng cần thiết.
- Điều kiện ứng tuyển nội bộ.
- Ngày bắt đầu tuyển dụng.
- Hạn nộp hồ sơ.
- Trạng thái tuyển dụng.

Chức năng:

- Thêm vị trí tuyển dụng.
- Chỉnh sửa thông tin.
- Công khai vị trí tuyển dụng.
- Đóng vị trí tuyển dụng.
- Tìm kiếm và lọc vị trí tuyển dụng.
- Xem danh sách nhân viên ứng tuyển.

 4.5. Quản lý hồ sơ nhân viên

Quản lý thông tin của nhân viên tham gia ứng tuyển nội bộ.

Thông tin hồ sơ dự kiến:

- Mã nhân viên.
- Họ và tên.
- Email.
- Số điện thoại.
- Phòng ban hiện tại.
- Chức vụ hiện tại.
- Ngày bắt đầu làm việc.
- Trình độ chuyên môn.
- Kinh nghiệm làm việc.
- Kỹ năng chuyên môn.
- Thông tin liên hệ.

Nhân viên chỉ được xem và chỉnh sửa những thông tin thuộc phạm vi quyền truy cập của mình.

 4.6. Đăng ký ứng tuyển nội bộ

Nhân viên có thể lựa chọn các vị trí tuyển dụng đang mở để gửi hồ sơ ứng tuyển.

Quy trình dự kiến:

1. Nhân viên đăng nhập vào hệ thống.
2. Truy cập danh sách vị trí tuyển dụng.
3. Xem thông tin và điều kiện ứng tuyển.
4. Lựa chọn vị trí mong muốn.
5. Điền thông tin ứng tuyển.
6. Đính kèm hồ sơ nếu được yêu cầu.
7. Xác nhận và gửi hồ sơ.
8. Hệ thống lưu hồ sơ và cập nhật trạng thái.

Hệ thống cần kiểm tra các điều kiện hợp lệ trước khi tiếp nhận hồ sơ, chẳng hạn vị trí còn thời hạn tuyển dụng và nhân viên chưa gửi hồ sơ trùng lặp cho cùng một đợt tuyển dụng.

 4.7. Quản lý hồ sơ ứng tuyển

Bộ phận nhân sự tiếp nhận và xử lý hồ sơ của nhân viên.

Chức năng:

- Xem danh sách hồ sơ ứng tuyển.
- Xem chi tiết hồ sơ.
- Tìm kiếm theo tên nhân viên.
- Lọc theo vị trí tuyển dụng.
- Lọc theo phòng ban.
- Lọc theo trạng thái xử lý.
- Ghi nhận kết quả sàng lọc.
- Cập nhật trạng thái hồ sơ.

Trạng thái hồ sơ dự kiến:

| Trạng thái | Mô tả |
|------------|-------|
| Đã nộp | Nhân viên đã gửi hồ sơ |
| Đang xem xét | HR đang kiểm tra hồ sơ |
| Đạt sơ tuyển | Hồ sơ đáp ứng yêu cầu sơ tuyển |
| Không đạt sơ tuyển | Hồ sơ không đáp ứng yêu cầu |
| Chờ phỏng vấn | Đang chờ tổ chức phỏng vấn |
| Đã phỏng vấn | Đã hoàn thành buổi phỏng vấn |
| Được lựa chọn | Nhân viên được lựa chọn cho vị trí |
| Không được lựa chọn | Nhân viên không được lựa chọn |
| Đã hoàn tất | Quy trình tuyển dụng đã kết thúc |

Trạng thái chính thức sẽ được thống nhất khi thiết kế nghiệp vụ và cơ sở dữ liệu.

 4.8. Quản lý lịch phỏng vấn

Hệ thống hỗ trợ nhân viên nhân sự tổ chức và theo dõi lịch phỏng vấn.

Thông tin lịch phỏng vấn:

- Mã lịch phỏng vấn.
- Ứng viên tham gia.
- Vị trí ứng tuyển.
- Ngày phỏng vấn.
- Giờ bắt đầu và kết thúc.
- Địa điểm hoặc hình thức phỏng vấn.
- Người phỏng vấn.
- Trạng thái lịch phỏng vấn.
- Ghi chú.

Chức năng:

- Tạo lịch phỏng vấn.
- Chỉnh sửa lịch phỏng vấn.
- Xem danh sách lịch phỏng vấn.
- Phân công người phỏng vấn.
- Cập nhật trạng thái lịch phỏng vấn.
- Thông báo lịch phỏng vấn đến người liên quan.

 4.9. Đánh giá kết quả phỏng vấn

Người phỏng vấn có thể ghi nhận kết quả và nhận xét đối với từng ứng viên được phân công.

Tiêu chí đánh giá dự kiến:

- Kiến thức chuyên môn.
- Kinh nghiệm làm việc.
- Kỹ năng giao tiếp.
- Kỹ năng giải quyết vấn đề.
- Mức độ đáp ứng yêu cầu vị trí.
- Các tiêu chí chuyên môn khác.

Chức năng:

- Ghi nhận nhận xét của người phỏng vấn.
- Lưu kết quả đánh giá.
- Xem lịch sử đánh giá theo quyền.
- Tổng hợp kết quả phỏng vấn.
- Hỗ trợ bộ phận nhân sự trong quá trình ra quyết định tuyển dụng.

 4.10. Quản lý kết quả tuyển dụng

Sau quá trình xét duyệt và phỏng vấn, người có thẩm quyền ghi nhận kết quả cuối cùng.

Chức năng:

- Cập nhật kết quả tuyển dụng.
- Xem danh sách nhân viên được lựa chọn.
- Xem danh sách nhân viên không được lựa chọn.
- Theo dõi trạng thái hoàn tất tuyển dụng.
- Ghi nhận thông tin điều chuyển nhân sự nếu được phê duyệt.

 4.11. Thống kê và báo cáo

Hệ thống hỗ trợ tổng hợp dữ liệu phục vụ công tác quản lý tuyển dụng.

Các chỉ tiêu thống kê dự kiến:

- Tổng số vị trí tuyển dụng.
- Tổng số yêu cầu tuyển dụng.
- Số lượng hồ sơ ứng tuyển.
- Số lượng hồ sơ đạt sơ tuyển.
- Số lượng nhân viên tham gia phỏng vấn.
- Số lượng nhân viên được lựa chọn.
- Kết quả tuyển dụng theo phòng ban.
- Kết quả tuyển dụng theo khoảng thời gian.

Dữ liệu thống kê có thể được hiển thị dưới dạng bảng hoặc biểu đồ.


 5. QUY TRÌNH HOẠT ĐỘNG CỦA HỆ THỐNG

Quy trình tuyển dụng nội bộ dự kiến gồm các bước sau:

 Bước 1: Xác định nhu cầu tuyển dụng

Quản lý phòng ban xác định nhu cầu bổ sung nhân sự và tạo yêu cầu tuyển dụng trên hệ thống.

 Bước 2: Xét duyệt yêu cầu

Người có thẩm quyền kiểm tra thông tin yêu cầu tuyển dụng và đưa ra quyết định phê duyệt hoặc từ chối.

 Bước 3: Công khai vị trí tuyển dụng

Bộ phận nhân sự tạo và công khai thông tin vị trí tuyển dụng nội bộ dựa trên yêu cầu đã được phê duyệt.

 Bước 4: Tiếp nhận hồ sơ

Nhân viên truy cập hệ thống, tìm kiếm vị trí phù hợp và gửi hồ sơ ứng tuyển.

 Bước 5: Sàng lọc hồ sơ

Bộ phận nhân sự xem xét hồ sơ và kiểm tra các điều kiện ứng tuyển theo yêu cầu của vị trí.

 Bước 6: Tổ chức phỏng vấn

Hệ thống hỗ trợ tạo lịch phỏng vấn, phân công người phỏng vấn và thông báo lịch đến các bên liên quan.

 Bước 7: Đánh giá ứng viên

Người phỏng vấn thực hiện đánh giá, ghi nhận nhận xét và cập nhật kết quả trên hệ thống.

 Bước 8: Xác nhận kết quả tuyển dụng

Bộ phận nhân sự và người có thẩm quyền tổng hợp kết quả, lựa chọn nhân sự và cập nhật trạng thái hồ sơ.

 Bước 9: Hoàn tất quy trình

Hệ thống ghi nhận kết quả cuối cùng, hỗ trợ thông báo cho nhân viên và lưu trữ thông tin phục vụ tra cứu, thống kê.

Sơ đồ quy trình tổng quát:

```text
Quản lý tạo yêu cầu tuyển dụng
               |
               v
       Xét duyệt yêu cầu
               |
               v
      Đăng vị trí tuyển dụng
               |
               v
       Nhân viên ứng tuyển
               |
               v
         Sàng lọc hồ sơ
               |
               v
        Tổ chức phỏng vấn
               |
               v
        Đánh giá ứng viên
               |
               v
     Xác nhận kết quả tuyển dụng
               |
               v
        Hoàn tất quy trình


 6. CÔNG NGHỆ SỬ DỤNG

Thông tin công nghệ sẽ được cập nhật theo quyết định của nhóm sau khi bàn bạc

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Đang cập nhật |
| Backend | Đang cập nhật |
| Cơ sở dữ liệu | Đang cập nhật |
| Công cụ lập trình | Visual Studio Code |
| Quản lý phiên bản | Git |
| Lưu trữ mã nguồn | GitHub |
| Quản lý công việc | Đang cập nhật |

 6.1. Frontend

Frontend đảm nhiệm việc xây dựng và hiển thị giao diện người dùng.

Các giao diện dự kiến bao gồm:

- Trang đăng nhập.
- Trang tổng quan.
- Trang quản lý tài khoản.
- Trang quản lý phòng ban.
- Trang quản lý vị trí tuyển dụng.
- Trang danh sách hồ sơ ứng tuyển.
- Trang quản lý lịch phỏng vấn.
- Trang đánh giá và kết quả tuyển dụng.
- Trang thống kê, báo cáo.

 6.2. Backend

Backend chịu trách nhiệm xử lý nghiệp vụ và cung cấp dữ liệu cho Frontend.

Các nhiệm vụ chính:

- Xử lý đăng nhập và xác thực.
- Kiểm tra quyền truy cập.
- Quản lý tài khoản và thông tin người dùng.
- Xử lý yêu cầu tuyển dụng.
- Quản lý vị trí tuyển dụng.
- Tiếp nhận và xử lý hồ sơ ứng tuyển.
- Quản lý lịch phỏng vấn.
- Lưu trữ kết quả đánh giá.
- Cung cấp dữ liệu thống kê.

 6.3. Cơ sở dữ liệu

Cơ sở dữ liệu được sử dụng để lưu trữ và quản lý các thông tin liên quan đến hoạt động tuyển dụng nội bộ.

Dữ liệu bao gồm thông tin tài khoản, nhân viên, phòng ban, vị trí tuyển dụng, hồ sơ ứng tuyển, lịch phỏng vấn và kết quả tuyển dụng.


 7. THIẾT KẾ CƠ SỞ DỮ LIỆU DỰ KIẾN

Các bảng dữ liệu dưới đây là phương án tham khảo để phục vụ quá trình phân tích và thiết kế hệ thống.

Tên bảng, tên cột và mối quan hệ sẽ được cập nhật theo mô hình cơ sở dữ liệu chính thức của nhóm.

| STT | Tên bảng | Chức năng |
|-----|----------|-----------|
| 1 | roles | Lưu thông tin vai trò người dùng |
| 2 | users | Quản lý tài khoản đăng nhập |
| 3 | departments | Quản lý thông tin phòng ban |
| 4 | employees | Quản lý thông tin nhân viên |
| 5 | positions | Quản lý danh mục vị trí công việc |
| 6 | recruitment_requests | Lưu yêu cầu tuyển dụng |
| 7 | job_postings | Quản lý các vị trí tuyển dụng được công khai |
| 8 | applications | Lưu hồ sơ ứng tuyển |
| 9 | interviews | Quản lý lịch phỏng vấn |
| 10 | interview_evaluations | Lưu kết quả đánh giá phỏng vấn |
| 11 | recruitment_results | Lưu kết quả tuyển dụng |
| 12 | notifications | Quản lý thông báo trong hệ thống |

 7.1. Một số mối quan hệ dự kiến

- Mỗi phòng ban có thể quản lý nhiều nhân viên.
- Mỗi phòng ban có thể tạo nhiều yêu cầu tuyển dụng.
- Một yêu cầu tuyển dụng có thể phát sinh một hoặc nhiều đợt đăng tuyển.
- Một vị trí tuyển dụng có thể nhận nhiều hồ sơ ứng tuyển.
- Một nhân viên có thể ứng tuyển nhiều vị trí khác nhau.
- Mỗi hồ sơ ứng tuyển có thể có nhiều vòng phỏng vấn.
- Một buổi phỏng vấn có thể có nhiều người đánh giá.

Cơ sở dữ liệu cần bảo đảm tính toàn vẹn dữ liệu, hạn chế trùng lặp thông tin và hỗ trợ kiểm soát quyền truy cập đối với dữ liệu nhân sự.

 8. CẤU TRÚC THƯ MỤC DỰ ÁN

Cấu trúc bên dưới là phương án tham khảo cho ứng dụng web có Frontend, Backend và cơ sở dữ liệu riêng biệt.

TTCS_T926_K5S6_N4/
|
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- layouts/
|   |   |-- services/
|   |   |-- assets/
|   |   `-- App.jsx
|   |
|   `-- package.json
|
|-- backend/
|   |-- app/
|   |   |-- routes/
|   |   |-- models/
|   |   |-- schemas/
|   |   |-- services/
|   |   `-- main.py
|   |
|   `-- requirements.txt
|
|-- database/
|   `-- schema.sql
|
|-- docs/
|   |-- requirements/
|   |-- diagrams/
|   `-- reports/
|
|-- .gitignore
`-- README.md
```

Lưu ý: Đây là cấu trúc minh họa, không phải cấu trúc thư mục đã được xác nhận trong repository. Cần thay thế bằng cấu trúc thực tế sau khi nhóm thống nhất công nghệ và khởi tạo mã nguồn.


 9. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN

 9.1. Yêu cầu môi trường
Các công cụ cần chuẩn bị:

- Git.
- Visual Studio Code hoặc công cụ lập trình tương đương.
- Môi trường chạy Frontend theo công nghệ được nhóm lựa chọn.
- Môi trường chạy Backend theo công nghệ được nhóm lựa chọn.
- Hệ quản trị cơ sở dữ liệu được nhóm thống nhất.

Phiên bản phần mềm và các thư viện cần thiết sẽ được bổ sung theo cấu hình thực tế.

 9.2. Tải mã nguồn từ GitHub

Mở Git Bash hoặc terminal và chạy:

```bash
git clone https://github.com/dtc245200413-cmyk/TTCS_T926_K5S6_N4.git
```

Di chuyển vào thư mục dự án:

```bash
cd TTCS_T926_K5S6_N4
```

Kiểm tra các file trong thư mục:

```bash
ls
```

 9.3. Cài đặt Frontend

Hướng dẫn cài đặt Frontend sẽ được cập nhật sau khi nhóm thống nhất công nghệ, cấu trúc thư mục và các thư viện sử dụng.

 9.4. Cài đặt Backend

Hướng dẫn cài đặt Backend, cấu hình môi trường và chạy máy chủ sẽ được bổ sung theo mã nguồn thực tế.

 9.5. Cấu hình cơ sở dữ liệu

Thông tin về hệ quản trị cơ sở dữ liệu, cách tạo database và cấu hình kết nối sẽ được cập nhật sau khi nhóm hoàn thành thiết kế cơ sở dữ liệu.

Không đưa mật khẩu, khóa API hoặc thông tin kết nối bí mật vào repository.

 9.6. Khởi chạy hệ thống

Các lệnh chạy Frontend, Backend và địa chỉ truy cập ứng dụng sẽ được cập nhật khi hệ thống có phiên bản chạy thử.

---

 10. QUY TRÌNH LÀM VIỆC NHÓM VỚI GIT VÀ GITHUB

 10.1. Nguyên tắc làm việc

Để hạn chế xung đột mã nguồn, mỗi thành viên nên thực hiện nhiệm vụ trên một nhánh làm việc riêng.

Các thay đổi cần được kiểm tra trước khi hợp nhất vào nhánh chính.

Quy trình làm việc đề xuất:

1. Nhận nhiệm vụ từ nhóm trưởng.
2. Đồng bộ mã nguồn mới nhất.
3. Tạo hoặc chuyển sang nhánh được phân công.
4. Thực hiện nhiệm vụ.
5. Kiểm tra nội dung đã thay đổi.
6. Tạo commit với nội dung rõ ràng.
7. Đẩy nhánh lên GitHub.
8. Tạo Pull Request.
9. Nhóm trưởng hoặc thành viên phụ trách kiểm tra.
10. Hợp nhất thay đổi sau khi được chấp thuận.

 10.2. Quy ước đặt tên nhánh

Các tên nhánh dưới đây là ví dụ đề xuất:

| Tên nhánh | Mục đích |
|-----------|----------|
| main | Nhánh chính của dự án |
| docs/readme | Viết và cập nhật README.md |
| feature/frontend | Phát triển giao diện |
| feature/backend | Phát triển Backend |
| feature/database | Phát triển cơ sở dữ liệu |
| fix/bug-name | Sửa lỗi cụ thể |

Các thành viên cần tuân thủ quy ước tên nhánh được nhóm trưởng thống nhất.

 10.3. Quy ước commit

Nội dung commit cần ngắn gọn và mô tả chính xác những thay đổi đã thực hiện.

Ví dụ:

```text
docs: update project README
feat: add login page
feat: add recruitment management API
fix: resolve login validation error
style: improve dashboard layout
```

 10.4. Quy trình tạo Pull Request

Sau khi hoàn thành nhiệm vụ trên nhánh riêng:

1. Đẩy các commit lên GitHub.
2. Mở repository của nhóm.
3. Chọn tab Pull requests.
4. Tạo Pull Request từ nhánh làm việc vào nhánh đích do nhóm quy định.
5. Nhập tiêu đề và mô tả những thay đổi.
6. Gửi Pull Request để nhóm trưởng kiểm tra.
7. Chỉnh sửa theo góp ý nếu cần.
8. Chờ xác nhận trước khi hợp nhất mã nguồn.


 11. YÊU CẦU BẢO MẬT VÀ QUẢN LÝ DỮ LIỆU

Do hệ thống quản lý thông tin nhân sự và hồ sơ ứng tuyển, việc bảo vệ dữ liệu là một yêu cầu quan trọng.

Các yêu cầu bảo mật dự kiến bao gồm:

- Xác thực người dùng trước khi truy cập hệ thống.
- Kiểm tra quyền truy cập đối với từng chức năng.
- Không lưu mật khẩu người dùng dưới dạng văn bản thuần.
- Bảo vệ thông tin cá nhân của nhân viên.
- Giới hạn quyền xem hồ sơ và kết quả đánh giá.
- Kiểm tra dữ liệu đầu vào.
- Kiểm soát quyền tải lên và truy cập tài liệu.
- Không đưa thông tin bí mật vào mã nguồn công khai.
- Hạn chế sử dụng dữ liệu nhân sự thật trong môi trường phát triển và kiểm thử.
- Lưu vết những thay đổi quan trọng khi nghiệp vụ yêu cầu.


 12. KẾ HOẠCH PHÁT TRIỂN DỰ ÁN

 Giai đoạn 1: Khảo sát và phân tích yêu cầu

- Tìm hiểu quy trình tuyển dụng nội bộ.
- Xác định đối tượng sử dụng.
- Phân tích yêu cầu chức năng.
- Phân tích yêu cầu phi chức năng.
- Xây dựng sơ đồ Use Case.
- Thiết kế quy trình nghiệp vụ.

 Giai đoạn 2: Thiết kế hệ thống

- Thiết kế giao diện người dùng.
- Xây dựng sơ đồ cơ sở dữ liệu.
- Xác định các bảng dữ liệu và mối quan hệ.
- Thiết kế kiến trúc hệ thống.
- Thiết kế API và cơ chế phân quyền.

 Giai đoạn 3: Xây dựng hệ thống

- Phát triển Frontend.
- Phát triển Backend.
- Xây dựng cơ sở dữ liệu.
- Triển khai các chức năng quản lý tuyển dụng.
- Kết nối Frontend với Backend.
- Kiểm tra hoạt động của các chức năng.

 Giai đoạn 4: Kiểm thử và hoàn thiện

- Kiểm thử các chức năng.
- Kiểm thử phân quyền.
- Kiểm tra tính chính xác của dữ liệu.
- Sửa lỗi phát sinh.
- Hoàn thiện giao diện.
- Hoàn thiện tài liệu hướng dẫn.
- Chuẩn bị báo cáo và trình bày sản phẩm.


 13. KIỂM THỬ HỆ THỐNG

Các nội dung kiểm thử dự kiến:

| STT | Nội dung kiểm thử | Kết quả mong đợi |
|-----|-------------------|------------------|
| 1 | Đăng nhập hợp lệ | Người dùng đăng nhập thành công |
| 2 | Đăng nhập sai mật khẩu | Hệ thống từ chối đăng nhập |
| 3 | Truy cập chức năng không có quyền | Hệ thống từ chối truy cập |
| 4 | Tạo yêu cầu tuyển dụng hợp lệ | Yêu cầu được lưu thành công |
| 5 | Tạo vị trí tuyển dụng hợp lệ | Vị trí được lưu thành công |
| 6 | Nhân viên gửi hồ sơ ứng tuyển | Hồ sơ được tiếp nhận |
| 7 | Gửi hồ sơ trùng cho cùng đợt tuyển dụng | Hệ thống xử lý theo quy tắc nghiệp vụ |
| 8 | Tạo lịch phỏng vấn hợp lệ | Lịch phỏng vấn được lưu thành công |
| 9 | Cập nhật kết quả đánh giá | Kết quả được lưu theo đúng quyền |
| 10 | Xem kết quả ứng tuyển | Nhân viên chỉ xem được kết quả của mình |
| 11 | Xem thống kê tuyển dụng | Dữ liệu được tổng hợp chính xác |

Bảng trên là danh sách kiểm thử dự kiến, không phải kết quả kiểm thử đã thực hiện.



 14. HƯỚNG PHÁT TRIỂN

Trong các giai đoạn tiếp theo, hệ thống có thể được mở rộng với những chức năng như:

- Gửi thông báo tự động qua email.
- Tích hợp lịch phỏng vấn với lịch làm việc.
- Hỗ trợ tìm kiếm hồ sơ theo kỹ năng và kinh nghiệm.
- Xây dựng hệ thống gợi ý vị trí nội bộ phù hợp.
- Tự động tổng hợp dữ liệu tuyển dụng.
- Tích hợp với hệ thống quản lý nhân sự của doanh nghiệp.
- Hỗ trợ quy trình phê duyệt và điều chuyển nhân sự.
- Phát triển giao diện tương thích với thiết bị di động.

Các chức năng mở rộng chỉ được triển khai khi phù hợp với phạm vi, thời gian và nguồn lực của nhóm.

---

 15. THÔNG TIN NHÓM THỰC HIỆN

Tên nhóm: Nhóm 2

Tên đề tài: Hệ thống tuyển dụng nội bộ

Repository: [TTCS_T926_K5S6_N4](https://github.com/dtc245200413-cmyk/TTCS_T926_K5S6_N4)

 Danh sách thành viên

| STT | Họ và tên | Vai trò | Công việc phụ trách |
|-----|-----------|---------|---------------------|
| 1 | Đang cập nhật | Nhóm trưởng | Quản lý và điều phối dự án |
| 2 | Đang cập nhật | Thành viên | Đang cập nhật |
| 3 | Đang cập nhật | Thành viên | Đang cập nhật |
| 4 | Đang cập nhật | Thành viên | Đang cập nhật |

Danh sách thành viên, vai trò và phân công nhiệm vụ sẽ được cập nhật theo thông tin chính thức của nhóm.


 16. TRẠNG THÁI PHÁT TRIỂN

Dự án hiện đang trong quá trình phát triển.

Các chức năng, công nghệ, tài liệu kỹ thuật và hướng dẫn cài đặt sẽ tiếp tục được cập nhật theo tiến độ thực hiện của nhóm.



Nhóm 2 - Hệ thống tuyển dụng nội bộ
