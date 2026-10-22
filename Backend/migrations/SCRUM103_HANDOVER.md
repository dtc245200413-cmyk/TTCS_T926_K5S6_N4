# SCRUM-103 — Bàn giao SCRUM-381 / SCRUM-382

Mốc kiểm tra: branch `feature/SCRUM-103-offer-draft-approval`, HEAD `432cd92`;
remote đã fetch `origin/develop2=a30d29a`. Working tree sạch đầu lượt.
Không merge, commit, push, chạy Backend startup hoặc migration. Không sửa `.env`.

## 1. Kết luận Acceptance Criteria

PASS logic/test không đồng nghĩa PASS nghiệp vụ trên MySQL. Chưa đủ điều kiện
nghiệm thu E2E. Ma trận chi tiết file/hàm ở `scrum103_final_acceptance_review.md`
vẫn áp dụng; kết quả kiểm thử mới trong tài liệu này thay thế số liệu cũ.

| AC | Code/test | Nghiệm thu thực tế |
| --- | --- | --- |
| PASSED có thẩm quyền, đúng Application | PASS các nhánh từ chối, mock PASSED tạo được; tái sử dụng Decision modules | BLOCKED: lifecycle/evaluation/authority chưa xác minh; eligibility production không trả true |
| Ứng viên, chức danh, phòng ban, lương, ngày nhận việc, hạn phản hồi | PASS form/validation/mapping trong test | PARTIAL: schema TEST chưa đủ |
| Tạo, lưu, sửa DRAFT và gửi duyệt | PASS HTTP + browser mock | PARTIAL: production Gate 503 giữ nguyên |
| Validation Frontend/Backend | PASS kiểm thử độc lập | PASS logic độc lập; chưa chứng minh toàn luồng thật |
| PENDING_APPROVAL khóa sửa | PASS HTTP submit/late PATCH/state/version | PARTIAL: ghi thật chưa bật |
| CHANGE_REQUESTED sửa/gửi lại đúng version | PASS HTTP + browser mock | PARTIAL: chuyển sang CHANGE_REQUESTED thật thuộc Approval chưa tích hợp |
| Không trùng Offer hiệu lực cùng Application | PASS duplicate/version/transaction tests; schema review giữ UNIQUE application_id | PARTIAL: chưa test cạnh tranh InnoDB; hiện chặn cả lịch sử Offer terminal để an toàn |
| Creator/timestamps/submit history | PASS service/repository SQL contract và HTTP fixture | PARTIAL: bảng submission/assignment chưa có trên TEST |

## 2. Đối chiếu PR #35 — không thay thế module an toàn hiện có

Remote: `a30d29a` merge PR #35; `d817a06` resolve conflicts;
`8487a6e` triển khai Approval/response.

- Remote `offerService.checkCanApprove` dùng role ADMIN/APPROVER/HR_MANAGER/DIRECTOR
  hoặc permission OFFER_APPROVE, không kiểm tra assignment của submission.
- `listOffers/getOfferDetail` gọi repository không áp dụng phạm vi Recruiter/HR
  hiện có. Không lấy code này vì có dữ liệu lương.
- `approveOffer/rejectOffer/requestChangeOffer` cập nhật Offer, ghi approval và
  audit bằng các lệnh pool riêng; thiếu transaction chung và kiểm tra row_version.
- `offerRepository.updateOfferStatus` chỉ WHERE id, không có version/state/assignment
  predicate. Không được dùng trực tiếp cho luồng SCRUM-103.
- Remote routes không có create/PATCH/submit/eligibility của SCRUM-103;
  thay toàn bộ sẽ làm mất các API đang có. Không sao chép router/controller/service.
- Remote thêm publish/onboarding và Portal SENT/EXPIRED ngoài hợp đồng hiện tại.
  Không thêm trạng thái hoặc phát hành ngoài phạm vi. Giữ Portal hiện tại
  PENDING_RESPONSE/ACCEPTED/DECLINED và ownership filtering.
- Hợp đồng tương thích có thể giữ là status PENDING_APPROVAL/APPROVED/REJECTED/
  CHANGE_REQUESTED, action REQUEST_CHANGE và các đường approve/reject/request-change.
  Nhánh SCRUM-103 đã có chúng; không cần tạo module hay endpoint trùng.

**Không có code PR #35 được chép vào nhánh:** các phần tương thích đã tồn tại,
các phần mới cần hợp đồng assignment và transaction trước khi tích hợp.
`getApprovalScope` tiếp tục 403. Test API khẳng định ADMIN/APPROVER/DIRECTOR không
được duyệt chỉ nhờ role. Chưa có positive test người được phân công duyệt thành công
vì chưa có implementation/quan hệ được xác minh; không fake authorization để báo PASS.

## 3. Phần sửa và kiểm thử mới

| File | Thay đổi |
| --- | --- |
| `Frontend/src/pages/offers/OfferList.jsx` | Chỉ báo submit thành công khi success=true, đúng ID và status=PENDING_APPROVAL. Bỏ khẳng định người duyệt đã nhận thông báo vì delivery diễn ra sau commit và có thể lỗi. |
| `Frontend/offer-routes.test.cjs` | Thêm ba trường hợp HTTP 200 nhưng success=false, sai ID, sai trạng thái; UI phải báo lỗi. |
| `Backend/src/routes/offerWorkflowApi.test.js` | 14 test HTTP với route/auth/controller/service/validation/transaction wrapper thật; mock persistence và các dependency ngoài. Không mock service để giả thành công. |
| `Backend/migrations/SCRUM103_HANDOVER.md` | Tài liệu bàn giao này. |

API tests dùng Jest + Express test app + native fetch theo convention sẵn có,
không cài thêm Supertest. App test chỉ mount router, không import `app.js/server.js`,
không chạy startup migration/job. Toàn bộ mock nằm trong `.test.js`.

