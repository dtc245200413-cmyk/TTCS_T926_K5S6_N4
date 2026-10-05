-- ============================================================
--  INTERNAL RECRUITMENT MANAGEMENT SYSTEM
--  Sprint 1: Account, Authorization and User Administration
--  Database : internal_recruitment_system
--  Engine   : InnoDB  |  MySQL 8.0  |  utf8mb4
-- ============================================================

DROP DATABASE IF EXISTS internal_recruitment_system;

CREATE DATABASE internal_recruitment_system
    CHARACTER SET  utf8mb4
    COLLATE        utf8mb4_unicode_ci;

USE internal_recruitment_system;

-- ============================================================
--  CREATE TABLES
-- ============================================================

CREATE TABLE departments (
    department_id   INT          NOT NULL AUTO_INCREMENT,
    department_code VARCHAR(20)  NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    description     TEXT             NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_departments     PRIMARY KEY (department_id),
    CONSTRAINT uq_department_code UNIQUE      (department_code)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

CREATE TABLE users (
    user_id               INT              NOT NULL AUTO_INCREMENT,
    department_id         INT                  NULL,
    employee_code         VARCHAR(20)      NOT NULL,
    full_name             VARCHAR(150)     NOT NULL,
    company_email         VARCHAR(200)     NOT NULL,
    phone_number          VARCHAR(20)          NULL,
    job_title             VARCHAR(100)         NULL,
    password_hash         VARCHAR(255)     NOT NULL,
    status                ENUM('ACTIVE','INACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until          DATETIME             NULL,
    last_login_at         DATETIME             NULL,
    password_changed_at   DATETIME             NULL,
    created_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                   ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_users            PRIMARY KEY (user_id),
    CONSTRAINT uq_employee_code    UNIQUE      (employee_code),
    CONSTRAINT uq_company_email    UNIQUE      (company_email),
    CONSTRAINT fk_users_department FOREIGN KEY (department_id)
        REFERENCES departments (department_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_status        ON users (status);
CREATE INDEX idx_users_department_id ON users (department_id);
CREATE INDEX idx_users_company_email ON users (company_email);

-- --------------------------------------------------------

CREATE TABLE roles (
    role_id     INT          NOT NULL AUTO_INCREMENT,
    role_code   VARCHAR(50)  NOT NULL,
    role_name   VARCHAR(100) NOT NULL,
    description TEXT             NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_roles     PRIMARY KEY (role_id),
    CONSTRAINT uq_role_code UNIQUE      (role_code)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

CREATE TABLE permissions (
    permission_id   INT          NOT NULL AUTO_INCREMENT,
    permission_code VARCHAR(100) NOT NULL,
    permission_name VARCHAR(150) NOT NULL,
    description     TEXT             NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_permissions     PRIMARY KEY (permission_id),
    CONSTRAINT uq_permission_code UNIQUE      (permission_code)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

CREATE TABLE user_roles (
    user_id     INT       NOT NULL,
    role_id     INT       NOT NULL,
    assigned_by INT           NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_user_roles     PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_ur_role        FOREIGN KEY (role_id)
        REFERENCES roles (role_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_ur_assigned_by FOREIGN KEY (assigned_by)
        REFERENCES users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- --------------------------------------------------------

CREATE TABLE role_permissions (
    role_id       INT NOT NULL,
    permission_id INT NOT NULL,

    CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role          FOREIGN KEY (role_id)
        REFERENCES roles (role_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_rp_permission    FOREIGN KEY (permission_id)
        REFERENCES permissions (permission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_rp_permission_id ON role_permissions (permission_id);

-- --------------------------------------------------------

CREATE TABLE user_sessions (
    session_id    INT          NOT NULL AUTO_INCREMENT,
    user_id       INT          NOT NULL,
    session_token VARCHAR(512) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at    DATETIME     NOT NULL,
    revoked_at    DATETIME         NULL,

    CONSTRAINT pk_user_sessions PRIMARY KEY (session_id),
    CONSTRAINT uq_session_token UNIQUE      (session_token),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sessions_user_id ON user_sessions (user_id);
CREATE INDEX idx_sessions_expires ON user_sessions (expires_at);
CREATE INDEX idx_sessions_revoked ON user_sessions (revoked_at);

-- --------------------------------------------------------

CREATE TABLE password_reset_tokens (
    reset_token_id INT          NOT NULL AUTO_INCREMENT,
    user_id        INT          NOT NULL,
    token_hash     VARCHAR(255) NOT NULL,
    expires_at     DATETIME     NOT NULL,
    used_at        DATETIME         NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_reset_tokens PRIMARY KEY (reset_token_id),
    CONSTRAINT uq_token_hash   UNIQUE      (token_hash),
    CONSTRAINT fk_prt_user     FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_prt_user_id ON password_reset_tokens (user_id);
CREATE INDEX idx_prt_expires ON password_reset_tokens (expires_at);

-- --------------------------------------------------------

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

    CONSTRAINT pk_audit_logs      PRIMARY KEY (audit_log_id),
    CONSTRAINT fk_al_user         FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_al_performed_by FOREIGN KEY (performed_by)
        REFERENCES users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_al_user_id      ON audit_logs (user_id);
CREATE INDEX idx_al_performed_by ON audit_logs (performed_by);
CREATE INDEX idx_al_action       ON audit_logs (action);
CREATE INDEX idx_al_created_at   ON audit_logs (created_at);


-- ============================================================
--  SAMPLE DATA
-- ============================================================

-- Departments
INSERT INTO departments (department_code, department_name, description) VALUES
('IT',  'Information Technology', 'Software development and IT support'),
('HR',  'Human Resources',        'Recruitment and employee relations'),
('FIN', 'Finance',                'Accounting and financial reporting'),
('MKT', 'Marketing',              'Brand management and digital marketing'),
('OPS', 'Operations',             'Business operations and process management');

-- Roles
INSERT INTO roles (role_code, role_name, description) VALUES
('ADMIN',          'Quản trị hệ thống',     'Người vận hành ứng dụng, quản lý tài khoản, vai trò, danh mục'),
('HR_MANAGER',     'Trưởng phòng Nhân sự', 'Chủ sở hữu toàn bộ hoạt động tuyển dụng'),
('RECRUITER',      'Nhân viên tuyển dụng',  'Người vận hành tuyển dụng hằng ngày'),
('HIRING_MANAGER', 'Trưởng bộ phận',       'Người cần người, sở hữu vị trí tuyển dụng'),
('INTERVIEWER',    'Người phỏng vấn',       'Nhân sự được mời tham gia một vòng phỏng vấn'),
('APPROVER',       'Người duyệt',          'Ban giám đốc hoặc cấp duyệt theo hạn mức'),
('CANDIDATE',      'Ứng viên',             'Người nộp hồ sơ từ bên ngoài, không có tài khoản nội bộ');

-- Permissions
INSERT INTO permissions (permission_code, permission_name, description) VALUES
('USER_VIEW',   'View Users',   'Can view the list of users'),
('USER_CREATE', 'Create Users', 'Can create new accounts'),
('USER_UPDATE', 'Update Users', 'Can edit user information'),
('USER_LOCK',   'Lock Users',   'Can lock a user account'),
('USER_UNLOCK', 'Unlock Users', 'Can unlock a user account'),
('ROLE_VIEW',   'View Roles',   'Can view roles and permissions'),
('ROLE_ASSIGN',       'Assign Roles',       'Can assign a role to a user'),
('ROLE_REVOKE',       'Revoke Roles',       'Can revoke a role from a user'),
('DEPARTMENT_VIEW',   'View Departments',   'Can view department hierarchy'),
('DEPARTMENT_CREATE', 'Create Departments', 'Can create departments'),
('DEPARTMENT_UPDATE', 'Update Departments', 'Can update departments'),
('DEPARTMENT_DELETE', 'Delete Departments', 'Can delete or deactivate departments');

-- Role -> Permission mappings
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
CROSS JOIN permissions p
WHERE  r.role_code = 'ADMIN';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
JOIN permissions p ON p.permission_code IN (
    'USER_VIEW',
    'USER_CREATE',
    'USER_UPDATE',
    'ROLE_VIEW',
    'DEPARTMENT_VIEW',
    'DEPARTMENT_CREATE',
    'DEPARTMENT_UPDATE',
    'DEPARTMENT_DELETE'
)
WHERE r.role_code = 'HR_MANAGER';
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
JOIN   permissions p ON p.permission_code IN ('USER_VIEW','ROLE_VIEW')
WHERE  r.role_code = 'RECRUITER';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
JOIN   permissions p ON p.permission_code = 'USER_VIEW'
WHERE  r.role_code IN ('INTERVIEWER', 'HIRING_MANAGER', 'APPROVER');

-- Users
-- Mật khẩu chung mặc định: '123456'
INSERT INTO users
    (department_id, employee_code, full_name, company_email,
     phone_number, job_title, password_hash, status)
VALUES
(1, 'EMP001', 'Nguyễn Thị Hồng Nhung', 'dtc245200413@ictu.edu.vn', '0988888888', 'Quản trị viên Hệ thống',             '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(2, 'EMP002', 'Hà Đức Minh',           'dtc245200002@ictu.edu.vn', '0988888888', 'Trưởng phòng Nhân sự',               '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(2, 'EMP003', 'Nguyễn Anh Sơn',        'dtc245200852@ictu.edu.vn', '0988888888', 'Nhân viên Tuyển dụng',               '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(1, 'EMP004', 'Mã Dương Quốc',         'dtc245200935@ictu.edu.vn', '0988888888', 'Trưởng bộ phận Kỹ thuật',            '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(1, 'EMP005', 'Thàng Xuân Lập',        'dtc245200571@ictu.edu.vn', '0988888888', 'Lập trình viên Senior (Interviewer)','$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(5, 'EMP006', 'Thảo A Pồng',           'dtc245200592@ictu.edu.vn', '0988888888', 'Giám đốc Vận hành (Approver)',       '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(4, 'EMP007', 'Nguyễn Xuân Phú',       'dtc245200480@ictu.edu.vn', '0988888888', 'Trưởng bộ phận Marketing',           '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(3, 'EMP008', 'Lưu Quang Lực',         'dtc245200349@ictu.edu.vn', '0988888888', 'Chuyên viên Phỏng vấn Tài chính',    '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE'),
(2, 'EMP009', 'Long Minh Thành',       'dtc245200344@ictu.edu.vn', '0988888888', 'Nhân viên Tuyển dụng',               '$2b$12$cVOoPZJxLXu66G2dZE6tPeB9dcQ56AMpbBy23xr88J7./.6rz9jIW', 'ACTIVE');

-- User Roles
INSERT INTO user_roles (user_id, role_id) VALUES
(1, (SELECT role_id FROM roles WHERE role_code = 'ADMIN')),
(2, (SELECT role_id FROM roles WHERE role_code = 'HR_MANAGER')),
(3, (SELECT role_id FROM roles WHERE role_code = 'RECRUITER')),
(4, (SELECT role_id FROM roles WHERE role_code = 'HIRING_MANAGER')),
(5, (SELECT role_id FROM roles WHERE role_code = 'INTERVIEWER')),
(6, (SELECT role_id FROM roles WHERE role_code = 'APPROVER')),
(7, (SELECT role_id FROM roles WHERE role_code = 'HIRING_MANAGER')),
(8, (SELECT role_id FROM roles WHERE role_code = 'INTERVIEWER')),
(9, (SELECT role_id FROM roles WHERE role_code = 'RECRUITER'));

-- Sessions
INSERT INTO user_sessions (user_id, session_token, expires_at, revoked_at) VALUES
(1, 'tok_a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4',
    DATE_ADD(NOW(), INTERVAL 8 HOUR), NULL),
(2, 'tok_b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5',
    DATE_ADD(NOW(), INTERVAL 4 HOUR), NULL),
(3, 'tok_c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6',
    DATE_ADD(NOW(), INTERVAL 6 HOUR), NULL),
(1, 'tok_d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1',
    DATE_ADD(NOW(), INTERVAL 8 HOUR), '2026-09-27 17:00:00'),
(4, 'tok_e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2c3D4e5F6a1B2',
    '2026-09-27 18:00:00', NULL);

-- Password Reset Tokens
INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at) VALUES
(3, SHA2('raw-reset-token-cuong-001', 256), DATE_ADD(NOW(), INTERVAL 1 HOUR), NULL),
(2, SHA2('raw-reset-token-bich-001',  256), DATE_ADD(NOW(), INTERVAL 1 HOUR), '2026-09-20 10:05:00'),
(4, SHA2('raw-reset-token-dung-001',  256), '2026-09-27 12:00:00',            NULL);

-- Audit Logs
INSERT INTO audit_logs
    (user_id, performed_by, action, entity_type, entity_id, description, ip_address)
VALUES
(1, 1, 'LOGIN_SUCCESS',
 'users', '1', 'User logged in successfully.', '192.168.1.10'),

(5, 5, 'LOGIN_FAILED',
 'users', '5', 'Incorrect password attempt number 5.', '192.168.1.55'),

(2, 2, 'LOGIN_SUCCESS',
 'users', '2', 'User logged in successfully.', '10.0.0.22'),

(3, 3, 'LOGOUT',
 'users', '3', 'User logged out.', '10.0.0.33'),

(3, 3, 'PASSWORD_RESET_REQUEST',
 'users', '3', 'Forgot-password email requested.', '10.0.0.33'),

(2, 2, 'PASSWORD_CHANGED',
 'users', '2', 'User changed their password successfully.', '10.0.0.22'),

(5, 1, 'USER_LOCKED',
 'users', '5', 'Account locked after 5 failed login attempts.', '192.168.1.10'),

(6, 1, 'USER_CREATED',
 'users', '6', 'New account created for Vu Thi Phuong.', '192.168.1.10'),

(6, 1, 'USER_UPDATED',
 'users', '6', 'Job title updated to Marketing Specialist.', '192.168.1.10'),

(2, 1, 'ROLE_ASSIGNED',
 'user_roles', '2-2', 'Role HR_MANAGER assigned to Tran Thi Bich.', '192.168.1.10'),

(3, 1, 'ROLE_ASSIGNED',
 'user_roles', '3-3', 'Role RECRUITER assigned to Le Minh Cuong.', '192.168.1.10'),

(3, 1, 'ROLE_ASSIGNED',
 'user_roles', '3-4', 'Role INTERVIEWER assigned to Le Minh Cuong.', '192.168.1.10');

-- ============================================================
--  END OF SCRIPT
-- ============================================================


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
ADD COLUMN status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE' AFTER manager_user_id,
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
    `row_number` INT NOT NULL,
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
