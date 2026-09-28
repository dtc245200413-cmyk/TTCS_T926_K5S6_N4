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
('ADMIN',       'Administrator', 'Full system access'),
('HR_MANAGER',  'HR Manager',    'Manages HR operations'),
('RECRUITER',   'Recruiter',     'Manages candidate pipelines'),
('INTERVIEWER', 'Interviewer',   'Conducts interviews');

-- Permissions
INSERT INTO permissions (permission_code, permission_name, description) VALUES
('USER_VIEW',   'View Users',   'Can view the list of users'),
('USER_CREATE', 'Create Users', 'Can create new accounts'),
('USER_UPDATE', 'Update Users', 'Can edit user information'),
('USER_LOCK',   'Lock Users',   'Can lock a user account'),
('USER_UNLOCK', 'Unlock Users', 'Can unlock a user account'),
('ROLE_VIEW',   'View Roles',   'Can view roles and permissions'),
('ROLE_ASSIGN', 'Assign Roles', 'Can assign a role to a user'),
('ROLE_REVOKE', 'Revoke Roles', 'Can revoke a role from a user');

-- Role -> Permission mappings
-- ADMIN gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
CROSS JOIN permissions p
WHERE  r.role_code = 'ADMIN';

-- HR_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
JOIN   permissions p ON p.permission_code IN ('USER_VIEW','USER_CREATE','USER_UPDATE','ROLE_VIEW')
WHERE  r.role_code = 'HR_MANAGER';

-- RECRUITER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
JOIN   permissions p ON p.permission_code IN ('USER_VIEW','ROLE_VIEW')
WHERE  r.role_code = 'RECRUITER';

-- INTERVIEWER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM   roles r
JOIN   permissions p ON p.permission_code = 'USER_VIEW'
WHERE  r.role_code = 'INTERVIEWER';

-- Users
-- password_hash is a placeholder bcrypt-format string.
-- In production, always hash passwords server-side.
INSERT INTO users
    (department_id, employee_code, full_name, company_email,
     phone_number, job_title, password_hash,
     status, failed_login_attempts, locked_until,
     last_login_at, password_changed_at)
VALUES
(1, 'EMP001', 'Nguyen Van An',   'an.nguyen@company.com',
 '0901234567', 'System Administrator',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtGJ6hd2sQ6gzRe9vL4kX1Jz2A6e',
 'ACTIVE', 0, NULL, '2026-09-28 08:00:00', '2026-09-01 09:00:00'),

(2, 'EMP002', 'Tran Thi Bich',   'bich.tran@company.com',
 '0912345678', 'HR Manager',
 '$2b$12$ABcDeFgHiJkLmNoPqRsTuOvWxYz0123456789abcdefghijKLMNOP',
 'ACTIVE', 0, NULL, '2026-09-27 14:30:00', '2026-09-01 09:05:00'),

(2, 'EMP003', 'Le Minh Cuong',   'cuong.le@company.com',
 '0923456789', 'Senior Recruiter',
 '$2b$12$QRSTUVWXYZabcdefghijklUVWXYZ0123456789abcdefghijABCDE',
 'ACTIVE', 0, NULL, '2026-09-28 09:15:00', '2026-09-01 09:10:00'),

(1, 'EMP004', 'Pham Quoc Dung',  'dung.pham@company.com',
 '0934567890', 'Senior Software Engineer',
 '$2b$12$HIJKLMNOPQRSTUVWXYZabcWXYZ0123456789abcdefghijklmnopq',
 'ACTIVE', 0, NULL, '2026-09-26 16:00:00', '2026-09-01 09:15:00'),

(3, 'EMP005', 'Hoang Thi Em',    'em.hoang@company.com',
 '0945678901', 'Financial Analyst',
 '$2b$12$XYZabcdefghijklmnopqrABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
 'LOCKED', 5, '2026-10-05 23:59:59', NULL, '2026-08-15 10:00:00'),

(4, 'EMP006', 'Vu Thi Phuong',   'phuong.vu@company.com',
 '0956789012', 'Marketing Specialist',
 '$2b$12$PQRSTUVWXYZabcdefghijkEFGHIJKLMNOPQRSTUVWXYZ0123456789',
 'INACTIVE', 0, NULL, NULL, '2026-07-01 08:00:00');

-- User Roles
INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES
(1, (SELECT role_id FROM roles WHERE role_code = 'ADMIN'),       NULL),
(2, (SELECT role_id FROM roles WHERE role_code = 'HR_MANAGER'),  1),
(3, (SELECT role_id FROM roles WHERE role_code = 'RECRUITER'),   1),
(3, (SELECT role_id FROM roles WHERE role_code = 'INTERVIEWER'), 1),
(4, (SELECT role_id FROM roles WHERE role_code = 'INTERVIEWER'), 1);

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
