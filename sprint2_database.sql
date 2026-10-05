-- =========================================================
-- QUẢN LÝ CHỨC DANH VÀ DẢI LƯƠNG - HR
-- SCRUM-97: Quản lý chức danh và khoảng lương
-- SCRUM-98: Quản lý khoảng lương và kiểm tra mức lương hợp lệ
-- SCRUM-99: Test tạo/sửa chức danh, kiểm tra min/max và quyền xem
-- =========================================================

CREATE DATABASE IF NOT EXISTS quan_ly_nhan_su;
USE quan_ly_nhan_su;

-- =========================================================
-- 1. BẢNG CHỨC DANH
-- =========================================================

DROP TABLE IF EXISTS chuc_danh;

CREATE TABLE chuc_danh (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ma_chuc_danh VARCHAR(20) NOT NULL UNIQUE,
    ten_chuc_danh VARCHAR(100) NOT NULL,
    cap_bac INT NOT NULL,
    luong_toi_thieu DECIMAL(15,2) NOT NULL,
    luong_toi_da DECIMAL(15,2) NOT NULL,
    
    CONSTRAINT chk_cap_bac
        CHECK (cap_bac > 0),
        
    CONSTRAINT chk_dai_luong
        CHECK (luong_toi_thieu >= 0 
               AND luong_toi_da >= luong_toi_thieu)
);

-- =========================================================
-- 2. DỮ LIỆU MẪU
-- =========================================================

INSERT INTO chuc_danh
    (ma_chuc_danh, ten_chuc_danh, cap_bac, luong_toi_thieu, luong_toi_da)
VALUES
    ('CD001', 'Nhân viên', 1, 8000000, 12000000),
    ('CD002', 'Chuyên viên', 2, 10000000, 18000000),
    ('CD003', 'Trưởng nhóm', 3, 15000000, 25000000),
    ('CD004', 'Trưởng phòng', 4, 20000000, 35000000),
    ('CD005', 'Giám đốc', 5, 30000000, 50000000);

-- =========================================================
-- 3. XEM DANH SÁCH CHỨC DANH
-- =========================================================

SELECT
    id,
    ma_chuc_danh,
    ten_chuc_danh,
    cap_bac,
    luong_toi_thieu,
    luong_toi_da
FROM chuc_danh
ORDER BY cap_bac;


-- =========================================================
-- 4. TẠO CHỨC DANH
-- =========================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_tao_chuc_danh $$

CREATE PROCEDURE sp_tao_chuc_danh(
    IN p_ma_chuc_danh VARCHAR(20),
    IN p_ten_chuc_danh VARCHAR(100),
    IN p_cap_bac INT,
    IN p_luong_toi_thieu DECIMAL(15,2),
    IN p_luong_toi_da DECIMAL(15,2)
)
BEGIN

    IF p_luong_toi_thieu < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Lương tối thiểu không được nhỏ hơn 0';
    END IF;

    IF p_luong_toi_da < p_luong_toi_thieu THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
        'Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu';
    END IF;

    INSERT INTO chuc_danh
    (
        ma_chuc_danh,
        ten_chuc_danh,
        cap_bac,
        luong_toi_thieu,
        luong_toi_da
    )
    VALUES
    (
        p_ma_chuc_danh,
        p_ten_chuc_danh,
        p_cap_bac,
        p_luong_toi_thieu,
        p_luong_toi_da
    );

END $$

-- =========================================================
-- 5. SỬA CHỨC DANH
-- =========================================================

DROP PROCEDURE IF EXISTS sp_sua_chuc_danh $$

CREATE PROCEDURE sp_sua_chuc_danh(
    IN p_id INT,
    IN p_ten_chuc_danh VARCHAR(100),
    IN p_cap_bac INT,
    IN p_luong_toi_thieu DECIMAL(15,2),
    IN p_luong_toi_da DECIMAL(15,2)
)
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM chuc_danh
        WHERE id = p_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Không tìm thấy chức danh';
    END IF;

    IF p_luong_toi_da < p_luong_toi_thieu THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
        'Lương tối đa phải lớn hơn hoặc bằng lương tối thiểu';
    END IF;

    UPDATE chuc_danh
    SET
        ten_chuc_danh = p_ten_chuc_danh,
        cap_bac = p_cap_bac,
        luong_toi_thieu = p_luong_toi_thieu,
        luong_toi_da = p_luong_toi_da
    WHERE id = p_id;

