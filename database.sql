-- ====================================================================================================
-- HỆ THỐNG TUYỂN DỤNG NỘI BỘ (INTERNAL RECRUITMENT MANAGEMENT SYSTEM)
-- TẬP LỆNH KHỞI TẠO VÀ NẠP DỮ LIỆU TOÀN DIỆN CHO CẢ 4 SPRINTS (SPRINT 1 + SPRINT 2 + SPRINT 3 + SPRINT 4)
-- Phiên bản: 4.0 - Hoàn thiện Quy trình Đánh giá năng lực, Quyết định tuyển dụng, Phê duyệt Offer & Thông báo
-- Hệ quản trị CSDL: MySQL 8.0+ | Engine: InnoDB | Bảng mã: utf8mb4_unicode_ci
-- ====================================================================================================

DROP DATABASE IF EXISTS internal_recruitment_system;

CREATE DATABASE internal_recruitment_system
    CHARACTER SET  utf8mb4
    COLLATE        utf8mb4_unicode_ci;

USE internal_recruitment_system;

-- ====================================================================================================
-- PHẦN 1: SPRINT 1 - TÀI KHOẢN, PHÂN QUYỀN & QUẢN TRỊ NGƯỜI DÙNG (ACCOUNT & RBAC)
-- ====================================================================================================

