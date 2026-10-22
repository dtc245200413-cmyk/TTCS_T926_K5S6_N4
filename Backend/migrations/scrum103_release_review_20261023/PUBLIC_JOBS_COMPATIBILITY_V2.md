# SCRUM-103 Public Jobs compatibility review V2

The original trial script stopped before any DDL because `job_postings.hidden_by` was absent.
The repository `jobPostingRepository.js` uses `department_id`, `hidden_by`, and `hidden_at` for filtering, selection and Hide/Unhide workflows. The legacy migration defines 11 additive nullable posting extensions. `server.js` does not automatically run migrations.

This patch audits those 11 extensions and adds only ones missing on the **isolated trial database** using one `ALTER TABLE`. It does not update rows or seed users, candidates or job postings. It checks metadata, original posting count and real repository SELECTs after the change, including filter options. The reference SQL is **review-only**, not an automatically executable team migration; DBA approval, a versioned target-specific SQL migration and tested backup/restore are required for shared deployment.

Even when repository tests pass, verify `GET /api/public/jobs` returns HTTP 200 on the trial server. Full Offer E2E is separate and still required. A clean Git PR does not migrate the team's database.
