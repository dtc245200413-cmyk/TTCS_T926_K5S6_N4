-- REVIEW ONLY: DDL for SCRUM-103 merge add-on; never auto-execute in server.js.
CREATE TABLE internal_recruitment_test.offer_approval_outbox (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  approval_history_id INT NOT NULL,
  offer_id INT NOT NULL,
  submission_id BIGINT UNSIGNED NOT NULL,
  actor_user_id INT NOT NULL,
  recipient_user_id INT NOT NULL,
  action ENUM('APPROVED','REJECTED','REQUEST_CHANGE') NOT NULL,
  payload_json JSON NOT NULL,
  delivery_status ENUM('PENDING','DELIVERED') NOT NULL DEFAULT 'PENDING',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  delivered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_offer_approval_outbox_history (approval_history_id),
  KEY idx_offer_approval_outbox_pending (delivery_status, id),
  CONSTRAINT fk_offer_outbox_history FOREIGN KEY (approval_history_id)
    REFERENCES internal_recruitment_test.offer_approvals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_offer_outbox_offer FOREIGN KEY (offer_id)
    REFERENCES internal_recruitment_test.candidate_offers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_offer_outbox_submission FOREIGN KEY (submission_id)
    REFERENCES internal_recruitment_test.offer_submissions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_offer_outbox_actor FOREIGN KEY (actor_user_id)
    REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_offer_outbox_recipient FOREIGN KEY (recipient_user_id)
    REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