END $$

-- =========================================================
-- 6. KIỂM TRA MỨC LƯƠNG ĐỀ XUẤT
-- =========================================================

DROP PROCEDURE IF EXISTS sp_kiem_tra_luong $$

CREATE PROCEDURE sp_kiem_tra_luong(
    IN p_ma_chuc_danh VARCHAR(20),
    IN p_luong_de_xuat DECIMAL(15,2)
)
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM chuc_danh
        WHERE ma_chuc_danh = p_ma_chuc_danh
    ) THEN

        SELECT
            'KHONG_HOP_LE' AS ket_qua,
            'Không tìm thấy chức danh' AS thong_bao;

    ELSE

        SELECT
            CASE
                WHEN p_luong_de_xuat >= luong_toi_thieu
                 AND p_luong_de_xuat <= luong_toi_da
                THEN 'HOP_LE'
                ELSE 'KHONG_HOP_LE'
            END AS ket_qua,

            CASE
                WHEN p_luong_de_xuat < luong_toi_thieu
                THEN 'Mức lương đề xuất thấp hơn mức tối thiểu'

                WHEN p_luong_de_xuat > luong_toi_da
                THEN 'Mức lương đề xuất vượt quá mức tối đa'

                ELSE 'Mức lương đề xuất nằm trong khung cho phép'
            END AS thong_bao,

            luong_toi_thieu,
            luong_toi_da

        FROM chuc_danh
        WHERE ma_chuc_danh = p_ma_chuc_danh;

    END IF;

END $$

DELIMITER ;


-- =========================================================
-- 7. TEST TẠO CHỨC DANH
-- =========================================================

CALL sp_tao_chuc_danh(
    'CD006',
    'Phó phòng',
    4,
    18000000,
    30000000
);


-- =========================================================
-- 8. TEST SỬA CHỨC DANH
-- =========================================================

CALL sp_sua_chuc_danh(
    1,
    'Nhân viên chính thức',
    1,
    9000000,
    13000000
);


-- =========================================================
-- 9. TEST KIỂM TRA LƯƠNG
-- =========================================================

-- Trường hợp hợp lệ
CALL sp_kiem_tra_luong(
    'CD001',
    10000000
);

-- Trường hợp thấp hơn mức tối thiểu
CALL sp_kiem_tra_luong(
    'CD001',
    5000000
);

-- Trường hợp cao hơn mức tối đa
CALL sp_kiem_tra_luong(
    'CD001',
    20000000
);


-- =========================================================
-- 10. TẠO USER TRƯỞNG PHÒNG NHÂN SỰ
-- Chỉ user này được xem dải lương
-- =========================================================

CREATE USER IF NOT EXISTS 'truongphong_ns'@'localhost'
IDENTIFIED BY '123456';

GRANT SELECT ON quan_ly_nhan_su.chuc_danh
TO 'truongphong_ns'@'localhost';


-- =========================================================
-- 11. TẠO USER NHÂN VIÊN THƯỜNG
-- Không được xem bảng dải lương trực tiếp
-- =========================================================

CREATE USER IF NOT EXISTS 'nhanvien'@'localhost'
IDENTIFIED BY '123456';

REVOKE ALL PRIVILEGES, GRANT OPTION
FROM 'nhanvien'@'localhost';


-- =========================================================
-- 12. KIỂM TRA QUYỀN
-- =========================================================

SHOW GRANTS FOR 'truongphong_ns'@'localhost';

SHOW GRANTS FOR 'nhanvien'@'localhost';

-- =========================================================
-- KẾT THÚC
-- =========================================================