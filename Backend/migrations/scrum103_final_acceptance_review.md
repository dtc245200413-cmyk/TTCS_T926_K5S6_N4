# SCRUM-103 — Final acceptance review

Kiểm toán tại branch `feature/SCRUM-103-offer-draft-approval`, HEAD `5c92a31`.
Working tree sạch trước khi sửa. Không truy cập database, chạy startup, migration,
seed, stage hoặc commit trong lượt này. Phạm vi là AC do người dùng cung cấp;
không có truy cập Jira để xác minh thêm tiêu chí khác.

## Ma trận Acceptance Criteria

PASS dưới đây chỉ áp dụng phần độc lập đã kiểm thử. PARTIAL là có code/test nhưng
chưa chứng minh persistence thật. BLOCKED là còn thiếu hợp đồng bằng chứng bắt buộc.
Không có kết luận end-to-end PASS trên MySQL.

| AC | Trạng thái | File, hàm và API/UI | Bằng chứng kiểm thử / giới hạn |
| --- | --- | --- | --- |
| 1. PASSED hợp lệ gắn đúng Application | BLOCKED | `services/offerService.js:getEligibility/createDraft`, `repositories/offerRepository.js:loadDecision`, `services/offerValidation.js:assertPassedDecision`; GET `/api/offers/eligibility`, POST `/api/offers` | `offerEligibility`, `offerEligibilityRoutes`, `offerDraftService`, `offerPersistence`, `offerDecisionIntegration` tests: PASSED/FAILED, sai liên kết, thiếu bằng chứng. Runtime vẫn eligible=false hoặc 503; verified decision authority chưa có. |
| 2. Đủ ứng viên, chức danh, phòng ban, lương, ngày nhận việc, hạn phản hồi | PARTIAL | `Frontend/src/pages/offers/OfferForm.jsx`, `offerFormModel.js`; `offerValidation.normalizeDraft/validateSubmission`, `offerRepository.loadApplicationForUpdate/loadCatalog` | `offer-form.test.cjs`, `offerValidation`, `offerDraftService` tests. Candidate/department lấy từ mapping server; nháp cho phép thiếu nội dung, gửi duyệt phải đủ. Chưa có Offer được ghi thật qua luồng này. |
| 3. Tạo/lưu/sửa nháp và gửi duyệt | PARTIAL | `offerService.createDraft/updateDraft/submitOffer`; POST `/api/offers`, PATCH `/api/offers/:id`, POST `/api/offers/:id/submit`; `/offers/new`, `/offers/:id/edit` | `offerDraftRoutes`, `offerDraftService`, `offerPersistence`, browser Offer Form. Luồng thành công được kiểm thử với mock; Gate 503 giữ nguyên. |
| 4. Validation cả Frontend và Backend | PASS | `offerFormModel.validateOfferForm`, `offerValidation.normalizeDraft/validateSubmission/expectedVersion`, `offerApi.offerErrorMessage` | Kiểm tra trường bắt buộc, tiền tệ, số tiền, ngày, độ dài, trường bất biến; 400/422/428 được xử lý. PASS cho logic validation độc lập, không phải nghiệm thu luồng ghi. Không tự thêm quy tắc thứ tự ngày chưa được thống nhất. |
| 5. Gửi sang PENDING_APPROVAL và khóa sửa | PARTIAL | `offerService.submitOffer`, `offerRepository.submitIfEditable/updateDraftIfEditable`, `offerValidation.assertEditable`; UI chỉ đọc | Bổ sung kiểm tra If-Match và predicate SQL row_version cho submit. Test stale submit, gửi lặp, không PATCH sau gửi; mock browser kiểm tra UI khóa. Assignment thật và schema còn chặn giao dịch. |
| 6. Sửa CHANGE_REQUESTED và gửi lại đúng phiên bản | PARTIAL | Cùng PATCH/submit và OfferForm; lý do từ approvals | `offerDraftService`, `offerPersistence` và browser test CHANGE_REQUESTED. PATCH dùng phiên bản đang xem; submit dùng phiên bản Backend vừa trả sau PATCH. Phát sinh yêu cầu sửa thật vẫn bị getApprovalScope từ chối vì thiếu phân công đáng tin cậy; không viết lại phần duyệt của đồng đội. |
| 7. Không trùng Offer hiệu lực cho Application | PARTIAL | `offerRepository.findEffectiveOffers`, `offerValidation.assertNoDuplicate`, `withTransaction`; review `020_offer_columns.sql.review` giữ UNIQUE(application_id) cũ | Test duplicate, conflict, rollback và migration static. Hiện bảo thủ chặn mọi lịch sử cùng application và Offer legacy chưa mapping; không tự tái tạo sau DECLINED/REJECTED. Chưa chứng minh khóa/UNIQUE trên MySQL thực tế. |
| 8. Creator, thời gian và lịch sử từng lần gửi | PARTIAL | `offerService.createDraft`, `offerRepository.insertDraft/recordSubmission`; review `040_submissions_assignments.sql.review` | `offerDraftService`, `offerPersistence` kiểm tra creator từ actor, timestamps SQL, submitted_by/submitted_at, snapshot/version và các lần gửi; rollback khi history lỗi. Lịch sử lưu trong offer_submissions, chưa có màn hình lịch sử gửi riêng; approvals hiện là lịch sử xử lý, không thay thế lịch sử gửi. Chưa ghi thật. |

