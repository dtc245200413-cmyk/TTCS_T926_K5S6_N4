-- REVIEW ONLY: DDL for SCRUM-103 merge add-on; never auto-execute in server.js.
CREATE TABLE internal_recruitment_test.offer_approval_mandates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  offer_id INT NOT NULL,
  application_id INT NOT NULL,
  department_id INT NOT NULL,
  approver_id INT NOT NULL,
  assigned_by INT NOT NULL,
  version BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_offer_mandate_version (offer_id, version),
  INDEX idx_offer_mandate_active (offer_id, application_id, revoked_at),
  CONSTRAINT fk_oam_offer FOREIGN KEY (offer_id) REFERENCES internal_recruitment_test.candidate_offers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_oam_application FOREIGN KEY (application_id) REFERENCES internal_recruitment_test.candidate_applications(id) ON DELETE RESTRICT,
  CONSTRAINT fk_oam_department FOREIGN KEY (department_id) REFERENCES internal_recruitment_test.departments(department_id) ON DELETE RESTRICT,
  CONSTRAINT fk_oam_approver FOREIGN KEY (approver_id) REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_oam_assigner FOREIGN KEY (assigned_by) REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
