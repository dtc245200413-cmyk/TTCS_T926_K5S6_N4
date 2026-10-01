-- ============================================================
--  INTERNAL RECRUITMENT MANAGEMENT SYSTEM - SPRINT 2
--  Database : internal_recruitment_system
-- ============================================================

USE internal_recruitment_system;

-- ============================================================
-- 1. MODIFY SPRINT 1 TABLES (S2-04, S2-05)
-- ============================================================
-- Adding parent-child hierarchy and manager to existing departments table.

ALTER TABLE departments
ADD COLUMN parent_department_id INT NULL AFTER description,
ADD COLUMN manager_user_id INT NULL AFTER parent_department_id,
ADD CONSTRAINT fk_dept_parent FOREIGN KEY (parent_department_id) 
    REFERENCES departments(department_id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_user_id) 
    REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- 2. EXCEL IMPORT TRACKING (S2-01)
-- ============================================================
CREATE TABLE employee_import_batches (
    batch_id INT NOT NULL AUTO_INCREMENT,
    imported_by INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    total_rows INT NOT NULL DEFAULT 0,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_employee_import_batches PRIMARY KEY (batch_id),
    CONSTRAINT fk_eib_user FOREIGN KEY (imported_by)
        REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE employee_import_rows (
    row_id INT NOT NULL AUTO_INCREMENT,
    batch_id INT NOT NULL,
    row_number INT NOT NULL,
    employee_code VARCHAR(20) NULL,
    full_name VARCHAR(150) NULL,
    company_email VARCHAR(200) NULL,
    phone_number VARCHAR(20) NULL,
    department_code VARCHAR(20) NULL,
    job_title VARCHAR(100) NULL,
    validation_status ENUM('PENDING', 'VALID', 'INVALID', 'IMPORTED') NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_employee_import_rows PRIMARY KEY (row_id),
    CONSTRAINT fk_eir_batch FOREIGN KEY (batch_id)
        REFERENCES employee_import_batches (batch_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. EMPLOYEE PROFILES (S2-02, S2-03)
-- ============================================================
CREATE TABLE employee_profiles (
    profile_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    avatar_url VARCHAR(255) NULL,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    date_of_birth DATE NULL,
    address VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_employee_profiles PRIMARY KEY (profile_id),
    CONSTRAINT uq_ep_user_id UNIQUE (user_id),
    CONSTRAINT fk_ep_user FOREIGN KEY (user_id)
        REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. COMPETENCY FRAMEWORKS (S2-06)
-- ============================================================
CREATE TABLE competency_frameworks (
    framework_id INT NOT NULL AUTO_INCREMENT,
    framework_code VARCHAR(50) NOT NULL,
    framework_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_competency_frameworks PRIMARY KEY (framework_id),
    CONSTRAINT uq_cf_code UNIQUE (framework_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE competency_criteria (
    criteria_id INT NOT NULL AUTO_INCREMENT,
    framework_id INT NOT NULL,
    criteria_name VARCHAR(150) NOT NULL,
    weight DECIMAL(5,2) NOT NULL, -- Enforce sum = 100% in business logic
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_competency_criteria PRIMARY KEY (criteria_id),
    CONSTRAINT fk_cc_framework FOREIGN KEY (framework_id)
        REFERENCES competency_frameworks (framework_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. JOB POSITIONS & TITLES (S2-05)
-- ============================================================
CREATE TABLE job_positions (
    position_id INT NOT NULL AUTO_INCREMENT,
    position_code VARCHAR(50) NOT NULL,
    position_name VARCHAR(150) NOT NULL,
    position_level VARCHAR(50) NULL,
    min_salary DECIMAL(15,2) NULL,
    max_salary DECIMAL(15,2) NULL,
    competency_framework_id INT NULL,
    description TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_job_positions PRIMARY KEY (position_id),
    CONSTRAINT uq_jp_code UNIQUE (position_code),
    CONSTRAINT fk_jp_framework FOREIGN KEY (competency_framework_id)
        REFERENCES competency_frameworks (framework_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. INTERVIEW QUESTION BANK (S2-07)
-- ============================================================
CREATE TABLE interview_questions (
    question_id INT NOT NULL AUTO_INCREMENT,
    criteria_id INT NOT NULL,
    question_content TEXT NOT NULL,
    difficulty_level ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    good_answer_hint TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_interview_questions PRIMARY KEY (question_id),
    CONSTRAINT fk_iq_criteria FOREIGN KEY (criteria_id)
        REFERENCES competency_criteria (criteria_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. RECRUITMENT CATALOGS (S2-08)
-- ============================================================
CREATE TABLE candidate_sources (
    source_id INT NOT NULL AUTO_INCREMENT,
    source_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_candidate_sources PRIMARY KEY (source_id),
    CONSTRAINT uq_cs_name UNIQUE (source_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rejection_reasons (
    reason_id INT NOT NULL AUTO_INCREMENT,
    reason_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_rejection_reasons PRIMARY KEY (reason_id),
    CONSTRAINT uq_rr_name UNIQUE (reason_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE work_locations (
    location_id INT NOT NULL AUTO_INCREMENT,
    location_name VARCHAR(150) NOT NULL,
    address TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_work_locations PRIMARY KEY (location_id),
    CONSTRAINT uq_wl_name UNIQUE (location_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE work_types (
    type_id INT NOT NULL AUTO_INCREMENT,
    type_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_work_types PRIMARY KEY (type_id),
    CONSTRAINT uq_wt_name UNIQUE (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 8. COMPANY INTRODUCTION CONFIG (S2-09)
-- ============================================================
CREATE TABLE company_introductions (
    intro_id INT NOT NULL AUTO_INCREMENT,
    content TEXT NOT NULL,
    logo_url VARCHAR(255) NULL,
    banner_url VARCHAR(255) NULL,
    updated_by INT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_company_introductions PRIMARY KEY (intro_id),
    CONSTRAINT fk_ci_updated_by FOREIGN KEY (updated_by)
        REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 9. JOB REQUISITIONS / HEADCOUNT REQUESTS (S2-10)
-- ============================================================
CREATE TABLE job_requisitions (
    requisition_id INT NOT NULL AUTO_INCREMENT,
    requisition_code VARCHAR(50) NOT NULL,
    department_id INT NOT NULL,
    position_id INT NOT NULL,
    headcount INT NOT NULL,
    reason TEXT NULL,
    proposed_min_salary DECIMAL(15,2) NULL,
    proposed_max_salary DECIMAL(15,2) NULL,
    date_needed DATE NULL,
    job_description TEXT NULL,
    requirements TEXT NULL,
    status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    created_by INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_job_requisitions PRIMARY KEY (requisition_id),
    CONSTRAINT uq_jr_code UNIQUE (requisition_code),
    
    -- S2-04 Rule: Cannot delete department if it has active requisitions -> ON DELETE RESTRICT
    CONSTRAINT fk_jr_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id) ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_jr_position FOREIGN KEY (position_id)
        REFERENCES job_positions (position_id) ON DELETE RESTRICT ON UPDATE CASCADE,
        
    CONSTRAINT fk_jr_created_by FOREIGN KEY (created_by)
        REFERENCES users (user_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