Các tên test Backend trong bảng nằm dưới `Backend/src/services`, `repositories`
hoặc `routes`, hậu tố `.test.js`.

## Thay đổi trong lượt này

| File | Lý do |
| --- | --- |
| `Backend/src/controllers/offerController.js` | Chuyển header If-Match vào submit service. |
| `Backend/src/services/offerService.js` | Yêu cầu version cho submit sau gate; kiểm tra version của hàng đã khóa trước mọi mutation. |
| `Backend/src/repositories/offerRepository.js` | UPDATE submit kiểm tra đồng thời quyền, trạng thái và row_version. |
| `Backend/src/services/offerDraftService.test.js` | Test thiếu version, stale DRAFT/CHANGE_REQUESTED, gửi lại và khóa sửa; fixture mô phỏng tăng version. |
| `Backend/src/repositories/offerPersistence.test.js` | Xác minh version được truyền tới SQL submit. |
| `Backend/src/routes/offerPostAccess.test.js` | Cập nhật request/fixture theo hợp đồng version, giữ các kiểm tra phân quyền và cạnh tranh cũ. |
| `Frontend/src/api/offerApi.js` | Submit gửi If-Match; thiếu version từ chối tại client; thông báo 422 rõ ràng, không đưa chi tiết riêng tư của server lên UI. |
| `Frontend/src/pages/offers/OfferForm.jsx` | Gửi đúng version Backend trả sau lưu. |
| `Frontend/src/pages/offers/OfferList.jsx` | Gửi đúng version Offer đang hiển thị. |
| `Frontend/offer-form.test.cjs` | HTTP mock kiểm tra header submit bằng version mới nhất; thêm lỗi 422. |
| File review này | Ma trận và kế hoạch nghiệm thu. |

Thay đổi hợp đồng: POST `/api/offers/:id/submit` cần `If-Match: "<row_version>"`
khi dependency sẵn sàng; thiếu trả 428, sai định dạng 400, stale trả 409.
Gate hiện vẫn ưu tiên 503 trước kiểm tra version ở Backend. Các client khác ngoài
OfferForm/OfferList phải cập nhật header trước khi bật luồng ghi.
PATCH giữ hợp đồng cũ. Không thay đổi endpoint approve/reject/request-change/process-approval.

## Kiểm thử thực hiện

- Backend: `node node_modules/jest/bin/jest.js --runInBand --testPathPatterns='offer|candidatePortal|candidateEvaluation|notification|app.cors' --setupFilesAfterEnv D:/scrum61/.scrum103-verification/no-mysql.cjs --silent`.
  Kết quả cuối: **23 suite, 465 PASS, 0 FAIL**. Bao gồm các kiểm thử phân quyền,
  quyết định, Portal filtering, assignment/history, rollback và notification.
- Lượt Backend đầu: 448 PASS, 17 FAIL do fixture POST cũ chưa gửi If-Match.
  Đã cập nhật fixture và chạy lại đúng một lần; không quy lỗi này cho baseline.
- `npm.cmd run test:offers`: **44 PASS, 0 FAIL**. Ban đầu sandbox không cho spawn
  tiến trình; chạy ngoài sandbox thành công. Không sử dụng mock trong production.
