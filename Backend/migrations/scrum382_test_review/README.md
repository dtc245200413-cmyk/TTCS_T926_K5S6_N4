# SCRUM-382 — bộ migration TEST để review, Giai đoạn 5.2C

**Chưa được thực thi.** Chỉ dành cho internal_recruitment_test / MySQL 8.0.46 đã
kiểm kê ở 5.2B. Không được chạy nguyên thư mục, không có runner tự động, không
đăng ký startup. File .sql.review là tài liệu DDL chờ phê duyệt, không phải cờ mở
tính năng. Không dùng catalogue scrum382_offer_drafts.sql.draft cũ để triển khai.

Bằng chứng đầu vào: D:/scrum61/.scrum103-verification/phase5-2b/SCHEMA-INVENTORY.md.
45 bảng InnoDB; Offer/application/request/posting đều 0 dòng; candidates 6 dòng;
4/6 phòng ban thiếu manager. Cần kiểm kê lại trước khi áp dụng: số liệu 5.2B không
phải snapshot khóa database. Không tạo application, manager, assignment hay PASSED giả.

## Thứ tự file và người sở hữu

| Thứ tự | File | Nội dung / chủ sở hữu |
|---|---|---|
| 0 | 000_preflight.sql.review | Read-only; kiểm tra đích, quyền, schema, unique, orphan, số lượng |
| 1 | 005_application_code.sql.review | Dependency Candidate Portal/Application: VARCHAR(50) NULL + UNIQUE, không backfill |
| 2 | 010_hiring_decisions.sql.review | Bảng quyết định chuyên biệt, 2 unique, 5 FK; phối hợp chủ decision writer |
| 3 | 020_offer_columns.sql.review | 21 cột mới, unique offer_code, 7 FK; SCRUM-382 |
| 4 | 030_offer_approvals.sql.review | Bảng lịch sử duyệt tương thích SCRUM-390/391; 2 FK |
| 5 | 040_submissions_assignments.sql.review | Hai CREATE riêng: history rồi assignment; 5 FK, 3 unique |
| 6 | 050_postflight.sql.review | Read-only kiểm kê cấu trúc, dữ liệu và projection Portal |
| Ngoài chuỗi chính | optional/090_evaluation_summary.sql.review | Chỉ chủ candidateEvaluation xác nhận áp dụng; không cần cho eligibility mới |

Mỗi file DDL bắt đầu bằng SELECT nhận diện database/account. **SELECT không tự
ngăn các câu sau chạy**: người vận hành phải chạy và kiểm tra phần nhận diện
trước khi cho phép từng DDL. Các đối tượng được ghi rõ internal_recruitment_test
để không phụ thuộc database mặc định. Không dùng --force, wildcard execution hay
bỏ qua lỗi. Không chạy trên schema khác rồi tự thay tên database.

## Điều kiện dừng / chạy lại sau lỗi

- Database không đúng, tài khoản không phải account TEST đã được duyệt, phiên bản,
  strict mode/FK checks/engine/kiểu parent key khác inventory: dừng.
- Thiếu bảng cha/cột dùng trong SQL hoặc FK target không signed INT PRIMARY: dừng.
- Có bất kỳ bảng mới/cột mới/constraint mới ngoài dự kiến: dừng để kiểm kê và lập
  kế hoạch resume, không dùng IF NOT EXISTS để che schema khác.
- Step 005: chỉ bỏ qua khi column VARCHAR(50) NULL/default NULL và exact
  UNIQUE(application_code) đã được xác nhận; nếu tồn tại một phần phải review.
- Step 020: một ALTER thêm đủ cột/index/FK. Không tự phân tách hoặc rerun khi lỗi;
  kiểm tra SHOW CREATE TABLE trước, ghi lại trạng thái và xin review phần còn lại.
- Step 040 có hai CREATE riêng; nếu CREATE thứ hai lỗi thì bảng thứ nhất có thể
  đã commit. Không DROP bảng đầu hay chạy lại cả file.
- Không đưa DDL vào transaction với giả định ROLLBACK hoàn tác toàn bộ; không có
  down-migration phá dữ liệu. Phục hồi bằng backup đã thử, theo phê duyệt riêng.

## Schema nguồn phải giữ nguyên

candidate_offers có đúng 11 cột sau. Không MODIFY/DELETE/backfill cột nào:

| Cột | Kiểu | Nullable / default |
|---|---|---|
| id | INT AUTO_INCREMENT PRIMARY KEY | NOT NULL |
| application_id | INT, UNIQUE hiện có tên application_id | NOT NULL, không default |
| salary_amount | DECIMAL(15,2) | NULL |
| currency | VARCHAR(10) | NOT NULL / VND |
| start_date | DATE | NULL |
| response_deadline | DATE | NULL |
| message | TEXT | NULL |
| status | VARCHAR(30), index idx_candidate_offer_status | NOT NULL / PENDING_RESPONSE |
| candidate_response | TEXT | NULL |
| responded_at | DATETIME | NULL |
| created_at | TIMESTAMP | NULL / CURRENT_TIMESTAMP |

