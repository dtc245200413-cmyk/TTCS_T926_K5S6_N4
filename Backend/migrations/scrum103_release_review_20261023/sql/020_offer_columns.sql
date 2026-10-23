-- MIGRATION REVIEW: run only after successful preflight + backup/restore test.
-- Selected DB must be explicitly confirmed. MySQL DDL commits implicitly.
ALTER TABLE internal_recruitment_test.candidate_offers
  ADD COLUMN offer_code VARCHAR(50) NULL,
  ADD COLUMN candidate_id INT NULL,
  ADD COLUMN recruitment_request_id INT NULL,
  ADD COLUMN hiring_decision_id INT NULL,
  ADD COLUMN department_id INT NULL,
  ADD COLUMN position_id INT NULL,
  ADD COLUMN job_title VARCHAR(150) NULL,
  ADD COLUMN basic_salary DECIMAL(15,2) NULL,
  ADD COLUMN expected_start_date DATE NULL,
  ADD COLUMN work_location VARCHAR(255) NULL,
  ADD COLUMN benefits TEXT NULL,
  ADD COLUMN special_terms TEXT NULL,
  ADD COLUMN created_by INT NULL,
  ADD COLUMN submitted_at DATETIME NULL,
  ADD COLUMN approved_at DATETIME NULL,
  ADD COLUMN sent_to_candidate_at DATETIME NULL,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ADD COLUMN row_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN decision_source VARCHAR(100) NULL,
  ADD COLUMN decision_reference VARCHAR(128) NULL,
  ADD COLUMN decision_version VARCHAR(128) NULL,
  ADD UNIQUE KEY uq_co_offer_code (offer_code),
  ADD CONSTRAINT fk_co_candidate
   FOREIGN KEY (candidate_id) REFERENCES internal_recruitment_test.candidates(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_co_app
   FOREIGN KEY (application_id) REFERENCES internal_recruitment_test.candidate_applications(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_co_req
   FOREIGN KEY (recruitment_request_id) REFERENCES internal_recruitment_test.recruitment_requests(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_co_decision
   FOREIGN KEY (hiring_decision_id) REFERENCES internal_recruitment_test.candidate_hiring_decisions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_co_dept
   FOREIGN KEY (department_id) REFERENCES internal_recruitment_test.departments(department_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_co_pos
   FOREIGN KEY (position_id) REFERENCES internal_recruitment_test.job_positions(position_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_co_creator
   FOREIGN KEY (created_by) REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT;