- `npm.cmd run test:offer-routes`: **22 PASS**, bao gồm build PASS, toàn bộ route cũ
  được giữ, tổng 66 route không trùng (script so với mốc 63 trước OfferForm).
  Trong lượt này App.jsx không đổi. Các trang `/offers`, `/:id`, `/approval`, `/new`,
  `/:id/edit`, điều hướng Evaluation, notification và giao diện duyệt vẫn qua smoke test.
- Frontend build có cảnh báo bundle >500 kB; không phải lỗi build.
- `node --check` cho ba file Backend production thay đổi: PASS.
- `git diff --check`: PASS; Git chỉ cảnh báo chuyển LF sang CRLF theo cấu hình.
- Không chạy toàn bộ Backend regression; không khẳng định lại số lỗi baseline 52.
  Mock SQL không chứng minh khóa InnoDB/rollback dữ liệu thật. Test duyệt UI mock
  không chứng minh workflow phê duyệt thật hoạt động.

## Blocker và phần cần phối hợp tối thiểu

| Chủ module | Việc cần chốt/triển khai trước nghiệm thu |
| --- | --- |
| Application | Trạng thái đủ điều kiện ra quyết định và phiên bản lifecycle theo từng application. Hiện updated_at không thay thế version; đồng bộ trạng thái theo candidate có thể tác động nhiều application. |
| Evaluation / decision owner | Liên kết kết quả phỏng vấn tới đúng application, thống nhất hai schema đánh giá, trạng thái hoàn tất/thu hồi và nguồn bằng chứng; triển khai verifyLifecycle/verifyEvaluation cùng connection. Quyền quyết định vẫn chỉ ACTIVE HIRING_MANAGER đúng departments.manager_user_id. |
| Decision authority / SCRUM-382 | Triển khai verifyDecisionAuthority với bằng chứng có thể xác minh lại, không chỉ CURRENT hoặc chuỗi policy/reference; giải quyết semantics thay trưởng phòng/thu hồi quyết định. |
| SCRUM-390/391 Approval | Trusted resolveSubmissionAssignments và getApprovalScope theo từng lần gửi; phê duyệt/yêu cầu sửa phải kiểm tra version, chuyển trạng thái và history trong transaction. Không coi role hoặc offer_approvals cũ là phân công. |
| SCRUM-390/391 Notification | Recipients hiện lấy từ submission.approver_ids, nhưng định danh theo lần gửi và retry/outbox chưa được bảo đảm. Submit commit trước notification; lỗi notification không rollback Offer. UI danh sách cũ nói người duyệt đã nhận thông báo là quá mạnh khi delivery có thể thất bại; cần thống nhất hợp đồng delivery trước kích hoạt. |
| Evaluation / nhóm tích hợp | API tạo Offer trực tiếp PENDING_RESPONSE còn tồn tại. Cần thống nhất hạn chế/delegate để không bỏ qua phê duyệt, không tạo thêm module Offer. |
| Schema / người vận hành TEST | Review và xác minh migration tăng dần, UNIQUE/FK, nullable draft, version/history; backup và thử phục hồi TEST trước thao tác được phê duyệt. Không tự chạy `.sql.review`. Xác minh transaction cạnh tranh và rollback trên TEST sau khi được phép. |

## Điều kiện bàn giao và nghiệm thu

Có thể bàn giao code form/API adapter, validation, kiểm soát phiên bản PATCH/submit,
transaction orchestration, SQL persistence dự thảo và các bộ test để review.
Đọc Offer vẫn theo phạm vi Backend; Portal chỉ cho PENDING_RESPONSE/ACCEPTED/DECLINED.
Production chưa tạo/lưu/gửi Offer qua SCRUM-103; eligibility chưa trả true;
authority và assignment vẫn fail-closed. Không có bằng chứng dữ liệu thật mới trong lượt này.

Để nghiệm thu SCRUM-382: giải quyết hợp đồng decision/assignment, schema TEST,
API Evaluation bỏ qua duyệt, notification; kiểm thử transaction và phân quyền thật,
rồi mới review việc mở gate riêng. Để nghiệm thu SCRUM-381: chạy form/list thật trên
Backend đã xác minh, gồm stale edit/submit, CHANGE_REQUESTED và mọi mã lỗi; xác nhận
client dùng version mới. Để nghiệm thu SCRUM-103: thực hiện chuỗi đầy đủ PASSED đúng
application → DRAFT → lưu/sửa → gửi → PENDING_APPROVAL → yêu cầu sửa → gửi lại,
kiểm tra metadata/history, không trùng và Portal không lộ Offer nội bộ.
