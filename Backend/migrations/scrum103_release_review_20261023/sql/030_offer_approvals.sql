-- MIGRATION REVIEW: run only after successful preflight + backup/restore test.
-- Selected DB must be explicitly confirmed. MySQL DDL commits implicitly.
CREATE TABLE internal_recruitment_test.offer_approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  offer_id INT NOT NULL,
  approver_id INT NOT NULL,
  action ENUM('APPROVED','REJECTED','REQUEST_CHANGE') NOT NULL,
  reason TEXT NULL,
  action_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_oa_offer (offer_id, action_at),
  CONSTRAINT fk_oa_offer FOREIGN KEY (offer_id) REFERENCES internal_recruitment_test.candidate_offers(id) ON DELETE CASCADE,
  CONSTRAINT fk_oa_approver FOREIGN KEY (approver_id) REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
