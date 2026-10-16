-- ============================================================
-- SCRUM-67
-- CV PDF parsing / Candidate profile support
-- ============================================================

USE internal_recruitment_system;

-- ------------------------------------------------------------
-- 1. master_data: reference-locking support
-- ------------------------------------------------------------

SET @has_is_referenced = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'master_data'
      AND COLUMN_NAME = 'is_referenced'
);

SET @sql_add_is_referenced =
    IF(
        @has_is_referenced = 0,
        'ALTER TABLE master_data ADD COLUMN is_referenced BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active',
        'SELECT 1'
    );

PREPARE stmt FROM @sql_add_is_referenced;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- ------------------------------------------------------------
-- 2. Candidate sources used by CandidateCreate.jsx
-- ------------------------------------------------------------

INSERT IGNORE INTO master_data
(
    category_group,
    code,
    name,
    description,
    display_order,
    is_active,
    is_referenced
)
VALUES
(
    'CANDIDATE_SOURCE',
    'LINKEDIN',
    'LinkedIn',
    'Candidate source LinkedIn',
    1,
    TRUE,
    FALSE
),
(
    'CANDIDATE_SOURCE',
    'FACEBOOK',
    'Facebook',
    'Candidate source Facebook',
    2,
    TRUE,
    FALSE
),
(
    'CANDIDATE_SOURCE',
    'COMPANY_WEBSITE',
    CONVERT(0x576562736974652063C3B46E67207479 USING utf8mb4),
    'Candidate source from company website',
    3,
    TRUE,
    FALSE
),
(
    'CANDIDATE_SOURCE',
    'INTERNAL_REFERRAL',
    CONVERT(0x4769E1BB9B6920746869E1BB8775206EE1BB99692062E1BB99 USING utf8mb4),
    'Internal employee referral',
    4,
    TRUE,
    FALSE
),
(
    'CANDIDATE_SOURCE',
    'OTHER',
    CONVERT(0x4B68C3A163 USING utf8mb4),
    'Other candidate source',
    5,
    TRUE,
    FALSE
);


-- ------------------------------------------------------------
-- 3. Candidates table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS candidates (
    id INT NOT NULL AUTO_INCREMENT,

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,

    status ENUM(
        'NEW',
        'INTERVIEWING',
        'OFFERED',
        'HIRED',
        'REJECTED'
    ) NOT NULL DEFAULT 'NEW',

    source_code VARCHAR(50) NULL,
    rejection_reason_code VARCHAR(50) NULL,
    recruitment_request_id INT NULL,
    created_by INT NULL,

    cv_file_path VARCHAR(255) NULL,
    cover_letter TEXT NULL,
    tracking_code VARCHAR(50) NULL,
    is_withdrawn BOOLEAN NOT NULL DEFAULT FALSE,
    referrer_employee_id INT NULL,
    parsed_skills TEXT NULL,

    rating INT NULL,
    is_talent_pool BOOLEAN NOT NULL DEFAULT FALSE,
    current_stage VARCHAR(50) NOT NULL DEFAULT 'NEW',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    UNIQUE KEY uq_candidates_tracking_code (tracking_code),

    INDEX idx_candidates_email (email),
    INDEX idx_candidates_status (status),
    INDEX idx_candidates_source_code (source_code),
    INDEX idx_candidates_recruitment_request (
        recruitment_request_id
    ),
    INDEX idx_candidates_created_by (created_by),

    CONSTRAINT fk_candidates_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT chk_candidates_rating
        CHECK (
            rating IS NULL
            OR rating BETWEEN 1 AND 5
        )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------
-- 4. Verification
-- ------------------------------------------------------------

SELECT
    id,
    category_group,
    code,
    name,
    is_active,
    is_referenced
FROM master_data
WHERE category_group = 'CANDIDATE_SOURCE'
ORDER BY display_order;

SHOW COLUMNS FROM candidates;