HTTP workflow kiểm tra POST DRAFT → PATCH If-Match → submit phiên bản mới → khóa
PATCH → fixture chuyển CHANGE_REQUESTED → PATCH → submit lại; history/version và
creator được giữ. Fixture CHANGE_REQUESTED mô phỏng đầu vào từ module Approval,
không chứng minh đã gọi Approval thành công. Có FAILED/thiếu proof/sai application,
duplicate, stale version, validation, rollback khi insert/update/history/commit lỗi,
production gate và role-only approval denial.

Các SQL thực tế/timestamps/assignment snapshots được test riêng trong
`offerPersistence.test.js`; HTTP fixture không được coi là bằng chứng SQL/MySQL.
Eligibility positive production vẫn chưa có; không thêm đường tắt để test bật thật.

## 4. Kết quả và lệnh chạy lại

Từ `Backend`:

```powershell
node node_modules/jest/bin/jest.js --runInBand --testPathPatterns='offer|candidatePortal|candidateEvaluation|notification|app.cors' --setupFilesAfterEnv D:/scrum61/.scrum103-verification/no-mysql.cjs --silent
```

Kết quả: **24 suite, 479 PASS, 0 FAIL**, gồm 14 HTTP tests mới.
Guard ngoài repo chặn mọi kết nối MySQL không mock; khi chuyển máy cần cung cấp
guard tương đương trước khi chạy. Không chạy toàn bộ Backend và không khẳng định
lại baseline lỗi của các module không liên quan.

Từ `Frontend`:

```powershell
npm.cmd run test:offers
npm.cmd run test:offer-routes
```

Offer Form: **44 PASS, 0 FAIL**. Script route gồm `npm run build` và browser smoke.
Route/build lượt đầu: 22 PASS và build PASS; lượt cuối: **25 PASS, 0 FAIL**, gồm ba
tình huống phản hồi submit không hợp lệ; build PASS. Build cảnh báo bundle >500 kB.
Các route hiện có giữ nguyên, 66 route không trùng. Test browser dùng HTTP interception,
không kết nối backend hoặc database thật. Tối đa hai vòng, không lặp sửa/test vô hạn.

## 5. Kiểm tra môi trường thật — chỉ READ-ONLY

Đã kết nối bằng **chỉ** TEST_DB_* từ `Backend/.env.test.local`; không fallback `.env`.
Xác minh CURRENT_USER()=`scrum103_reader@localhost`, DATABASE()=`internal_recruitment_test`.
SHOW GRANTS được kiểm tra trước kiểm kê: chỉ USAGE và SELECT/SHOW VIEW.
Không in password, không đọc dữ liệu cá nhân, không dùng tài khoản ghi.

Kết quả schema/count thực tế:

- candidate_applications: 9 cột, 0 bản ghi; chưa có application_code hoặc lifecycle version.
- candidate_offers: 11 cột legacy, 0 bản ghi; chưa có row_version/created_by và các cột mới.
- interview_schedules: 13 cột, 4 bản ghi; chưa có liên kết application_id.
- Chưa có candidate_hiring_decisions, offer_approvals, offer_submissions,
  offer_submission_assignments, interview_evaluations trong schema TEST được kiểm tra.

Đây là xác minh metadata và số lượng tổng hợp, **không phải E2E MySQL PASS**.
Không chạy DDL/DML, migration, seed hoặc test ghi thật. Review migrations chỉ là
đề xuất, không được coi là schema đã triển khai.

## 6. Phạm vi có thể bàn giao và việc tối thiểu còn lại

**SCRUM-381:** bàn giao form tạo/sửa, draft/required validation, eligibility gating,
If-Match PATCH/submit, trạng thái chỉ đọc, lý do yêu cầu sửa, lỗi API và chống click
trùng; OfferList xác nhận response trước báo thành công. Browser tests đã PASS với mock.

**SCRUM-382:** bàn giao route/controller/service, validation, scope, concurrency,
SQL persistence có gate, creator metadata, history/assignment contract, transaction
và test HTTP/SQL mock. Decision modules hiện có được tái sử dụng không viết lại.
Chưa bàn giao như tính năng ghi database đã hoạt động.

| Chủ module | Điều kiện còn cần xác nhận |
| --- | --- |
| Application | Lifecycle hợp lệ cho từng application và cơ chế version, không dùng trạng thái candidate áp cho mọi hồ sơ. |
| Evaluation/Decision | Quan hệ evaluation–application đáng tin cậy, completion/revocation và verifyLifecycle/verifyEvaluation; authority replay của quyết định. |
| Approval SCRUM-390/391 | Assignment theo submission/version; kiểm tra người thực hiện thật, transaction state/history/audit, tăng row_version khi yêu cầu sửa; phối hợp positive approval API test. |
| Notification | Định danh theo Offer/lần gửi và delivery retry/outbox; không coi notification là bằng chứng assignment. |
| Database | Review backup/restore và migration tăng dần trên TEST, xác minh UNIQUE/FK, khóa và rollback thật khi được phép; không mở gate trước các bước này. |
| Nhóm tích hợp Evaluation | Thống nhất xử lý API tạo Offer trực tiếp PENDING_RESPONSE để không bỏ qua duyệt. |

Sau khi chốt và triển khai dependency: kiểm thử TEST có dữ liệu hợp lệ do module
nguồn tạo, chứng minh PASSED → DRAFT → submit → assignment-authorized approval/
request-change → resubmit; kiểm tra cạnh tranh, history, Portal và dữ liệu riêng tư.
Chỉ sau review đó mới cho phép mở Gate 503/403. Không có claim hoàn thành E2E trong bàn giao này.