Step 020 chỉ thêm 21 cột, không thêm uq_co_application vì UNIQUE đã có. Status là
VARCHAR nên đã chứa được DRAFT/CHANGE_REQUESTED/PENDING_APPROVAL; không cần ENUM
mới hoặc đổi default. insertDraft luôn ghi DRAFT rõ ràng; submission đổi trạng thái
trong transaction. Dữ liệu Portal cũ không được chuyển trạng thái.

Các content field position_id/job_title/basic_salary/expected_start_date thêm mới
được NULL; response_deadline đã NULL. Currency vẫn bắt buộc. Creator/identity mới
nullable nhằm giữ legacy, nhưng writer phải có bằng chứng mapping và quyền.

row_version BIGINT UNSIGNED NOT NULL DEFAULT 1 là phiên bản kỹ thuật, không dựng
lịch sử trước migration. updated_at thêm mới sẽ mang thời điểm kỹ thuật, không được
diễn giải thành thời điểm thay đổi Offer cũ. Snapshot backup phải phân biệt metadata
mới với nội dung legacy cần giữ nguyên.

Candidate hiring decisions: default validity_status=UNVERIFIED, không mặc định
PASSED; application nullable dành cho dữ liệu chưa xác minh nhưng reader không
chấp nhận NULL. Giữ unique(candidate_id,recruitment_request_id) tương thích schema
nguồn và unique(application_id). Điều này chặn nhiều application cùng candidate/
request: không gỡ unique hoặc rebind quyết định để vượt chặn.

19 FK trong năm bảng Offer/decision/history/assignment: 5 + 7 + 2 + 2 + 3.
Child INT khớp parent INT signed; assignment.submission_id khớp BIGINT UNSIGNED.
Các FK mới RESTRICT ngoại trừ offer_approvals.offer_id CASCADE giữ nguyên hợp đồng
database.sql của đồng đội. Cần chủ SCRUM-390/391 review chính sách lưu lịch sử:
xóa Offer có thể xóa approval history. Không tự đổi sang RESTRICT trong giai đoạn này.
Bảng submissions/assignments bảo toàn lịch sử bằng RESTRICT.

## Eligibility: nguồn quyết định và dependency được tách

Trước 5.2C, readEligibilityApplications SELECT:
- a.application_code: mã hiển thị/tra cứu, không phải khóa nghiệp vụ.
- c.interview_decision, c.interview_decision_by, c.interview_decision_at:
  summary theo candidate, không chứng minh quyết định theo application.
- c.recruitment_request_id: cũng không chứng minh application binding.

Sau thay đổi repository:
- Giữ a.application_code và step 005 chuẩn hóa cột theo định nghĩa đang có trong
  schemaMigrations.js; không mang theo UPDATE/backfill của startup.
- LEFT JOIN candidate_hiring_decisions theo application_id + candidate_id +
  recruitment_request_id + department_id; chỉ chiếu decision nếu CURRENT,
  revoked_at IS NULL và superseded_at IS NULL.
- interview_decision/by/at và candidate_request_id trong DTO nội bộ là ALIAS của
  bảng quyết định chuyên biệt; không còn SELECT c.interview_decision*.
- Không thêm các summary columns vào chuỗi migration Offer. Optional 090 dành
  riêng cho Evaluation recordDecision/display và cần chủ module chấp thuận.
- Service tiếp tục trả eligible=false/can_create=false, kể cả có PASSED/current.
  Các reason_code cũ được giữ; DECISION_APPLICATION_UNVERIFIED còn đại diện cho
  việc chưa hoàn thiện toàn bộ bằng chứng thẩm quyền. Không suy ra quyền từ metadata.
- Thiếu decision table hoặc application_code vẫn trả dependency 503 an toàn.
- verifyDecisionAuthority và resolveSubmissionAssignments vẫn là port 503. Khi
  chủ module cung cấp nguồn bằng chứng thật, mới review tích hợp verifier vào
  eligibility và write flow; không lấy assigned approver từ role hoặc offer_approvals.

Optional 090 không sửa candidates.status, không tạo interview tables, không gán
manager và không mở pendingCandidateEvaluationMigrations. Evaluation hiện còn
thiếu các dependency đó; summary DDL riêng không có nghĩa module đã chạy được.

## Đối chiếu persistence

| Hàm | Hợp đồng schema đích / kiểm thử |
|---|---|
| loadApplicationForUpdate | Application thực, posting/request khớp; recruiter chính khi tạo, creator/department scope khi sửa; FOR UPDATE |
| loadCatalog | job_positions qua recruitment_requests.position_id; department/position ACTIVE |
| loadDecision | Đúng 4 khóa application/candidate/request/department; CURRENT, không revoked/superseded; authority verifier chưa triển khai |
| findEffectiveOffers | Tất cả trạng thái đều chặn Offer thứ hai, UNIQUE(application_id) là lớp bảo vệ cuối |
| insertDraft | 32 cột đích đáp ứng SQL; DRAFT rõ ràng, row_version=1; dual-write salary/start; đọc lại row thật |
| updateDraftIfEditable | WHERE id + scope + DRAFT/CHANGE_REQUESTED + version; tăng version; chỉ mirror trường được sửa |
| submitIfEditable | Khóa Offer ở service, đổi PENDING_APPROVAL và tăng version |
| recordSubmission | Unique số lần gửi và version; snapshot JSON; assignment cụ thể trong cùng transaction |
| loadOfferById | Có offer_approvals cho lịch sử trả về; không đổi service duyệt |
| Candidate Portal | Legacy cột giữ nguyên; chỉ PENDING_RESPONSE/ACCEPTED/DECLINED |

