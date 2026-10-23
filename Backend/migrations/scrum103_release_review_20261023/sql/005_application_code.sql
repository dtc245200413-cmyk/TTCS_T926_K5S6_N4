-- MIGRATION REVIEW: run only after successful preflight + backup/restore test.
-- Selected DB must be explicitly confirmed. MySQL DDL commits implicitly.
ALTER TABLE internal_recruitment_test.candidate_applications
  ADD COLUMN application_code VARCHAR(50) NULL,
  ADD UNIQUE KEY uq_cand_app_code (application_code);
