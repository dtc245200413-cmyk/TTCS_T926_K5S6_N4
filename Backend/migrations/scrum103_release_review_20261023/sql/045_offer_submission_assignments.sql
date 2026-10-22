-- REVIEW ONLY: DB schema from SCRUM-382. Execute in the approved order.
CREATE TABLE internal_recruitment_test.offer_submission_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  submission_id BIGINT UNSIGNED NOT NULL,
  approver_id INT NOT NULL,
  assigned_by INT NOT NULL,
  assignment_source VARCHAR(100) NOT NULL,
  assignment_reference VARCHAR(128) NOT NULL,
  assignment_version VARCHAR(128) NOT NULL,
  assigned_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_submission_approver (submission_id, approver_id),
  INDEX idx_osa_approver (approver_id, revoked_at),
  CONSTRAINT fk_osa_submission FOREIGN KEY (submission_id) REFERENCES internal_recruitment_test.offer_submissions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_osa_approver FOREIGN KEY (approver_id) REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_osa_assigner FOREIGN KEY (assigned_by) REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
