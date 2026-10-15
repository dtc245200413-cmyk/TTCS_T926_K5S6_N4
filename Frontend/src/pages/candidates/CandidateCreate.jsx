import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Form thêm hồ sơ thủ công đã chuyển thành modal trong danh sách ứng viên.
 * Giữ route cũ /candidates/create để không hỏng liên kết hiện có.
 */
const CandidateCreate = () => <Navigate to="/candidates" replace />;

export default CandidateCreate;
