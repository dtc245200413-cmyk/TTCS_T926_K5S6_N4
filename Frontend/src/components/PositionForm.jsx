import React, { useState } from 'react';
import {
  FiX,
  FiBriefcase,
  FiTag,
  FiLayers,
  FiDollarSign,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';
import {
  POSITION_LEVELS,
  formatCurrency,
  formatNumberWithDots,
  parseRawNumber,
} from '../utils/formatters';

function PositionForm({ isOpen, onClose, onSubmit, initialData }) {
  const isEditMode = Boolean(initialData && initialData.position_id);

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        position_code: initialData.position_code || '',
        position_name: initialData.position_name || '',
        position_level: initialData.position_level || 'Junior',
        min_salary: initialData.min_salary ? formatNumberWithDots(initialData.min_salary) : '',
        max_salary: initialData.max_salary ? formatNumberWithDots(initialData.max_salary) : '',
        status: initialData.status || 'ACTIVE',
        description: initialData.description || '',
      };
    }
    return {
      position_code: '',
      position_name: '',
      position_level: 'Junior',
      min_salary: '',
      max_salary: '',
      status: 'ACTIVE',
      description: '',
    };
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'position_code') {
      setFormData((prev) => ({
        ...prev,
        position_code: value.toUpperCase().replace(/\s+/g, '-'),
      }));
    } else if (name === 'min_salary' || name === 'max_salary') {
      const formatted = formatNumberWithDots(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.position_code.trim()) {
      newErrors.position_code = 'Vui lòng nhập mã chức danh (VD: DEV-SR)';
    }

    if (!formData.position_name.trim()) {
      newErrors.position_name = 'Vui lòng nhập tên chức danh (VD: Senior Frontend Developer)';
    }

    if (!formData.position_level) {
      newErrors.position_level = 'Vui lòng chọn cấp bậc chuyên môn';
    }

    const minNum = parseRawNumber(formData.min_salary);
    const maxNum = parseRawNumber(formData.max_salary);

    if (!formData.min_salary) {
      newErrors.min_salary = 'Vui lòng nhập mức lương tối thiểu';
    } else if (minNum < 0) {
      newErrors.min_salary = 'Mức lương tối thiểu không được âm';
    }

    if (!formData.max_salary) {
      newErrors.max_salary = 'Vui lòng nhập mức lương tối đa';
    } else if (maxNum < minNum) {
      newErrors.max_salary = 'Mức lương tối đa phải lớn hơn hoặc bằng mức lương tối thiểu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...(initialData || {}),
      position_code: formData.position_code.trim(),
      position_name: formData.position_name.trim(),
      position_level: formData.position_level,
      min_salary: parseRawNumber(formData.min_salary),
      max_salary: parseRawNumber(formData.max_salary),
      status: formData.status,
      description: formData.description.trim(),
    };

    try {
      onSubmit(payload);
      onClose();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Có lỗi xảy ra khi lưu chức danh',
      }));
    }
  };

  const rawMin = parseRawNumber(formData.min_salary);
  const rawMax = parseRawNumber(formData.max_salary);

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-header">
          <div className="pos-modal-title-wrap">
            <div className="pos-modal-icon-badge">
              <FiBriefcase className="icon" />
            </div>
            <div>
              <h2 className="pos-modal-title">
                {isEditMode ? 'Chỉnh Sửa Chức Danh & Dải Lương' : 'Khai Báo Chức Danh & Dải Lương Mới'}
              </h2>
              <p className="pos-modal-subtitle">
                Thiết lập thông tin định danh và khung lương chuẩn để kiểm soát offer
              </p>
            </div>
          </div>
          <button type="button" className="pos-btn-close" onClick={onClose} aria-label="Đóng">
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pos-modal-form">
          {errors.submit && (
            <div className="pos-alert-error">
              <FiAlertCircle />
              <span>{errors.submit}</span>
            </div>
          )}

          <div className="pos-form-grid-2">
            <div className="pos-form-group">
              <label htmlFor="position_code" className="pos-form-label required">
                <FiTag className="pos-input-icon" /> Mã chức danh
              </label>
              <input
                id="position_code"
                type="text"
                name="position_code"
                placeholder="VD: DEV-SR, HR-MGR, QA-QC"
                value={formData.position_code}
                onChange={handleChange}
                className={`pos-form-input uppercase ${errors.position_code ? 'pos-input-error' : ''}`}
              />
              {errors.position_code ? (
                <span className="pos-field-error">{errors.position_code}</span>
              ) : (
                <span className="pos-field-hint">Mã định danh duy nhất trong hệ thống</span>
              )}
            </div>

            <div className="pos-form-group">
              <label htmlFor="position_level" className="pos-form-label required">
                <FiLayers className="pos-input-icon" /> Cấp bậc (Level)
              </label>
              <select
                id="position_level"
                name="position_level"
                value={formData.position_level}
                onChange={handleChange}
                className={`pos-form-select ${errors.position_level ? 'pos-input-error' : ''}`}
              >
                {POSITION_LEVELS.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </select>
              {errors.position_level && <span className="pos-field-error">{errors.position_level}</span>}
            </div>
          </div>

          <div className="pos-form-group">
            <label htmlFor="position_name" className="pos-form-label required">
              <FiBriefcase className="pos-input-icon" /> Tên chức danh
            </label>
            <input
              id="position_name"
              type="text"
              name="position_name"
              placeholder="VD: Senior React Developer, Chuyên viên Tuyển dụng..."
              value={formData.position_name}
              onChange={handleChange}
              className={`pos-form-input ${errors.position_name ? 'pos-input-error' : ''}`}
            />
            {errors.position_name && <span className="pos-field-error">{errors.position_name}</span>}
          </div>

          <div className="pos-salary-box">
            <div className="pos-salary-box-header">
              <div className="pos-salary-box-title">
                <FiDollarSign className="pos-icon-salary" />
                <span>Khung dải lương đã duyệt (VNĐ)</span>
              </div>
              <span className="pos-salary-badge-note">Hạn mức duyệt offer</span>
            </div>

            <div className="pos-form-grid-2">
              <div className="pos-form-group">
                <label htmlFor="min_salary" className="pos-form-label required">
                  Lương tối thiểu (Min)
                </label>
                <div className="pos-input-with-suffix">
                  <input
                    id="min_salary"
                    type="text"
                    name="min_salary"
                    placeholder="VD: 15.000.000"
                    value={formData.min_salary}
                    onChange={handleChange}
                    className={`pos-form-input ${errors.min_salary ? 'pos-input-error' : ''}`}
                  />
                  <span className="pos-input-suffix">₫</span>
                </div>
                {errors.min_salary ? (
                  <span className="pos-field-error">{errors.min_salary}</span>
                ) : (
                  rawMin > 0 && (
                    <span className="pos-field-preview">Bằng số: {formatCurrency(rawMin)}</span>
                  )
                )}
              </div>

              <div className="pos-form-group">
                <label htmlFor="max_salary" className="pos-form-label required">
                  Lương tối đa (Max)
                </label>
                <div className="pos-input-with-suffix">
                  <input
                    id="max_salary"
                    type="text"
                    name="max_salary"
                    placeholder="VD: 25.000.000"
                    value={formData.max_salary}
                    onChange={handleChange}
                    className={`pos-form-input ${errors.max_salary ? 'pos-input-error' : ''}`}
                  />
                  <span className="pos-input-suffix">₫</span>
                </div>
                {errors.max_salary ? (
                  <span className="pos-field-error">{errors.max_salary}</span>
                ) : (
                  rawMax > 0 && (
                    <span className="pos-field-preview">Bằng số: {formatCurrency(rawMax)}</span>
                  )
                )}
              </div>
            </div>

            {rawMin > 0 && rawMax > 0 && rawMax >= rawMin && (
              <div className="pos-salary-summary-banner">
                <FiCheckCircle className="pos-icon-success" />
                <span>
                  Khoảng lương: <strong>{formatCurrency(rawMin)}</strong> —{' '}
                  <strong>{formatCurrency(rawMax)}</strong> (Chênh lệch:{' '}
                  {formatCurrency(rawMax - rawMin)})
                </span>
              </div>
            )}
          </div>

          <div className="pos-form-grid-2">
            <div className="pos-form-group">
              <label htmlFor="status" className="pos-form-label">
                Trạng thái áp dụng
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="pos-form-select"
              >
                <option value="ACTIVE">Đang áp dụng (Active)</option>
                <option value="INACTIVE">Tạm ngưng (Inactive)</option>
              </select>
            </div>

            <div className="pos-form-group">
              <label className="pos-form-label">Quy định bảo mật</label>
              <div className="pos-security-badge">
                🔒 Chỉ Trưởng phòng Nhân sự có quyền xem dải lương
              </div>
            </div>
          </div>

          <div className="pos-form-group">
            <label htmlFor="description" className="pos-form-label">
              <FiFileText className="pos-input-icon" /> Mô tả nhiệm vụ & Tiêu chuẩn tuyển dụng
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Nhập yêu cầu cơ bản, trách nhiệm công việc hoặc ghi chú bổ sung..."
              value={formData.description}
              onChange={handleChange}
              className="pos-form-textarea"
            />
          </div>

          <div className="pos-modal-actions">
            <button type="button" className="pos-btn pos-btn-secondary" onClick={onClose}>
              Hủy bỏ
            </button>
            <button type="submit" className="pos-btn pos-btn-primary">
              {isEditMode ? 'Cập Nhật Chức Danh' : 'Lưu Chức Danh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PositionForm;
