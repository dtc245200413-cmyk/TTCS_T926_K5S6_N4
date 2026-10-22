# SCRUM-103 — Migration bàn giao vào PR #36 (REVIEW ONLY)

**Đây là bộ DDL đã PASS trên bản sao MySQL cô lập `internal_recruitment_scrum103_trial` (9/9 SQL), KHÔNG phải bằng chứng sẵn sàng triển khai chính thức.**

## Phạm vi

- `sql/005_application_code.sql`
- `sql/010_hiring_decisions.sql`
- `sql/020_offer_columns.sql`
- `sql/030_offer_approvals.sql`
- `sql/040_offer_submissions.sql`
- `sql/045_offer_submission_assignments.sql`
- `sql/060_offer_approval_mandates.sql`
- `sql/070_offer_approval_outbox.sql`
- `sql/080_candidate_onboardings.sql`

Không có INSERT/UPDATE/DELETE dữ liệu mẫu; SQL nhắm rõ `internal_recruitment_test` và **không được kích hoạt khi chạy Backend**. Bản migration dành cho trạng thái schema cũ đã đo đạc tại ngày 22/10/2026: 45 bảng, 11 cột candidate_offers, 0 Offer, 0 application. Không hỗ trợ chạy lặp trên DB đã migrate hoặc database với lược đồ khác.

## Quy trình triển khai đã kiểm chứng trên trial

1. Dừng mọi tiến trình có nguy cơ tự chạy migration hoặc ghi thay đổi vào DB mục tiêu; đối chiếu file `.env` và connection string chính xác của **từng thành viên**.
2. DBA/chủ DB kiểm tra, phê duyệt chính xác schema, FKs, chính sách ON DELETE, kiểu dữ liệu và dữ liệu hiện hữu.
3. Backup DB mục tiêu và **restore thử** sang schema độc lập; kiểm tra count và quyền. Không commit/chia sẻ dump vì chứa dữ liệu cá nhân.
4. Chạy preflight chỉ-đọc trên bản sao. Nếu có issue (cột/bảng đã tồn tại, sai FK, Offer cũ có dữ liệu, SQL mode không STRICT) thì dừng để lập migration riêng.
5. Chạy đúng thứ tự 9 file SQL **chỉ trên bản sao**. MySQL DDL implicit commit; nếu lỗi ở giữa, không rerun từ đầu. Chạy postflight và kiểm tra schema.
6. Thử nghiệm HTTP với người dùng có quyền trên bản sao có **hồ sơ và bằng chứng quy trình thực**: Recruiter tạo Draft → manager phân công approver → submit → assigned approver decide-atomic → publish → candidate nhận/phản hồi → onboarding; thử 403/409/rollback/đồng thời. 5/5 suite unit/build không thay cho thử nghiệm này.
7. Chỉ sau khi E2E, chính sách phân quyền và tác động các module khác được duyệt, tạo kế hoạch apply vào database dùng chung, có maintenance window, phương án phục hồi và xác nhận của DBA. **Không có script nào trong gói này tự apply lên DB chung**.

## Lỗi phụ thuộc khác chưa giải quyết

- Preflight gốc cảnh báo cột `candidates.current_stage` chưa có, trong khi CandidateRepository sử dụng cột này; cần migration dữ liệu ứng viên **riêng** và kiểm chứng trạng thái cũ, không tự chuyển ứng viên hiện hữu sang `NEW`.
- Dữ liệu nguồn có 0 application và 0 Offer; không thể chứng minh full E2E mà không tạo workflow test hợp lệ trên DB cô lập.
- Trên DB chưa migrate, Offer trả 503 có chủ đích; kéo code **không** đồng nghĩa database được nâng cấp.
- Outbox tạo bản ghi chờ gửi, không có nghĩa thông báo đã đến tay người dùng; cần xác nhận worker/đường hiển thị.
- `APPROVER` chỉ được duyệt khi có mandate/assignment được xác minh trên DB, không chỉ dựa trên role.

## Kiểm tra trước và sau schema (nếu đang dùng cấu hình đúng với bộ script)

`tools/PREFLIGHT_READONLY.cjs` và `tools/POSTFLIGHT_READONLY.cjs` là các script kiểm tra chỉ đọc. Hiện script chủ động chỉ cho phép `internal_recruitment_test` hoặc `internal_recruitment_scrum103_trial`; cần kiểm tra và viết phiên bản phù hợp nếu nhóm dùng tên/schema khác. Chúng yêu cầu MySQL 8, file `.env` gốc thuộc `internal_recruitment_test`, và đường dẫn đến Backend trong đối số `--backend`, `--env-from`. Không chạy `server.js`/`schemaMigrations.js` bản cũ trên DB nhóm để tạo dữ liệu mẫu.

Ví dụ lệnh xuất SQL đã định danh (chỉ tạo file):

```powershell
cd Backend/migrations/scrum103_release_review_20261023
./GENERATE_TARGET_SQL.ps1 -Target internal_recruitment_scrum103_trial
```

Muốn nghiệm thu cuối: migration **và** full real HTTP/MySQL E2E **và** CI/branch review; PR #36 không được đánh dấu complete chỉ từ static tests.