-- 1.1. Bảng Phòng ban (departments)
CREATE TABLE departments (
    department_id        INT          NOT NULL AUTO_INCREMENT,
    department_code      VARCHAR(20)  NOT NULL,
    department_name      VARCHAR(100) NOT NULL,
    description          TEXT             NULL,
    parent_department_id INT              NULL,
    manager_user_id      INT              NULL,
    status               ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_departments PRIMARY KEY (department_id),
    CONSTRAINT uq_department_code UNIQUE (department_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2. Bảng Người dùng hệ thống (users)
CREATE TABLE users (
    user_id               INT              NOT NULL AUTO_INCREMENT,
    department_id         INT                  NULL,
    employee_code         VARCHAR(20)      NOT NULL,
    full_name             VARCHAR(150)     NOT NULL,
    company_email         VARCHAR(200)     NOT NULL,
    phone_number          VARCHAR(20)          NULL,
    job_title             VARCHAR(100)         NULL,
    avatar_url            VARCHAR(255)         NULL,
    password_hash         VARCHAR(255)     NOT NULL,
    status                ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until          DATETIME             NULL,
    last_login_at         DATETIME             NULL,
    password_changed_at   DATETIME             NULL,
    created_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT uq_employee_code UNIQUE (employee_code),
    CONSTRAINT uq_company_email UNIQUE (company_email),
    CONSTRAINT fk_users_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_status        ON users (status);
CREATE INDEX idx_users_department_id ON users (department_id);
CREATE INDEX idx_users_company_email ON users (company_email);

-- Bổ sung ràng buộc khóa ngoại vòng cho departments
ALTER TABLE departments
ADD CONSTRAINT fk_dept_parent FOREIGN KEY (parent_department_id) 
    REFERENCES departments(department_id) ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT fk_dept_manager FOREIGN KEY (manager_user_id) 
    REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE;

-- 1.3. Bảng Vai trò (roles) - 7 vai trò chuẩn
CREATE TABLE roles (
    role_id     INT          NOT NULL AUTO_INCREMENT,
    role_code   VARCHAR(50)  NOT NULL,
    role_name   VARCHAR(100) NOT NULL,
    description TEXT             NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_roles PRIMARY KEY (role_id),
    CONSTRAINT uq_role_code UNIQUE (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4. Bảng Quyền hạn (permissions)
CREATE TABLE permissions (
    permission_id   INT          NOT NULL AUTO_INCREMENT,
    permission_code VARCHAR(100) NOT NULL,
    permission_name VARCHAR(150) NOT NULL,
    description     TEXT             NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_permissions PRIMARY KEY (permission_id),
    CONSTRAINT uq_permission_code UNIQUE (permission_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5. Bảng Phân vai trò người dùng (user_roles)
CREATE TABLE user_roles (
    user_id     INT       NOT NULL,
    role_id     INT       NOT NULL,
    assigned_by INT           NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ur_assigned_by FOREIGN KEY (assigned_by) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- 1.6. Bảng Gán quyền cho vai trò (role_permissions)
CREATE TABLE role_permissions (
    role_id       INT NOT NULL,
    permission_id INT NOT NULL,

    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles (role_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions (permission_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.7. Bảng Phiên đăng nhập (user_sessions)
CREATE TABLE user_sessions (
    session_id    INT          NOT NULL AUTO_INCREMENT,
    user_id       INT          NOT NULL,
    session_token VARCHAR(512) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at    DATETIME     NOT NULL,
    revoked_at    DATETIME         NULL,

    CONSTRAINT pk_user_sessions PRIMARY KEY (session_id),
    CONSTRAINT uq_session_token UNIQUE (session_token),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.8. Bảng Mã đặt lại mật khẩu (password_reset_tokens)
CREATE TABLE password_reset_tokens (
    reset_token_id INT          NOT NULL AUTO_INCREMENT,
    user_id        INT          NOT NULL,
    token_hash     VARCHAR(255) NOT NULL,
    expires_at     DATETIME     NOT NULL,
    used_at        DATETIME         NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_reset_tokens PRIMARY KEY (reset_token_id),
    CONSTRAINT uq_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.9. Bảng Nhật ký hệ thống (audit_logs)
CREATE TABLE audit_logs (
    audit_log_id INT          NOT NULL AUTO_INCREMENT,
    user_id      INT              NULL,
    performed_by INT              NULL,
    action       VARCHAR(100) NOT NULL,
    entity_type  VARCHAR(100)     NULL,
    entity_id    VARCHAR(50)      NULL,
    description  TEXT             NULL,
    ip_address   VARCHAR(45)      NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_audit_logs PRIMARY KEY (audit_log_id),
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_al_performed_by FOREIGN KEY (performed_by) REFERENCES users (user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_al_created_at ON audit_logs (created_at);
CREATE INDEX idx_al_action     ON audit_logs (action);


-- ====================================================================================================
-- PHẦN 2: SPRINT 2 - DANH MỤC TỔ CHỨC, VỊ TRÍ, KHUNG NĂNG LỰC & NGÂN HÀNG CÂU HỎI
-- ====================================================================================================

-- 2.1. Hồ sơ mở rộng của nhân viên (employee_profiles)
CREATE TABLE employee_profiles (
    profile_id    INT NOT NULL AUTO_INCREMENT,
    user_id       INT NOT NULL,
    avatar_url    VARCHAR(255) NULL,
    gender        ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    date_of_birth DATE NULL,
    address       VARCHAR(255) NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_employee_profiles PRIMARY KEY (profile_id),
    CONSTRAINT uq_ep_user_id UNIQUE (user_id),
    CONSTRAINT fk_ep_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2. Lịch sử Import Excel Nhân viên (employee_import_batches & employee_import_rows)
CREATE TABLE employee_import_batches (
    batch_id    INT NOT NULL AUTO_INCREMENT,
    imported_by INT NOT NULL,
    file_name   VARCHAR(255) NOT NULL,
    total_rows  INT NOT NULL DEFAULT 0,
    status      ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_employee_import_batches PRIMARY KEY (batch_id),
    CONSTRAINT fk_eib_user FOREIGN KEY (imported_by) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE employee_import_rows (
    row_id            INT NOT NULL AUTO_INCREMENT,
    batch_id          INT NOT NULL,
    `row_number`      INT NOT NULL,
    employee_code     VARCHAR(20) NULL,
    full_name         VARCHAR(150) NULL,
    company_email     VARCHAR(200) NULL,
    phone_number      VARCHAR(20) NULL,
    department_code   VARCHAR(20) NULL,
    job_title         VARCHAR(100) NULL,
    validation_status ENUM('PENDING', 'VALID', 'INVALID', 'IMPORTED') NOT NULL DEFAULT 'PENDING',
    error_message     TEXT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_employee_import_rows PRIMARY KEY (row_id),
    CONSTRAINT fk_eir_batch FOREIGN KEY (batch_id) REFERENCES employee_import_batches (batch_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3. Danh mục dùng chung (master_data)
CREATE TABLE master_data (
    id             INT NOT NULL AUTO_INCREMENT,
    category_group VARCHAR(50) NOT NULL, -- CANDIDATE_SOURCE, REJECTION_REASON, WORK_LOCATION, WORK_TYPE, INTERVIEW_ROOM, TAGS
    code           VARCHAR(50) NOT NULL,
    name           VARCHAR(150) NOT NULL,
    description    TEXT NULL,
    display_order  INT NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    is_referenced  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_master_data PRIMARY KEY (id),
    CONSTRAINT uq_md_group_code UNIQUE (category_group, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4. Khung năng lực và Tiêu chí đánh giá (competency_frameworks & competency_criteria)
CREATE TABLE competency_frameworks (
    framework_id   INT NOT NULL AUTO_INCREMENT,
    framework_code VARCHAR(50) NOT NULL,
    framework_name VARCHAR(150) NOT NULL,
    description    TEXT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_competency_frameworks PRIMARY KEY (framework_id),
    CONSTRAINT uq_cf_code UNIQUE (framework_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE competency_criteria (
    criteria_id   INT NOT NULL AUTO_INCREMENT,
    framework_id  INT NOT NULL,
    criteria_name VARCHAR(150) NOT NULL,
    weight        DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- Trọng số % (Tổng = 100%)
    description   TEXT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_competency_criteria PRIMARY KEY (criteria_id),
    CONSTRAINT fk_cc_framework FOREIGN KEY (framework_id) REFERENCES competency_frameworks (framework_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5. Vị trí công việc (job_positions)
CREATE TABLE job_positions (
    position_id             INT NOT NULL AUTO_INCREMENT,
    position_code           VARCHAR(50) NOT NULL,
    position_name           VARCHAR(150) NOT NULL,
    position_level          VARCHAR(50) NULL,
    min_salary              DECIMAL(15,2) NULL,
    max_salary              DECIMAL(15,2) NULL,
    competency_framework_id INT NULL,
    description             TEXT NULL,
    status                  ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_job_positions PRIMARY KEY (position_id),
    CONSTRAINT uq_jp_code UNIQUE (position_code),
    CONSTRAINT fk_jp_framework FOREIGN KEY (competency_framework_id) REFERENCES competency_frameworks (framework_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.6. Danh mục năng lực & Ngân hàng câu hỏi phỏng vấn (competencies & questions)
CREATE TABLE competencies (
    id          INT NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_competencies PRIMARY KEY (id),
    CONSTRAINT uq_competencies_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE questions (
    id                     INT NOT NULL AUTO_INCREMENT,
    competency_criteria_id INT NOT NULL,
    difficulty_level       ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Medium',
    question_text          TEXT NOT NULL,
    sample_answer          TEXT NULL,
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_questions PRIMARY KEY (id),
    CONSTRAINT fk_questions_competencies FOREIGN KEY (competency_criteria_id) REFERENCES competencies (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.7. Thông tin doanh nghiệp (company_profile)
CREATE TABLE company_profile (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NULL,
    description TEXT NULL,
    logo_url    VARCHAR(255) NULL,
    banner_url  VARCHAR(255) NULL,
    website     VARCHAR(255) NULL,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.8. Ngân sách định biên phòng ban (department_budgets)
CREATE TABLE department_budgets (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    department_id        INT NOT NULL,
    budget_year          INT NOT NULL,
    total_headcount      INT NOT NULL,
    total_salary_budget  DECIMAL(20,2) NULL,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_db_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT,
    CONSTRAINT uq_dept_year UNIQUE (department_id, budget_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================================================
-- PHẦN 3: SPRINT 3 - YÊU CẦU TUYỂN DỤNG, PHÊ DUYỆT ĐA CẤP, TIN TUYỂN DỤNG & QUẢN LÝ HỒ SƠ ỨNG VIÊN
-- ====================================================================================================

-- 3.1. Yêu cầu tuyển dụng (recruitment_requests)
CREATE TABLE recruitment_requests (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    department_id          INT NULL,
    position_id            INT NULL,
    headcount              INT NULL,
    reason                 VARCHAR(100) NULL,
    proposed_salary_min    DECIMAL(15,2) NULL,
    proposed_salary_max    DECIMAL(15,2) NULL,
    needed_by_date         DATE NULL,
    job_description        TEXT NULL,
    candidate_requirements TEXT NULL,
    salary_explanation     TEXT NULL,
    status                 VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING, APPROVED, REJECTED, NEEDS_REVISION, CLOSED
    rejection_reason       TEXT NULL,
    work_location_code     VARCHAR(50) NULL,
    work_type_code         VARCHAR(50) NULL,
    recruiter_id           INT NULL,
    current_step           INT NULL,
    submitted_at           DATETIME NULL,
    created_by             INT NOT NULL,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_rr_department FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL,
    CONSTRAINT fk_rr_position FOREIGN KEY (position_id) REFERENCES job_positions(position_id) ON DELETE SET NULL,
    CONSTRAINT fk_rr_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2. Cấu hình luồng phê duyệt Yêu cầu tuyển dụng (approval_workflows)
CREATE TABLE approval_workflows (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    department_id      INT NULL, -- NULL nghĩa là áp dụng chung mọi phòng ban
    min_salary         DECIMAL(15,2) NULL,
    max_salary         DECIMAL(15,2) NULL,
    step_number        INT NOT NULL,
    step_name          VARCHAR(150) NULL,
    step_description   VARCHAR(255) NULL,
    approver_role_code VARCHAR(50) NOT NULL, -- Ví dụ: HR_MANAGER, APPROVER
    updated_by         INT NULL,
    updated_at         TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3. Snapshot các bước duyệt của Yêu cầu tuyển dụng (recruitment_request_approval_steps)
CREATE TABLE recruitment_request_approval_steps (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    recruitment_request_id INT NOT NULL,
    step_number            INT NOT NULL,
    step_name              VARCHAR(150) NULL,
    approver_role_code     VARCHAR(50) NOT NULL,
    threshold_min          DECIMAL(15,2) NULL,
    threshold_max          DECIMAL(15,2) NULL,
    is_escalated           TINYINT(1) NOT NULL DEFAULT 0,
    status                 VARCHAR(20) NOT NULL DEFAULT 'WAITING', -- WAITING, IN_PROGRESS, APPROVED, REJECTED
    acted_by               INT NULL,
    acted_at               DATETIME NULL,
    comment                TEXT NULL,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rras_request FOREIGN KEY (recruitment_request_id) REFERENCES recruitment_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_rras_request ON recruitment_request_approval_steps (recruitment_request_id, step_number);

-- 3.4. Lịch sử phê duyệt Yêu cầu tuyển dụng (recruitment_request_approvals)
CREATE TABLE recruitment_request_approvals (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    recruitment_request_id INT NOT NULL,
    approver_id            INT NOT NULL,
    action                 ENUM('APPROVED', 'REJECTED', 'REQUEST_CHANGE') NOT NULL,
    comment                TEXT,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rra_request FOREIGN KEY (recruitment_request_id) REFERENCES recruitment_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_rra_approver FOREIGN KEY (approver_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.5. Tin tuyển dụng phát hành (job_postings)
CREATE TABLE job_postings (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    recruitment_request_id INT NOT NULL,
    department_id          INT NULL,
    title                  VARCHAR(255) NOT NULL,
    description            TEXT NOT NULL,
    requirements           TEXT NULL,
    benefits               TEXT NULL,
    work_location          VARCHAR(255) NULL,
    job_type               VARCHAR(100) NULL,
    salary_display         VARCHAR(255) NULL,
    deadline               DATE NULL,
    status                 VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, PUBLISHED, HIDDEN, CLOSED
    review_note            TEXT NULL,
    submitted_by           INT NULL,
    submitted_at           DATETIME NULL,
    reviewed_by            INT NULL,
    reviewed_at            DATETIME NULL,
    published_by           INT NULL,
    published_at           DATETIME NULL,
    hidden_by              INT NULL,
    hidden_at              DATETIME NULL,
    closed_at              DATETIME NULL,
    created_by             INT NULL,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_jp_req FOREIGN KEY (recruitment_request_id) REFERENCES recruitment_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.6. Bảng Ứng viên (candidates)
CREATE TABLE candidates (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    application_code      VARCHAR(50) NULL, -- Mã tra cứu hồ sơ (ví dụ: HS2610-00001)
    full_name             VARCHAR(150) NOT NULL,
    email                 VARCHAR(150) NOT NULL,
    phone                 VARCHAR(50) NULL,
    status                VARCHAR(30) NOT NULL DEFAULT 'NEW', -- NEW, SCREENING, INTERVIEWING, OFFERED, HIRED, REJECTED
    current_stage         VARCHAR(50) NOT NULL DEFAULT 'NEW',
    source_code           VARCHAR(50) NULL,
    rejection_reason_code VARCHAR(50) NULL,
    rejection_note        TEXT NULL,
    recruitment_request_id INT NULL,
    resume_url            VARCHAR(500) NULL,
    cv_file_path          VARCHAR(500) NULL,
    cover_letter          TEXT NULL,
    tracking_code         VARCHAR(50) UNIQUE NULL,
    parsed_skills         TEXT NULL,
    rating                INT DEFAULT 0, -- Đánh giá chung sàng lọc 1-5 sao
    is_talent_pool        TINYINT(1) DEFAULT 0,
    tags                  VARCHAR(500) NULL,
    merged_into_id        INT NULL,
    merged_at             DATETIME NULL,
    stage_changed_at      DATETIME NULL,
    stage_changed_by      INT NULL,
    sla_overdue           TINYINT(1) NOT NULL DEFAULT 0,
    sla_flagged_at        DATETIME NULL,
    created_by            INT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_candidates_email (email),
    INDEX idx_candidates_phone (phone),
    CONSTRAINT fk_cand_req FOREIGN KEY (recruitment_request_id) REFERENCES recruitment_requests(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.7. Tài khoản ứng viên trên Cổng Portal (candidate_accounts)
CREATE TABLE candidate_accounts (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id          INT NOT NULL UNIQUE,
    email                 VARCHAR(150) NOT NULL UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until          DATETIME NULL,
    last_login_at         DATETIME NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_ca_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.8. Đơn nộp ứng tuyển (candidate_applications)
CREATE TABLE candidate_applications (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    application_code       VARCHAR(50) UNIQUE NULL,
    candidate_id           INT NOT NULL,
    job_posting_id         INT NOT NULL,
    recruitment_request_id INT NULL,
    status                 VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    resume_url             VARCHAR(500) NULL,
    cover_letter           TEXT NULL,
    applied_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_candidate_job_application (candidate_id, job_posting_id),
    CONSTRAINT fk_cap_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_cap_posting FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.9. Pipeline Tuyển dụng, Ghi chú, Nhãn & Hoạt động ứng viên
CREATE TABLE pipeline_stages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    stage_code  VARCHAR(50) NOT NULL UNIQUE,
    stage_name  VARCHAR(100) NOT NULL,
    stage_order INT NOT NULL,
    description TEXT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_notes (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    author_id    INT NOT NULL,
    note_content TEXT NOT NULL,
    updated_by   INT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_cn_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_cn_author FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_tags (
    candidate_id INT NOT NULL,
    tag_id       INT NOT NULL,
    created_by   INT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (candidate_id, tag_id),
    CONSTRAINT fk_ct_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_ct_tag FOREIGN KEY (tag_id) REFERENCES master_data(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ct_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_activities (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    performed_by INT NULL,
    action_type  VARCHAR(50) NOT NULL,
    details      TEXT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cact_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE candidate_stage_history (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id          INT NOT NULL,
    from_stage            VARCHAR(50) NULL,
    to_stage              VARCHAR(50) NOT NULL,
    rejection_reason_code VARCHAR(50) NULL,
    rejection_note        TEXT NULL,
    changed_by            INT NULL,
    changed_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_csh_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.10. Gộp hồ sơ trùng (candidate_merges) & Cấu hình SLA
CREATE TABLE candidate_merges (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    primary_id         INT NOT NULL,
    secondary_id       INT NOT NULL,
    primary_snapshot   JSON NULL,
    secondary_snapshot JSON NULL,
    chosen_fields      JSON NULL,
    moved_children     JSON NULL,
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    merged_by          INT NOT NULL,
    merged_at          DATETIME NOT NULL,
    undone_by          INT NULL,
    undone_at          DATETIME NULL,

    CONSTRAINT fk_cm_primary FOREIGN KEY (primary_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_cm_secondary FOREIGN KEY (secondary_id) REFERENCES candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sla_configs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    stage_code VARCHAR(50) NOT NULL UNIQUE,
    max_days   INT NOT NULL,
    is_active  TINYINT(1) NOT NULL DEFAULT 1,
    updated_by INT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sla_reminders (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id  INT NOT NULL,
    recipient_id  INT NOT NULL,
    stage_code    VARCHAR(50) NOT NULL,
    reminder_date DATE NOT NULL,
    overdue_days  INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_sla_reminder_day (candidate_id, recipient_id, reminder_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================================================
-- PHẦN 4: SPRINT 4 - PHỎNG VẤN & ĐÁNH GIÁ NĂNG LỰC, QUYẾT ĐỊNH TUYỂN DỤNG, OFFER & THÔNG BÁO
-- (BAO GỒM ĐẦY ĐỦ 5 USER STORIES TRONG ĐẶC TẢ)
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 4.1. LỊCH PHỎNG VẤN (Phân công người phỏng vấn, phòng họp, thời gian)
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE interview_schedules (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id   INT NOT NULL,
    position_id    INT NOT NULL,
    round_number   INT NOT NULL DEFAULT 1, -- Vòng 1, Vòng 2, v.v.
    round_name     VARCHAR(100) NOT NULL DEFAULT 'Phỏng vấn chuyên môn',
    interviewer_id INT NOT NULL,           -- Người phỏng vấn được phân công
    room_id        INT NULL,               -- Phòng phỏng vấn (từ master_data)
    mode           ENUM('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
    meeting_url    VARCHAR(500) NULL,      -- Link Google Meet / MS Teams nếu online
    location       VARCHAR(255) NULL,      -- Địa điểm cụ thể nếu offline
    start_at       DATETIME NOT NULL,
    end_at         DATETIME NOT NULL,
    notes          TEXT NULL,
    status         ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    created_by     INT NOT NULL,
    updated_by     INT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_is_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_is_position FOREIGN KEY (position_id) REFERENCES job_positions(position_id) ON DELETE RESTRICT,
    CONSTRAINT fk_is_interviewer FOREIGN KEY (interviewer_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_is_room FOREIGN KEY (room_id) REFERENCES master_data(id) ON DELETE SET NULL,
    CONSTRAINT fk_is_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_is_time CHECK (end_at > start_at),
    INDEX idx_is_interviewer_time (interviewer_id, status, start_at),
    INDEX idx_is_candidate_time (candidate_id, start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng lịch phỏng vấn kết nối với đơn ứng tuyển (candidate_interviews - hỗ trợ Candidate Portal)
CREATE TABLE candidate_interviews (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    application_id     INT NOT NULL,
    interview_schedule_id INT NULL,
    starts_at          DATETIME NOT NULL,
    ends_at            DATETIME NULL,
    mode               VARCHAR(40) NOT NULL DEFAULT 'ONLINE',
    location           VARCHAR(255) NULL,
    meeting_url        VARCHAR(500) NULL,
    interviewer_name   VARCHAR(150) NULL,
    notes              TEXT NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    candidate_response TEXT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ci_application FOREIGN KEY (application_id) REFERENCES candidate_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_ci_schedule FOREIGN KEY (interview_schedule_id) REFERENCES interview_schedules(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------------------------------
-- 4.2. USER STORY 1: PHIẾU ĐÁNH GIÁ PHỎNG VẤN THEO KHUNG NĂNG LỰC
-- Đặc tả:
-- - Chỉ người phỏng vấn được phân công mới có quyền chấm phiếu.
-- - Hiển thị tiêu chí và trọng số từ khung năng lực đã cấu hình; điểm từng tiêu chí từ 1-5.
-- - Tính điểm tổng hợp theo trọng số, xử lý trường hợp thiếu trọng số.
-- - Nhập nhận xét, kết luận Nên tuyển/Cân nhắc/Không nên tuyển.
-- - Tránh tạo hai phiếu chốt cho cùng một lượt (UNIQUE KEY schedule_id + interviewer_id).
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE interview_evaluations (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    interview_schedule_id INT NOT NULL,
    candidate_id          INT NOT NULL,
    interviewer_id        INT NOT NULL, -- Người chấm phiếu
    round_number          INT NOT NULL DEFAULT 1,
    total_score           DECIMAL(4,2) NULL, -- Điểm tổng hợp tính theo trọng số (thang 5.0)
    recommendation        ENUM('RECOMMENDED', 'CONSIDER', 'NOT_RECOMMENDED') NOT NULL, -- Nên tuyển, Cân nhắc, Không nên tuyển
    general_comments      TEXT NOT NULL, -- Nhận xét bắt buộc trước khi nộp
    status                ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'SUBMITTED',
    submitted_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_eval_schedule_interviewer UNIQUE (interview_schedule_id, interviewer_id),
    CONSTRAINT fk_eval_schedule FOREIGN KEY (interview_schedule_id) REFERENCES interview_schedules(id) ON DELETE CASCADE,
    CONSTRAINT fk_eval_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_eval_interviewer FOREIGN KEY (interviewer_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_eval_candidate ON interview_evaluations (candidate_id, round_number);

-- Chi tiết điểm chấm từng tiêu chí năng lực trong phiếu đánh giá
CREATE TABLE interview_evaluation_details (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT NOT NULL,
    criteria_id   INT NOT NULL,
    criteria_name VARCHAR(150) NOT NULL, -- Lưu snapshot tên tiêu chí
    weight        DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- Trọng số % tại thời điểm chấm (ví dụ: 25.00 = 25%)
    score         TINYINT UNSIGNED NOT NULL, -- Điểm 1 - 5 sao
    comments      TEXT NULL, -- Nhận xét chi tiết cho từng tiêu chí
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_eval_score CHECK (score BETWEEN 1 AND 5),
    CONSTRAINT uq_eval_criteria UNIQUE (evaluation_id, criteria_id),
    CONSTRAINT fk_ed_eval FOREIGN KEY (evaluation_id) REFERENCES interview_evaluations(id) ON DELETE CASCADE,
    CONSTRAINT fk_ed_criteria FOREIGN KEY (criteria_id) REFERENCES competency_criteria(criteria_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------------------------------
-- 4.3. USER STORY 2: QUYẾT ĐỊNH TUYỂN DỤNG CỦA TRƯỞNG BỘ PHẬN (HIRING DECISION)
-- Đặc tả:
-- - Trưởng bộ phận xem điểm/nhận xét theo từng vòng, không đếm trùng phiếu.
-- - Tổng hợp điểm theo quy tắc rõ ràng, hiển thị trường hợp thiếu phiếu.
-- - Trưởng bộ phận chọn Đạt/Không đạt, nhập nhận xét và xác nhận quyết định.
-- - Lưu người quyết định, thời gian, trạng thái hồ sơ.
-- - Chỉ hồ sơ có quyết định 'PASSED' (Đạt) mới đủ điều kiện tạo Offer.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE candidate_hiring_decisions (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id           INT NOT NULL,
    recruitment_request_id INT NULL,
    department_id          INT NOT NULL, -- Phân quyền theo phòng ban của Hiring Manager
    decision_maker_id      INT NOT NULL, -- Trưởng bộ phận ra quyết định (Hiring Manager)
    decision               ENUM('PASSED', 'FAILED') NOT NULL, -- ĐẠT hoặc KHÔNG ĐẠT
    comments               TEXT NOT NULL, -- Nhận xét, căn cứ đánh giá
    total_rounds_evaluated INT NOT NULL DEFAULT 1,
    average_score          DECIMAL(4,2) NULL, -- Điểm bình quân tổng hợp từ các vòng
    decided_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_cand_decision UNIQUE (candidate_id, recruitment_request_id),
    CONSTRAINT fk_chd_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_chd_req FOREIGN KEY (recruitment_request_id) REFERENCES recruitment_requests(id) ON DELETE SET NULL,
    CONSTRAINT fk_chd_dept FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT,
    CONSTRAINT fk_chd_maker FOREIGN KEY (decision_maker_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------------------------------
-- 4.4. USER STORY 3: NHÂN VIÊN TUYỂN DỤNG SOẠN OFFER, LƯU NHÁP VÀ GỬI DUYỆT
-- Đặc tả:
-- - Chỉ hồ sơ đã có quyết định Đạt mới được tạo Offer.
-- - Offer có: chức danh, phòng ban, mức lương, ngày dự kiến nhận việc, hạn phản hồi.
-- - Có Lưu nháp (DRAFT), Chỉnh sửa nháp, Gửi duyệt (PENDING_APPROVAL); kiểm tra trường bắt buộc.
-- - Khi gửi duyệt, chuyển trạng thái Chờ duyệt; người tạo không được tự ý sửa khi đang chờ duyệt.
-- - Offer bị Yêu cầu chỉnh sửa (CHANGE_REQUESTED) được sửa và gửi lại.
-- - Không tạo Offer hiệu lực trùng cho cùng hồ sơ.
-- - Ghi nhận người tạo, thời gian, lịch sử gửi duyệt.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE candidate_offers (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    offer_code              VARCHAR(50) NOT NULL UNIQUE, -- Mã offer, ví dụ: OFF-202610-0001
    candidate_id            INT NOT NULL,
    application_id          INT NULL,
    recruitment_request_id  INT NULL,
    hiring_decision_id      INT NULL, -- Liên kết quyết định Đạt của Trưởng bộ phận
    department_id           INT NOT NULL,
    position_id             INT NOT NULL,
    job_title               VARCHAR(150) NOT NULL, -- Chức danh công việc trong Offer
    basic_salary            DECIMAL(15,2) NOT NULL, -- Mức lương chính thức (Gross/Net)
    probation_salary        DECIMAL(15,2) NULL, -- Mức lương thử việc (ví dụ 85%)
    probation_period_months INT NOT NULL DEFAULT 2, -- Thời gian thử việc (tháng)
    currency                VARCHAR(10) NOT NULL DEFAULT 'VND',
    expected_start_date     DATE NOT NULL, -- Ngày dự kiến nhận việc
    response_deadline       DATE NOT NULL, -- Hạn phản hồi Offer
    work_location           VARCHAR(255) NULL,
    benefits                TEXT NULL, -- Chế độ phúc lợi, bảo hiểm, phụ cấp
    message                 TEXT NULL, -- Thư ngỏ gửi ứng viên
    special_terms           TEXT NULL, -- Điều khoản đặc biệt khác
    status                  VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    -- Các trạng thái: DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, CHANGE_REQUESTED, SENT, ACCEPTED, DECLINED, EXPIRED, CANCELLED
    created_by              INT NOT NULL, -- Recruiter tạo Offer
    submitted_at            DATETIME NULL, -- Thời điểm gửi duyệt
    approved_at             DATETIME NULL, -- Thời điểm được duyệt
    sent_to_candidate_at    DATETIME NULL, -- Thời điểm phát hành tới ứng viên
    responded_at            DATETIME NULL, -- Thời điểm ứng viên phản hồi
    candidate_response      TEXT NULL,     -- Ghi chú phản hồi hoặc lý do từ chối của ứng viên
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_co_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_co_app FOREIGN KEY (application_id) REFERENCES candidate_applications(id) ON DELETE SET NULL,
    CONSTRAINT fk_co_req FOREIGN KEY (recruitment_request_id) REFERENCES recruitment_requests(id) ON DELETE SET NULL,
    CONSTRAINT fk_co_decision FOREIGN KEY (hiring_decision_id) REFERENCES candidate_hiring_decisions(id) ON DELETE SET NULL,
    CONSTRAINT fk_co_dept FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE RESTRICT,
    CONSTRAINT fk_co_pos FOREIGN KEY (position_id) REFERENCES job_positions(position_id) ON DELETE RESTRICT,
    CONSTRAINT fk_co_creator FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_co_candidate_status (candidate_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------------------------------
-- 4.5. USER STORY 4: PHÊ DUYỆT OFFER, PHÁT HÀNH TỚI ỨNG VIÊN & ONBOARDING
-- Đặc tả:
-- - Người duyệt có danh sách Offer Chờ duyệt; được Duyệt/Từ chối/Yêu cầu chỉnh sửa đúng quyền.
-- - Từ chối hoặc yêu cầu chỉnh sửa bắt buộc có lý do; ghi lịch sử người xử lý, thời gian, hành động.
-- - Chỉ Offer được duyệt mới có thể phát hành tới đúng ứng viên.
-- - Tận dụng trang & API ứng viên Chấp nhận/Từ chối Offer hiện có, nối với luồng duyệt mới.
-- - Không cho phản hồi Offer hết hạn, chưa phát hành hoặc đã phản hồi; xử lý chuyển trạng thái đúng.
-- - Khi ứng viên chấp nhận thì cho phép Onboarding; khi từ chối thì lưu kết quả và thông báo cho Recruiter.
-- ----------------------------------------------------------------------------------------------------

-- Lịch sử xử lý phê duyệt Offer (offer_approvals)
CREATE TABLE offer_approvals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    offer_id    INT NOT NULL,
    approver_id INT NOT NULL, -- Người có thẩm quyền phê duyệt
    action      ENUM('APPROVED', 'REJECTED', 'REQUEST_CHANGE') NOT NULL,
    reason      TEXT NULL, -- Bắt buộc nếu REJECTED hoặc REQUEST_CHANGE
    action_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_oa_offer FOREIGN KEY (offer_id) REFERENCES candidate_offers(id) ON DELETE CASCADE,
    CONSTRAINT fk_oa_approver FOREIGN KEY (approver_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_oa_offer ON offer_approvals (offer_id, action_at);

-- Bảng Quản lý Tiếp nhận & Nhận việc nhân viên mới (candidate_onboardings)
CREATE TABLE candidate_onboardings (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    offer_id            INT NOT NULL UNIQUE,
    candidate_id        INT NOT NULL,
    hr_in_charge_id     INT NOT NULL, -- Nhân viên nhân sự phụ trách onboarding
    official_start_date DATE NOT NULL,
    status              ENUM('PREPARING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PREPARING',
    equipment_ready     TINYINT(1) NOT NULL DEFAULT 0, -- Thiết bị, máy tính đã sẵn sàng
    account_created     TINYINT(1) NOT NULL DEFAULT 0, -- Email nội bộ & tài khoản hệ thống đã tạo
    contract_signed     TINYINT(1) NOT NULL DEFAULT 0, -- Hợp đồng thử việc đã ký kết
    orientation_done    TINYINT(1) NOT NULL DEFAULT 0, -- Đã hoàn thành đào tạo hội nhập
    checklist_notes     TEXT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_onb_offer FOREIGN KEY (offer_id) REFERENCES candidate_offers(id) ON DELETE CASCADE,
    CONSTRAINT fk_onb_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    CONSTRAINT fk_onb_hr FOREIGN KEY (hr_in_charge_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------------------------------
-- 4.6. USER STORY 5: HỆ THỐNG THÔNG BÁO TỰ ĐỘNG CHO MỌI VAI TRÒ
-- Đặc tả:
-- 1. Khi lịch phỏng vấn được phân công, thay đổi hoặc hủy -> Người phỏng vấn liên quan nhận thông báo.
-- 2. Khi Offer được gửi duyệt -> Người duyệt nhận thông báo.
-- 3. Khi Offer được duyệt, từ chối hoặc yêu cầu sửa -> Recruiter phụ trách nhận thông báo.
-- 4. Người dùng xem danh sách thông báo, đánh dấu Đã đọc/Chưa đọc và click mở đúng màn hình chức năng.
-- 5. Chỉ người liên quan mới được nhận và xem thông báo theo đúng quyền hạn.
-- 6. Tận dụng hệ thống thông báo hiện có, không xây dựng module mới hoặc trùng lặp.
-- ----------------------------------------------------------------------------------------------------

-- Bảng Thông báo nội bộ cho Nhân viên, Người phỏng vấn, Người duyệt, Trưởng bộ phận
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL, -- Người nhận thông báo
    title           VARCHAR(255) NOT NULL,
    message         TEXT NULL,
    type            VARCHAR(50) NOT NULL, 
    -- Các loại: INTERVIEW_ASSIGNED, INTERVIEW_UPDATED, INTERVIEW_CANCELLED, 
    --          OFFER_PENDING_APPROVAL, OFFER_APPROVED, OFFER_REJECTED, OFFER_CHANGE_REQUESTED,
    --          OFFER_ACCEPTED, OFFER_DECLINED, CANDIDATE_STAGE_CHANGED, SLA_WARNING
    link            VARCHAR(255) NULL, -- Đường dẫn trực tiếp đến màn hình thao tác
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_notifications_user_unread (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Thông báo trên Cổng ứng viên (candidate_notifications)
CREATE TABLE candidate_notifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    candidate_id INT NOT NULL,
    title        VARCHAR(255) NOT NULL,
    message      TEXT NULL,
    type         VARCHAR(50) NULL, -- INTERVIEW_INVITATION, OFFER_ISSUED, APPLICATION_STATUS
    link         VARCHAR(255) NULL,
    read_at      DATETIME NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cnotif_cand FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
    INDEX idx_candidate_notifications (candidate_id, read_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ====================================================================================================
-- PHẦN 5: DỮ LIỆU KHỞI TẠO & MẪU KIỂM THỬ TOÀN DIỆN CHO CẢ 4 SPRINTS
-- (ĐẦY ĐỦ CÁC TRƯỜNG HỢP KIỂM THỬ THỰC TẾ)
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 5.1. Dữ liệu Danh mục Phòng ban (departments)
-- ----------------------------------------------------------------------------------------------------
INSERT INTO departments (department_id, department_code, department_name, description) VALUES
(1, 'IT',  'Phòng Công nghệ Thông tin', 'Nghiên cứu phát triển phần mềm và hạ tầng kỹ thuật'),
(2, 'HR',  'Phòng Nhân sự',              'Quản lý nhân tài, tuyển dụng và đào tạo phát triển'),
(3, 'FIN', 'Phòng Tài chính Kế toán',    'Quản trị tài chính, dòng tiền và kiểm toán nội bộ'),
(4, 'MKT', 'Phòng Marketing',            'Truyền thông thương hiệu, tiếp thị số và mở rộng thị trường'),
(5, 'OPS', 'Phòng Vận hành Doanh nghiệp', 'Quản lý vận hành hệ thống chuỗi cung ứng và dịch vụ');

-- ----------------------------------------------------------------------------------------------------
-- 5.2. Dữ liệu Vai trò (roles) - 7 Vai trò chuẩn xác của hệ thống
-- ----------------------------------------------------------------------------------------------------
INSERT INTO roles (role_id, role_code, role_name, description) VALUES
(1, 'ADMIN',          'Quản trị hệ thống',     'Người vận hành ứng dụng, quản lý tài khoản, vai trò, danh mục'),
(2, 'HR_MANAGER',     'Trưởng phòng Nhân sự', 'Chủ sở hữu toàn bộ hoạt động tuyển dụng, giám sát ngân sách'),
(3, 'RECRUITER',      'Nhân viên tuyển dụng',  'Người vận hành tuyển dụng hằng ngày, sàng lọc CV, lên lịch, tạo offer'),
(4, 'HIRING_MANAGER', 'Trưởng bộ phận',       'Người sở hữu vị trí tuyển dụng, đánh giá và ra quyết định Đạt/Không đạt'),
(5, 'INTERVIEWER',    'Người phỏng vấn',       'Nhân sự tham gia phỏng vấn, nộp phiếu chấm điểm năng lực theo trọng số'),
(6, 'APPROVER',       'Người duyệt',          'Ban Giám đốc hoặc cấp phê duyệt yêu cầu tuyển dụng và duyệt Offer'),
(7, 'CANDIDATE',      'Ứng viên',             'Người nộp hồ sơ, tham gia phỏng vấn, phản hồi Thư mời nhận việc');

-- ----------------------------------------------------------------------------------------------------
-- 5.3. Dữ liệu Quyền hạn (permissions) & Phân quyền Vai trò
-- ----------------------------------------------------------------------------------------------------
INSERT INTO permissions (permission_code, permission_name, description) VALUES
('USER_VIEW',             'Xem danh sách tài khoản',     'Xem thông tin nhân sự hệ thống'),
('USER_MANAGE',           'Quản trị tài khoản',          'Tạo mới, khóa, mở khóa tài khoản'),
('ROLE_VIEW',             'Xem vai trò & quyền hạn',     'Xem cấu hình phân quyền'),
('ROLE_MANAGE',           'Quản trị phân quyền',         'Gán hoặc thu hồi vai trò'),
('COMPETENCY_MANAGE',     'Quản lý khung năng lực',      'Cấu hình tiêu chí và trọng số đánh giá'),
('REQUISITION_CREATE',    'Tạo yêu cầu tuyển dụng',      'Soạn thảo yêu cầu bổ sung nhân sự'),
('REQUISITION_APPROVE',   'Phê duyệt yêu cầu',           'Duyệt/từ chối yêu cầu định biên nhân sự'),
('JOB_POSTING_MANAGE',    'Quản lý tin tuyển dụng',      'Soạn, duyệt và đăng tin tuyển dụng'),
('CANDIDATE_MANAGE',      'Quản lý hồ sơ ứng viên',      'Sàng lọc, phân loại, gộp trùng hồ sơ'),
('INTERVIEW_SCHEDULE',    'Điều phối lịch phỏng vấn',    'Đặt lịch, phân công người phỏng vấn'),
('INTERVIEW_EVALUATE',    'Chấm phiếu phỏng vấn',        'Đánh giá theo tiêu chí năng lực và kết luận'),
('HIRING_DECIDE',         'Quyết định tuyển dụng',       'Chốt kết quả Đạt/Không đạt sau phỏng vấn'),
('OFFER_CREATE',          'Soạn thảo Offer',             'Tạo nháp và gửi duyệt Thư mời nhận việc'),
('OFFER_APPROVE',         'Phê duyệt Offer',             'Duyệt, từ chối hoặc yêu cầu chỉnh sửa Offer'),
('ONBOARDING_MANAGE',     'Quản lý Onboarding',          'Theo dõi checklist nhận việc của nhân viên mới');

-- Gán toàn quyền cho ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, permission_id FROM permissions;

-- Gán quyền cho HR_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, permission_id FROM permissions 
WHERE permission_code IN ('USER_VIEW', 'COMPETENCY_MANAGE', 'REQUISITION_CREATE', 'REQUISITION_APPROVE', 'JOB_POSTING_MANAGE', 'CANDIDATE_MANAGE', 'INTERVIEW_SCHEDULE', 'OFFER_CREATE', 'OFFER_APPROVE', 'ONBOARDING_MANAGE');

-- Gán quyền cho RECRUITER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, permission_id FROM permissions 
WHERE permission_code IN ('USER_VIEW', 'JOB_POSTING_MANAGE', 'CANDIDATE_MANAGE', 'INTERVIEW_SCHEDULE', 'OFFER_CREATE', 'ONBOARDING_MANAGE');

-- Gán quyền cho HIRING_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, permission_id FROM permissions 
WHERE permission_code IN ('USER_VIEW', 'REQUISITION_CREATE', 'INTERVIEW_EVALUATE', 'HIRING_DECIDE');

-- Gán quyền cho INTERVIEWER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, permission_id FROM permissions 
WHERE permission_code IN ('USER_VIEW', 'INTERVIEW_EVALUATE');

-- Gán quyền cho APPROVER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, permission_id FROM permissions 
WHERE permission_code IN ('USER_VIEW', 'REQUISITION_APPROVE', 'OFFER_APPROVE');

-- ----------------------------------------------------------------------------------------------------
-- 5.4. Dữ liệu Người dùng mẫu (Mật khẩu mặc định: '123456')
-- ----------------------------------------------------------------------------------------------------
INSERT INTO users (user_id, department_id, employee_code, full_name, company_email, phone_number, job_title, password_hash, status) VALUES
(1, 1, 'EMP001', 'Nguyễn Thị Hồng Nhung', 'dtc245200413@ictu.edu.vn', '0988888881', 'Quản trị viên Hệ thống',            '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(2, 2, 'EMP002', 'Hà Đức Minh',           'dtc245200002@ictu.edu.vn', '0988888882', 'Trưởng phòng Nhân sự',              '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(3, 2, 'EMP003', 'Nguyễn Anh Sơn',        'dtc245200852@ictu.edu.vn', '0988888883', 'Chuyên viên Tuyển dụng',            '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(4, 1, 'EMP004', 'Mã Dương Quốc',         'dtc245200935@ictu.edu.vn', '0988888884', 'Trưởng bộ phận Kỹ thuật (Hiring Mgr)', '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(5, 1, 'EMP005', 'Thàng Xuân Lập',        'dtc245200571@ictu.edu.vn', '0988888885', 'Kỹ sư Cấp cao (Interviewer)',      '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(6, 5, 'EMP006', 'Thảo A Pồng',           'dtc245200592@ictu.edu.vn', '0988888886', 'Giám đốc Vận hành (Approver)',      '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(7, 4, 'EMP007', 'Nguyễn Xuân Phú',       'dtc245200480@ictu.edu.vn', '0988888887', 'Trưởng bộ phận Marketing (Hiring)',  '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(8, 3, 'EMP008', 'Lưu Quang Lực',         'dtc245200349@ictu.edu.vn', '0988888888', 'Chuyên viên Tài chính (Interviewer)','$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE'),
(9, 2, 'EMP009', 'Long Minh Thành',       'dtc245200344@ictu.edu.vn', '0988888889', 'Chuyên viên Tuyển dụng Lead',       '$2b$10$YyuS5788uO.e/J0y081V5O6k9Jwu3PhCLmCuXRnsKOzfirRteds52', 'ACTIVE');

-- Cập nhật Trưởng phòng cho bảng departments
UPDATE departments SET manager_user_id = 4 WHERE department_id = 1;
UPDATE departments SET manager_user_id = 2 WHERE department_id = 2;
UPDATE departments SET manager_user_id = 8 WHERE department_id = 3;
UPDATE departments SET manager_user_id = 7 WHERE department_id = 4;
UPDATE departments SET manager_user_id = 6 WHERE department_id = 5;

-- Gán vai trò cho từng người dùng
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- Nhung: ADMIN
(2, 2), -- Minh: HR_MANAGER
(3, 3), -- Sơn: RECRUITER
(4, 4), -- Quốc: HIRING_MANAGER (Phòng IT)
(5, 5), -- Lập: INTERVIEWER (Phòng IT)
(6, 6), -- Pồng: APPROVER (Ban Giám Đốc)
(7, 4), -- Phú: HIRING_MANAGER (Phòng MKT)
(8, 5), -- Lực: INTERVIEWER (Phòng Tài chính)
(9, 3); -- Thành: RECRUITER

-- ----------------------------------------------------------------------------------------------------
-- 5.5. Dữ liệu Danh mục Master Data
-- ----------------------------------------------------------------------------------------------------
INSERT INTO master_data (category_group, code, name, description, display_order, is_active) VALUES
-- Nguồn ứng viên
('CANDIDATE_SOURCE', 'LINKEDIN',          'LinkedIn',                   'Mạng xã hội việc làm LinkedIn', 1, 1),
('CANDIDATE_SOURCE', 'TOPCV',             'TopCV Việt Nam',             'Cổng việc làm TopCV', 2, 1),
('CANDIDATE_SOURCE', 'VIETNAMWORKS',      'VietnamWorks',               'Cổng việc làm VietnamWorks', 3, 1),
('CANDIDATE_SOURCE', 'REFERRAL',          'Giới thiệu nội bộ',          'Cán bộ nhân viên công ty tiến cử', 4, 1),
('CANDIDATE_SOURCE', 'CAREER_SITE',       'Website Tuyển dụng',         'Cổng tuyển dụng trực tiếp công ty', 5, 1),

-- Lý do loại ứng viên
('REJECTION_REASON', 'NOT_MATCH_SKILL',   'Chuyên môn chưa đạt yêu cầu', 'Kỹ năng công nghệ chưa đáp ứng vị trí', 1, 1),
('REJECTION_REASON', 'HIGH_SALARY',       'Kỳ vọng lương vượt ngân sách','Mức lương đề xuất cao hơn dải lương', 2, 1),
('REJECTION_REASON', 'CULTURE_FIT',       'Chưa phù hợp văn hóa',       'Thái độ và định hướng chưa tương thích', 3, 1),
('REJECTION_REASON', 'FAILED_TEST',       'Không đạt bài kiểm tra',     'Điểm test năng lực dưới điểm sàn', 4, 1),

-- Địa điểm làm việc
('WORK_LOCATION',    'HN_CAUGIAY',        'Hà Nội - Tòa nhà TechCorp',  'Số 1 Duy Tân, Cầu Giấy, Hà Nội', 1, 1),
('WORK_LOCATION',    'HCM_Q1',            'TP.HCM - Bitexco Financial', 'Số 2 Hải Triều, Bến Nghé, Quận 1', 2, 1),
('WORK_LOCATION',    'DANANG_HAICHAU',    'Đà Nẵng - Trung tâm Phần mềm','Đường Bạch Đằng, Hải Châu, Đà Nẵng', 3, 1),

-- Phòng phỏng vấn
('INTERVIEW_ROOM',   'ROOM_101',          'Phòng Phỏng Vấn 1 (Tầng 2)', 'Phòng phỏng vấn trực tiếp số 1', 1, 1),
('INTERVIEW_ROOM',   'ROOM_102',          'Phòng Phỏng Vấn 2 (Tầng 2)', 'Phòng phỏng vấn trực tiếp số 2', 2, 1),
('INTERVIEW_ROOM',   'ROOM_ONLINE',       'Phòng Họp Online (Google Meet)', 'Họp trực tuyến qua Google Meet', 3, 1),
('INTERVIEW_ROOM',   'ROOM_VIP',          'Phòng Họp Ban Giám Đốc',     'Phỏng vấn vòng cuối cấp cao', 4, 1);

-- ----------------------------------------------------------------------------------------------------
-- 5.6. Dữ liệu Khung năng lực & Tiêu chí có Trọng số (US 1)
-- ----------------------------------------------------------------------------------------------------
INSERT INTO competency_frameworks (framework_id, framework_code, framework_name, description) VALUES
(1, 'CF_TECH_DEV', 'Khung Năng Lực Lập Trình Viên (Software Engineer)', 'Đánh giá năng lực kỹ thuật, tư duy thuật toán và giải quyết vấn đề'),
(2, 'CF_BUSINESS', 'Khung Năng Lực Khối Kinh Doanh & Vận Hành',        'Đánh giá kỹ năng giao tiếp, đàm phán, quản lý mục tiêu');

INSERT INTO competency_criteria (criteria_id, framework_id, criteria_name, weight, description) VALUES
-- Khung Kỹ thuật (Tổng = 100%)
(1, 1, 'Tư duy logic & Thuật toán',         25.00, 'Khả năng phân tích bài toán, thiết kế giải thuật tối ưu'),
(2, 1, 'Kiến thức Chuyên môn Kỹ thuật',     35.00, 'Nắm vững kiến trúc phần mềm, ngôn ngữ lập trình, CSDL, Clean Code'),
(3, 1, 'Kỹ năng giải quyết sự cố (Debug)',   20.00, 'Khả năng phân tích nguyên nhân gốc rễ và đề xuất phương án khắc phục'),
(4, 1, 'Làm việc nhóm & Giao tiếp kỹ thuật',10.00, 'Phối hợp hiệu quả với đồng nghiệp, viết tài liệu rõ ràng'),
(5, 1, 'Trình độ Tiếng Anh chuyên ngành',    10.00, 'Đọc hiểu tài liệu kỹ thuật và trao đổi cơ bản');

-- ----------------------------------------------------------------------------------------------------
-- 5.7. Dữ liệu Vị trí công việc (job_positions)
-- ----------------------------------------------------------------------------------------------------
INSERT INTO job_positions (position_id, position_code, position_name, position_level, min_salary, max_salary, competency_framework_id, status) VALUES
(1, 'BE_DEV',        'Backend Developer',        'Senior', 20000000, 35000000, 1, 'ACTIVE'),
(2, 'FE_DEV',        'Frontend Developer',       'Middle', 15000000, 25000000, 1, 'ACTIVE'),
(3, 'FULLSTACK_DEV', 'Fullstack Developer',      'Senior', 22000000, 40000000, 1, 'ACTIVE'),
(4, 'HR_EXEC',       'Chuyên viên Tuyển dụng',   'Middle', 12000000, 18000000, 2, 'ACTIVE'),
(5, 'TESTER_QA',     'Kỹ sư Kiểm thử phần mềm',  'Middle', 13000000, 22000000, 1, 'ACTIVE');

-- ----------------------------------------------------------------------------------------------------
-- 5.8. Dữ liệu Pipeline Stages
-- ----------------------------------------------------------------------------------------------------
INSERT INTO pipeline_stages (stage_code, stage_name, stage_order, description) VALUES
('NEW',          'Ứng tuyển mới',        1, 'Hồ sơ mới nộp từ các nguồn'),
('SCREENING',    'Sàng lọc hồ sơ',      2, 'Recruiter đánh giá CV'),
('INTERVIEW',    'Phỏng vấn đánh giá',  3, 'Các vòng phỏng vấn chuyên môn'),
('OFFER',        'Đề xuất nhận việc',   4, 'Soạn thảo, phê duyệt và gửi Offer'),
('HIRED',        'Đã nhận việc',        5, 'Ứng viên đồng ý và tiếp nhận Onboarding'),
('REJECTED',     'Không phù hợp',       6, 'Hồ sơ bị từ chối');

-- ----------------------------------------------------------------------------------------------------
-- 5.9. Dữ liệu Yêu cầu tuyển dụng & Tin tuyển dụng
-- ----------------------------------------------------------------------------------------------------
INSERT INTO recruitment_requests (id, department_id, position_id, headcount, reason, proposed_salary_min, proposed_salary_max, needed_by_date, job_description, status, created_by) VALUES
(1, 1, 1, 2, 'Mở rộng đội ngũ dự án Core Banking Cloud', 22000000, 35000000, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'Tuyển dụng Backend Developer nắm vững Node.js, MySQL, Redis, Microservices', 'APPROVED', 4),
(2, 1, 2, 3, 'Phát triển giao diện hệ thống Quản trị tuyển dụng', 15000000, 25000000, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'Tuyển dụng Frontend Developer thành thạo React.js, TailwindCSS', 'APPROVED', 4);

INSERT INTO job_postings (id, recruitment_request_id, department_id, title, description, requirements, benefits, work_location, job_type, salary_display, deadline, status, created_by) VALUES
(1, 1, 1, 'Senior Backend Developer (Node.js/MySQL)', 'Tham gia phát triển hạ tầng Microservices và CSDL hiệu năng cao', 'Trên 3 năm kinh nghiệm lập trình backend, thành thạo SQL', 'Lương tháng 13, thưởng dự án, bảo hiểm sức khỏe VIP', 'Số 1 Duy Tân, Cầu Giấy, Hà Nội', 'Toàn thời gian', '22 - 35 triệu', DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'PUBLISHED', 3),
(2, 2, 1, 'Middle Frontend Developer (React.js)', 'Xây dựng giao diện web ứng dụng mượt mà, chuẩn UI/UX', 'Trên 2 năm kinh nghiệm React, CSS hiện đại', 'Môi trường trẻ trung, du lịch hàng năm, phụ cấp thiết bị', 'Số 1 Duy Tân, Cầu Giấy, Hà Nội', 'Toàn thời gian', '15 - 25 triệu', DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'PUBLISHED', 3);

-- ----------------------------------------------------------------------------------------------------
-- 5.10. Dữ liệu Ứng viên (candidates) & Đơn ứng tuyển
-- ----------------------------------------------------------------------------------------------------
INSERT INTO candidates (id, application_code, full_name, email, phone, status, current_stage, source_code, recruitment_request_id, resume_url, created_by) VALUES
(1, 'HS2610-00001', 'Trần Văn Mạnh',     'manh.tran@gmail.com',     '0912345671', 'INTERVIEWING', 'INTERVIEW', 'LINKEDIN', 1, 'cv_tran_van_manh.pdf', 3),
(2, 'HS2610-00002', 'Nguyễn Quỳnh Anh',  'quynhanh.nguyen@gmail.com','0912345672', 'OFFERED',       'OFFER',     'TOPCV',    1, 'cv_nguyen_quynh_anh.pdf', 3),
(3, 'HS2610-00003', 'Đặng Tuấn Kiệt',    'tuankiet.dang@gmail.com',  '0912345673', 'HIRED',         'HIRED',     'REFERRAL', 1, 'cv_dang_tuan_kiet.pdf', 3),
(4, 'HS2610-00004', 'Lê Hoàng Yến Nhi',  'yennhi.le@gmail.com',      '0912345674', 'REJECTED',      'REJECTED',  'VIETNAMWORKS', 1, 'cv_le_hoang_yen_nhi.pdf', 3);

INSERT INTO candidate_applications (id, application_code, candidate_id, job_posting_id, recruitment_request_id, status, resume_url) VALUES
(1, 'HS2610-00001', 1, 1, 1, 'INTERVIEWING', 'cv_tran_van_manh.pdf'),
(2, 'HS2610-00002', 2, 1, 1, 'OFFERED',       'cv_nguyen_quynh_anh.pdf'),
(3, 'HS2610-00003', 3, 1, 1, 'HIRED',         'cv_dang_tuan_kiet.pdf'),
(4, 'HS2610-00004', 4, 1, 1, 'REJECTED',      'cv_le_hoang_yen_nhi.pdf');

-- ----------------------------------------------------------------------------------------------------
-- 5.11. Dữ liệu Lịch phỏng vấn (interview_schedules) - Phân công Interviewer
-- ----------------------------------------------------------------------------------------------------
INSERT INTO interview_schedules (id, candidate_id, position_id, round_number, round_name, interviewer_id, room_id, mode, start_at, end_at, notes, status, created_by) VALUES
(1, 1, 1, 1, 'Vòng 1: Phỏng vấn Kỹ thuật Backend', 5, 1, 'OFFLINE', '2026-10-20 09:00:00', '2026-10-20 10:30:00', 'Phỏng vấn chuyên sâu Node.js, CSDL và xử lý đồng thời', 'COMPLETED', 3),
(2, 2, 1, 1, 'Vòng 1: Phỏng vấn Kỹ thuật Backend', 5, 2, 'OFFLINE', '2026-10-18 14:00:00', '2026-10-18 15:30:00', 'Phỏng vấn chuyên môn và giải thuật hệ thống', 'COMPLETED', 3),
(3, 3, 1, 1, 'Vòng 1: Phỏng vấn Kỹ thuật Backend', 5, 3, 'ONLINE',  '2026-10-15 10:00:00', '2026-10-15 11:30:00', 'Phỏng vấn trực tuyến ứng viên xuất sắc', 'COMPLETED', 3),
(4, 4, 1, 1, 'Vòng 1: Phỏng vấn Kỹ thuật Backend', 5, 1, 'OFFLINE', '2026-10-16 09:00:00', '2026-10-16 10:00:00', 'Đánh giá kiến thức nền tảng', 'COMPLETED', 3);

-- ----------------------------------------------------------------------------------------------------
-- 5.12. Dữ liệu Phiếu đánh giá phỏng vấn (US 1)
-- ----------------------------------------------------------------------------------------------------
-- Phiếu 1: Ứng viên 2 (Quỳnh Anh) - Điểm tổng hợp theo trọng số: 4.45 / 5.0 -> Khuyến nghị: RECOMMENDED (Nên tuyển)
-- Cách tính: (5 * 0.25) + (4 * 0.35) + (5 * 0.20) + (4 * 0.10) + (4 * 0.10) = 1.25 + 1.40 + 1.00 + 0.40 + 0.40 = 4.45
INSERT INTO interview_evaluations (id, interview_schedule_id, candidate_id, interviewer_id, round_number, total_score, recommendation, general_comments, status, submitted_at) VALUES
(1, 2, 2, 5, 1, 4.45, 'RECOMMENDED', 'Ứng viên nắm rất vững kiến trúc backend, tư duy giải thuật xuất sắc, thái độ cầu tiến và phản xạ tình huống nhanh nhạy. Rất nên tuyển.', 'SUBMITTED', '2026-10-18 16:00:00'),

-- Phiếu 2: Ứng viên 3 (Tuấn Kiệt) - Điểm: 4.60 / 5.0 -> RECOMMENDED
(2, 3, 3, 5, 1, 4.60, 'RECOMMENDED', 'Chuyên môn vượt trội, có kinh nghiệm triển khai thực tế các hệ thống tải lớn, tiếng Anh lưu loát. Đề xuất tiếp nhận ngay.', 'SUBMITTED', '2026-10-15 12:00:00'),

-- Phiếu 3: Ứng viên 4 (Yến Nhi) - Điểm: 2.30 / 5.0 -> NOT_RECOMMENDED
(3, 4, 4, 5, 1, 2.30, 'NOT_RECOMMENDED', 'Kiến thức về tối ưu truy vấn CSDL và xử lý bất đồng bộ còn yếu, chưa đáp ứng yêu cầu cấp độ Senior.', 'SUBMITTED', '2026-10-16 11:00:00');

-- Chi tiết chấm điểm từng tiêu chí cho Phiếu 1 (Ứng viên 2)
INSERT INTO interview_evaluation_details (evaluation_id, criteria_id, criteria_name, weight, score, comments) VALUES
(1, 1, 'Tư duy logic & Thuật toán',          25.00, 5, 'Giải quyết bài toán cây và đồ thị rất nhanh và chính xác'),
(1, 2, 'Kiến thức Chuyên môn Kỹ thuật',      35.00, 4, 'Nắm vững nguyên lý Node.js Event Loop, Indexing MySQL tốt'),
(1, 3, 'Kỹ năng giải quyết sự cố (Debug)',    20.00, 5, 'Trình bày phương pháp điều tra Memory Leak rõ ràng'),
(1, 4, 'Làm việc nhóm & Giao tiếp kỹ thuật', 10.00, 4, 'Giao tiếp rõ ràng, tự tin, tôn trọng ý kiến phản biện'),
(1, 5, 'Trình độ Tiếng Anh chuyên ngành',     10.00, 4, 'Đọc hiểu tài liệu chuẩn, phát âm tốt');

-- Chi tiết chấm điểm cho Phiếu 2 (Ứng viên 3)
INSERT INTO interview_evaluation_details (evaluation_id, criteria_id, criteria_name, weight, score, comments) VALUES
(2, 1, 'Tư duy logic & Thuật toán',          25.00, 5, 'Tư duy toán và thuật toán tuyệt vời'),
(2, 2, 'Kiến thức Chuyên môn Kỹ thuật',      35.00, 5, 'Chuyên gia sâu về CSDL phân tán và Redis Caching'),
(2, 3, 'Kỹ năng giải quyết sự cố (Debug)',    20.00, 4, 'Xử lý lỗi hệ thống tốt'),
(2, 4, 'Làm việc nhóm & Giao tiếp kỹ thuật', 10.00, 4, 'Hòa đồng, kỹ năng thuyết trình kỹ thuật tốt'),
(2, 5, 'Trình độ Tiếng Anh chuyên ngành',     10.00, 4, 'Giao tiếp trôi chảy');

-- Chi tiết chấm điểm cho Phiếu 3 (Ứng viên 4)
INSERT INTO interview_evaluation_details (evaluation_id, criteria_id, criteria_name, weight, score, comments) VALUES
(3, 1, 'Tư duy logic & Thuật toán',          25.00, 2, 'Lúng túng khi giải bài toán tối ưu độ phức tạp O(n)'),
(3, 2, 'Kiến thức Chuyên môn Kỹ thuật',      35.00, 2, 'Chưa nắm rõ cơ chế transaction và isolation level'),
(3, 3, 'Kỹ năng giải quyết sự cố (Debug)',    20.00, 3, 'Kỹ năng tra cứu log mức trung bình'),
(3, 4, 'Làm việc nhóm & Giao tiếp kỹ thuật', 10.00, 3, 'Giao tiếp tương đối ổn'),
(3, 5, 'Trình độ Tiếng Anh chuyên ngành',     10.00, 2, 'Khả năng tiếng Anh còn hạn chế');

-- ----------------------------------------------------------------------------------------------------
-- 5.13. Dữ liệu Quyết định của Trưởng bộ phận (US 2)
-- ----------------------------------------------------------------------------------------------------
-- Trưởng bộ phận Kỹ thuật (Mã Dương Quốc - user_id = 4) quyết định Đạt cho ứng viên Quỳnh Anh & Tuấn Kiệt
INSERT INTO candidate_hiring_decisions (id, candidate_id, recruitment_request_id, department_id, decision_maker_id, decision, comments, total_rounds_evaluated, average_score, decided_at) VALUES
(1, 2, 1, 1, 4, 'PASSED', 'Đồng ý với kết quả đánh giá của hội đồng phỏng vấn. Ứng viên Quỳnh Anh có năng lực tốt, phù hợp chuẩn dự án Core Banking. Quyết định: ĐẠT, tiến hành làm Offer.', 1, 4.45, '2026-10-18 17:00:00'),
(2, 3, 1, 1, 4, 'PASSED', 'Ứng viên Tuấn Kiệt có thành tích phỏng vấn xuất sắc. Quyết định: ĐẠT, ưu tiên hoàn thiện Offer mức đãi ngộ hấp dẫn.', 1, 4.60, '2026-10-15 14:00:00'),
(3, 4, 1, 1, 4, 'FAILED', 'Ứng viên chưa đáp ứng tiêu chuẩn chuyên môn cho vị trí Backend Senior. Quyết định: KHÔNG ĐẠT.', 1, 2.30, '2026-10-16 14:00:00');

-- ----------------------------------------------------------------------------------------------------
-- 5.14. Dữ liệu Thư mời nhận việc (candidate_offers) - US 3 & US 4
-- ----------------------------------------------------------------------------------------------------
-- Offer 1: Dành cho Nguyễn Quỳnh Anh (Đã duyệt, đã phát hành, chờ ứng viên phản hồi)
INSERT INTO candidate_offers (
    id, offer_code, candidate_id, application_id, recruitment_request_id, hiring_decision_id,
    department_id, position_id, job_title, basic_salary, probation_salary, probation_period_months,
    currency, expected_start_date, response_deadline, work_location, benefits, message, status,
    created_by, submitted_at, approved_at, sent_to_candidate_at
) VALUES (
    1, 'OFF-202610-0001', 2, 2, 1, 1,
    1, 1, 'Senior Backend Developer', 28000000, 23800000, 2,
    'VND', '2026-11-01', '2026-10-25', 'Số 1 Duy Tân, Cầu Giấy, Hà Nội',
    'Thưởng tháng lương thứ 13, Bảo hiểm sức khỏe PTI cao cấp, Phụ cấp ăn trưa 1.000.000 VND/tháng',
    'Chúc mừng bạn Nguyễn Quỳnh Anh đã xuất sắc vượt qua các vòng phỏng vấn của TechCorp. Ban Giám Đốc trân trọng gửi đến bạn thư mời gia nhập công ty.',
    'SENT', 3, '2026-10-18 17:30:00', '2026-10-19 09:00:00', '2026-10-19 09:30:00'
);

-- Offer 2: Dành cho Đặng Tuấn Kiệt (Đã chấp nhận nhận việc -> Đã tạo Onboarding)
INSERT INTO candidate_offers (
    id, offer_code, candidate_id, application_id, recruitment_request_id, hiring_decision_id,
    department_id, position_id, job_title, basic_salary, probation_salary, probation_period_months,
    currency, expected_start_date, response_deadline, work_location, benefits, message, status,
    created_by, submitted_at, approved_at, sent_to_candidate_at, responded_at, candidate_response
) VALUES (
    2, 'OFF-202610-0002', 3, 3, 1, 2,
    1, 1, 'Senior Backend Developer (Team Lead)', 32000000, 27200000, 2,
    'VND', '2026-10-25', '2026-10-20', 'Số 1 Duy Tân, Cầu Giấy, Hà Nội',
    'Thưởng dự án, Cổ phiếu thưởng ESOP, Gói khám sức khỏe gia đình, Du lịch nước ngoài',
    'Chào mừng anh Đặng Tuấn Kiệt đến với TechCorp. Chúng tôi rất tin tưởng vào đóng góp của anh cho các dự án trọng điểm sắp tới.',
    'ACCEPTED', 3, '2026-10-15 15:00:00', '2026-10-15 16:30:00', '2026-10-15 17:00:00', '2026-10-16 08:30:00', 'Tôi rất vinh dự và đồng ý nhận việc theo đúng các điều khoản trong Offer.'
);

-- Offer 3: Lưu nháp (DRAFT) - Recruiter đang soạn thảo cho ứng viên tiềm năng khác
INSERT INTO candidate_offers (
    id, offer_code, candidate_id, application_id, recruitment_request_id, hiring_decision_id,
    department_id, position_id, job_title, basic_salary, probation_salary, probation_period_months,
    currency, expected_start_date, response_deadline, work_location, status, created_by
) VALUES (
    3, 'OFF-202610-0003', 1, 1, 1, NULL,
    1, 1, 'Middle Backend Developer', 20000000, 17000000, 2,
    'VND', '2026-11-15', '2026-11-05', 'Số 1 Duy Tân, Cầu Giấy, Hà Nội', 'DRAFT', 3
);

-- ----------------------------------------------------------------------------------------------------
-- 5.15. Dữ liệu Lịch sử Phê duyệt Offer (offer_approvals) - US 4
-- ----------------------------------------------------------------------------------------------------
INSERT INTO offer_approvals (id, offer_id, approver_id, action, reason, action_at) VALUES
(1, 1, 6, 'APPROVED', 'Mức lương 28 triệu phù hợp với dải lương quy định và năng lực ứng viên đạt 4.45 điểm. Đồng ý phê duyệt phát hành.', '2026-10-19 09:00:00'),
(2, 2, 6, 'APPROVED', 'Đồng ý mức đãi ngộ 32 triệu để thu hút ứng viên xuất sắc đảm nhiệm vai trò dẫn dắt kỹ thuật.', '2026-10-15 16:30:00');

-- ----------------------------------------------------------------------------------------------------
-- 5.16. Dữ liệu Quy trình Onboarding (candidate_onboardings) - US 4
-- ----------------------------------------------------------------------------------------------------
INSERT INTO candidate_onboardings (id, offer_id, candidate_id, hr_in_charge_id, official_start_date, status, equipment_ready, account_created, contract_signed, orientation_done, checklist_notes) VALUES
(1, 2, 3, 3, '2026-10-25', 'IN_PROGRESS', 1, 1, 1, 0, 'Đã chuẩn bị Macbook Pro M3 và màn hình Dell 27 inch. Đã tạo email nội bộ tuankiet.dang@techcorp.com. Đang xếp lịch đào tạo hội nhập ngày đầu tiên.');

-- ----------------------------------------------------------------------------------------------------
-- 5.17. Dữ liệu Thông báo tự động (notifications & candidate_notifications) - US 5
-- ----------------------------------------------------------------------------------------------------
-- 1. Thông báo cho Interviewer (Thàng Xuân Lập - user_id = 5) khi có lịch phỏng vấn
INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES
(5, 'Lịch phỏng vấn mới được phân công', 'Bạn được phân công phỏng vấn ứng viên Trần Văn Mạnh vào lúc 09:00 ngày 20/10/2026 tại Phòng 101.', 'INTERVIEW_ASSIGNED', '/interviews', 0, '2026-10-19 08:00:00'),
(5, 'Lịch phỏng vấn mới được phân công', 'Bạn được phân công phỏng vấn ứng viên Nguyễn Quỳnh Anh vào lúc 14:00 ngày 18/10/2026.', 'INTERVIEW_ASSIGNED', '/interviews', 1, '2026-10-17 10:00:00');

-- 2. Thông báo cho Người duyệt (Thảo A Pồng - user_id = 6) khi có Offer gửi duyệt
INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES
(6, 'Yêu cầu phê duyệt Offer mới', 'Chuyên viên Nguyễn Anh Sơn vừa gửi duyệt Offer cho ứng viên Nguyễn Quỳnh Anh (Mức lương: 28.000.000 VND).', 'OFFER_PENDING_APPROVAL', '/offers/approval', 1, '2026-10-18 17:30:00');

-- 3. Thông báo cho Nhân viên tuyển dụng (Nguyễn Anh Sơn - user_id = 3) khi Offer được duyệt & Ứng viên phản hồi
INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at) VALUES
(3, 'Offer đã được phê duyệt', 'Giám đốc Thảo A Pồng đã phê duyệt Thư mời nhận việc cho ứng viên Nguyễn Quỳnh Anh.', 'OFFER_APPROVED', '/offers/1', 1, '2026-10-19 09:05:00'),
(3, 'Ứng viên đã CHẤP NHẬN Offer', 'Ứng viên Đặng Tuấn Kiệt vừa xác nhận Chấp nhận Thư mời nhận việc! Hãy bắt đầu quy trình Onboarding.', 'OFFER_ACCEPTED', '/onboarding', 0, '2026-10-16 08:35:00');

-- 4. Thông báo trên Cổng ứng viên (candidate_notifications)
INSERT INTO candidate_notifications (candidate_id, title, message, type, link, read_at, created_at) VALUES
(2, 'Thư mời nhận việc từ TechCorp', 'Chúc mừng bạn! TechCorp đã phát hành Thư mời nhận việc cho bạn. Vui lòng xem chi tiết và phản hồi trước ngày 25/10/2026.', 'OFFER_ISSUED', '/candidate/offers', NULL, '2026-10-19 09:30:00'),
(3, 'Chào mừng gia nhập TechCorp', 'Hồ sơ nhận việc của bạn đã được tiếp nhận. Bộ phận Nhân sự sẽ liên hệ hướng dẫn ngày đầu tiên đi làm.', 'APPLICATION_STATUS', '/candidate/dashboard', '2026-10-16 09:00:00', '2026-10-16 08:40:00');

-- ====================================================================================================
-- KẾT THÚC TẬP LỆNH SQL CỦA CẢ 4 SPRINTS
-- ====================================================================================================
