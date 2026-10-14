-- SCRUM-337: apply manually to the intended database; never run on app startup.
-- Read-only inspection found InnoDB candidates(id), master_data(id), users(user_id)
-- with signed INT keys. candidate_tags and candidate_notes were absent.
-- IF NOT EXISTS does not repair an existing incompatible table: inspect it first.
CREATE TABLE IF NOT EXISTS candidate_tags (
    candidate_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (candidate_id, tag_id),
    CONSTRAINT fk_ct_candidate FOREIGN KEY (candidate_id)
        REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_ct_tag FOREIGN KEY (tag_id)
        REFERENCES master_data(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ct_creator FOREIGN KEY (created_by)
        REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_notes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    author_id INT NOT NULL,
    note_content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cn_candidate FOREIGN KEY (candidate_id)
        REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_cn_author FOREIGN KEY (author_id)
        REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_cn_candidate_created (candidate_id, created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
