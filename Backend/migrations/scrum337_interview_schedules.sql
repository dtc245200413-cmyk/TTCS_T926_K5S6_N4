-- SCRUM-337: run manually against the intended database, never on application startup.
-- Inspected parent tables are InnoDB with signed INT primary keys.
-- start_at/end_at are UTC DATETIME values; API input must contain a timezone.
-- IF NOT EXISTS does not repair a pre-existing incompatible table.
CREATE TABLE IF NOT EXISTS interview_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    position_id INT NOT NULL,
    interviewer_id INT NOT NULL,
    room_id INT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status ENUM('SCHEDULED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    created_by INT NOT NULL,
    updated_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_is_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_is_position FOREIGN KEY (position_id) REFERENCES job_positions(position_id) ON DELETE RESTRICT,
    CONSTRAINT fk_is_interviewer FOREIGN KEY (interviewer_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_is_room FOREIGN KEY (room_id) REFERENCES master_data(id) ON DELETE RESTRICT,
    CONSTRAINT fk_is_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_is_updater FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_is_time CHECK (end_at > start_at),
    INDEX idx_is_interviewer_time (interviewer_id, status, start_at),
    INDEX idx_is_room_time (room_id, status, start_at),
    INDEX idx_is_candidate_time (candidate_id, start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