Không thấy cần đổi SQL ghi trong 5.2C. Đã sửa SQL đọc eligibility để khớp nguồn
application-specific. MySQL driver, validator và transaction wrapper không đổi.
Ứng dụng vẫn có lock order khác nhau giữa create và edit/submit: deadlock được
rollback, trả 409; cần kiểm thử MySQL hai connection trước khi kích hoạt.

Đây là đối chiếu schema/static tests và mock tests, không phải bằng chứng DDL đã
chạy hoặc InnoDB locking/FK/JSON đã được integration-test.

## Checklist TEST trước mọi thao tác ghi

1. Người dùng duyệt bộ DDL, thứ tự, step 005 và FK retention của step 030. Chốt
   có áp dụng optional 090 hay không (mặc định KHÔNG).
2. Không chạy Backend server.js/npm start/dev, seed, sync_database.js hoặc import
   database.sql. Giữ gate 503; dùng công cụ riêng không import app/database config.
3. Chuẩn bị account migration riêng, giới hạn object trên internal_recruitment_test;
   không root, không tăng quyền scrum103_reader. DBA review SELECT để kiểm tra,
   CREATE cho 4 bảng mới, ALTER/CREATE/INSERT cho ALTER các bảng được duyệt và
   REFERENCES trên đúng parent. Không cần global privilege/GRANT OPTION/DROP.
   INSERT có thể là quyền MySQL yêu cầu cho ALTER, không cho phép chạy DML ngoài kế
   hoạch. Thu hồi quyền tạm thời sau cửa sổ triển khai. Không cấp quyền trong lượt này.
   Nguồn: [ALTER TABLE privileges](https://dev.mysql.com/doc/refman/8.0/en/alter-table.html),
   [FK privileges](https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html).
4. Account backup riêng được duyệt đủ quyền cho tables/views/triggers/routines/
   events. Backup toàn internal_recruitment_test, không --all-databases. InnoDB:
   cân nhắc single-transaction/quick/no-tablespaces/set-gtid-purged=OFF; không có
   DDL đồng thời. Dùng result-file tránh encoding redirect PowerShell, lưu ngoài
   Git với quyền truy cập hạn chế, kiểm tra exit code/SHA-256/log không in dữ liệu.
5. Restore thử vào instance TEST cô lập được duyệt. So schema, rows, unique/FK,
   trigger/routine/event. Chưa restore thành công thì không migration.
6. Chạy 000, xem kết quả và lưu baseline cục bộ bảo mật. Các số liệu 0 ở inventory
   không phải lý do bỏ orphan/duplicate checks. Nếu có dữ liệu mới, review lại.
7. Chạy từng bước 005–040 sau phê duyệt, kiểm tra SHOW CREATE TABLE sau từng bước;
   kiểm kê constraint theo định nghĩa, không chỉ tên/count. Ghi journal bước thành
   công, lỗi và trạng thái; không tự vượt qua lỗi.
8. Chạy 050; đối chiếu counts và legacy values với backup đã restore. Counts bằng
   nhau chưa chứng minh nội dung không đổi; dùng phép so sánh đầy đủ trong môi
   trường TEST riêng, chỉ báo tổng số sai khác, không xuất dữ liệu cá nhân.
9. Được phê duyệt riêng mới chạy test ghi có kiểm soát: real application, PASSED
   theo đúng authority; thiếu/sai/revoked decision; unassigned recruiter; hai create
   đồng thời; stale If-Match; edit PENDING bị chặn; history/resubmit độc lập;
   assignment failure rollback; commit failure không notification; legacy Portal
   được đọc đúng, draft/private states không lộ; API duyệt còn nguyên hợp đồng.
   Không gỡ gate trên runtime để test; dùng harness riêng với credential TEST được
   kiểm soát và dependency verifier đã review, không tạo PASSED giả.
10. Nếu migration lỗi: giữ Backend dừng/gate đóng; kiểm kê phần đã commit, review
    resume từng phần hoặc restore backup đã thử trên TEST cô lập. Không giả định
    ROLLBACK, không dùng DROP/clean/blind rerun. Phục hồi và chuyển cấu hình TEST
    cần xác nhận riêng, không đổi .env chính.

Chưa bật ghi thật sau DDL: phải giải quyết decision writer/authority, assignment
resolver + approval authorization, notification theo assignment/lần gửi, đường
Evaluation tạo thẳng PENDING_RESPONSE và scope dữ liệu lương. Chưa sửa các module
đồng đội trong giai đoạn này.
