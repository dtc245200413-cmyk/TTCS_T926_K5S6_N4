-- SCRUM-129 / SCRUM-215: run manually against the intended database.
-- Requires existing InnoDB candidates(id) and users(user_id) tables.
-- Safe to rerun for this schema; does not repair a pre-existing incompatible table.
CREATE TABLE IF NOT EXISTS candidate_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_cr_candidate_reviewer UNIQUE (candidate_id, reviewer_id),
    CONSTRAINT chk_cr_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_cr_candidate FOREIGN KEY (candidate_id)
        REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_cr_reviewer FOREIGN KEY (reviewer_id)
        REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_cr_reviewer (reviewer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
