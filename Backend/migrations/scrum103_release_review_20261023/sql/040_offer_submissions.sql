-- REVIEW ONLY: DB schema from SCRUM-382. Execute in the approved order.
CREATE TABLE internal_recruitment_test.offer_submissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  offer_id INT NOT NULL,
  submission_number INT UNSIGNED NOT NULL,
  offer_row_version BIGINT UNSIGNED NOT NULL,
  submitted_by INT NOT NULL,
  submitted_at DATETIME NOT NULL,
  decision_source VARCHAR(100) NOT NULL,
  decision_reference VARCHAR(128) NOT NULL,
  decision_version VARCHAR(128) NOT NULL,
  decision_snapshot JSON NOT NULL,
  content_snapshot JSON NOT NULL,
  UNIQUE KEY uq_offer_submission (offer_id, submission_number),
  UNIQUE KEY uq_offer_submission_version (offer_id, offer_row_version),
  CONSTRAINT fk_os_offer FOREIGN KEY (offer_id) REFERENCES internal_recruitment_test.candidate_offers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_os_submitter FOREIGN KEY (submitted_by) REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
