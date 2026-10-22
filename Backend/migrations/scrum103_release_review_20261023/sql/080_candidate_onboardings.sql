-- REVIEW ONLY: DDL for SCRUM-103 merge add-on; never auto-execute in server.js.
CREATE TABLE internal_recruitment_test.candidate_onboardings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  offer_id INT NOT NULL UNIQUE,
  candidate_id INT NOT NULL,
  hr_in_charge_id INT NOT NULL,
  official_start_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PREPARING',
  equipment_ready TINYINT(1) NOT NULL DEFAULT 0,
  account_created TINYINT(1) NOT NULL DEFAULT 0,
  contract_signed TINYINT(1) NOT NULL DEFAULT 0,
  orientation_done TINYINT(1) NOT NULL DEFAULT 0,
  checklist_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_onb_candidate (candidate_id),
  CONSTRAINT fk_s103_onb_offer FOREIGN KEY (offer_id)
    REFERENCES internal_recruitment_test.candidate_offers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_s103_onb_candidate FOREIGN KEY (candidate_id)
    REFERENCES internal_recruitment_test.candidates(id) ON DELETE RESTRICT,
  CONSTRAINT fk_s103_onb_hr FOREIGN KEY (hr_in_charge_id)
    REFERENCES internal_recruitment_test.users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
