import React, { useState, useEffect } from 'react';
import {
  FiPlus,
  FiRotateCcw,
  FiShield,
  FiUserCheck,
  FiBriefcase,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiCheck,
  FiTrendingUp,
} from 'react-icons/fi';
import PositionTable from '../../components/PositionTable';
import PositionForm from '../../components/PositionForm';
import {
  fetchPositions,
  savePositionData,
  deletePositionData,
  resetLocalPositions,
} from '../../services/positionService';
import { formatCurrency, formatNumberWithDots, parseRawNumber } from '../../utils/formatters';
import '../../styles/positions.css';

function PositionManagement() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('HR_MANAGER'); // 'HR_MANAGER' hoặc 'HR_STAFF'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [deletingPosition, setDeletingPosition] = useState(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Offer Checker Simulator
  const [checkerPositionId, setCheckerPositionId] = useState('');
  const [checkerProposedSalary, setCheckerProposedSalary] = useState('');
  const [checkerResult, setCheckerResult] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPositions();
      setPositions(data);
      if (data.length > 0 && !checkerPositionId) {
        setCheckerPositionId(data[0].position_id || data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleAddNew = () => {
    if (currentRole !== 'HR_MANAGER') {
      showToast('Chỉ Trưởng phòng Nhân sự mới có quyền thêm chức danh!', 'error');
      return;
    }
    setEditingPosition(null);
    setIsFormOpen(true);
  };

  const handleEdit = (pos) => {
    if (currentRole !== 'HR_MANAGER') {
      showToast('Chỉ Trưởng phòng Nhân sự mới có quyền sửa dải lương!', 'error');
      return;
    }
    setEditingPosition(pos);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      await savePositionData(data);
      await loadData();
      showToast(
        data.position_id
          ? `Cập nhật chức danh "${data.position_name}" thành công!`
          : `Thêm mới chức danh "${data.position_name}" thành công!`
      );
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  };

  const handleDeleteRequest = (pos) => {
    if (currentRole !== 'HR_MANAGER') {
      showToast('Chỉ Trưởng phòng Nhân sự mới có quyền xóa chức danh!', 'error');
      return;
    }
    setDeletingPosition(pos);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPosition) return;
    const targetId = deletingPosition.position_id || deletingPosition.id;
    await deletePositionData(targetId);
    await loadData();
    showToast(`Đã xóa chức danh "${deletingPosition.position_name || deletingPosition.name}".`);
    setDeletingPosition(null);
  };

  const handleResetData = () => {
    if (window.confirm('Khôi phục danh sách chức danh mẫu ban đầu?')) {
      const defaults = resetLocalPositions();
      setPositions(defaults);
      showToast('Đã khôi phục dữ liệu mẫu ban đầu thành công!');
    }
  };

  const handleCheckOffer = (e) => {
    e.preventDefault();
    const targetPos = positions.find(
      (p) => (p.position_id || p.id) == checkerPositionId
    );
    if (!targetPos) {
      setCheckerResult({ status: 'error', message: 'Vui lòng chọn chức danh cần kiểm tra.' });
      return;
    }

    const proposed = parseRawNumber(checkerProposedSalary);
    if (!proposed || proposed <= 0) {
      setCheckerResult({ status: 'error', message: 'Vui lòng nhập mức lương đề xuất hợp lệ.' });
      return;
    }

    const minSal = targetPos.min_salary !== undefined ? targetPos.min_salary : targetPos.minSalary;
    const maxSal = targetPos.max_salary !== undefined ? targetPos.max_salary : targetPos.maxSalary;

    if (proposed < minSal) {
      setCheckerResult({
        status: 'warning',
        title: 'Thấp hơn sàn dải lương',
        message: `Mức đề xuất (${formatCurrency(proposed)}) thấp hơn mức sàn công ty đã duyệt (${formatCurrency(minSal)}). Cần xem xét lại quyền lợi ứng viên.`,
      });
    } else if (proposed > maxSal) {
      setCheckerResult({
        status: 'danger',
        title: 'Vượt trần khung lương duyệt (Cần phê duyệt ngoại lệ)',
        message: `Mức đề xuất (${formatCurrency(proposed)}) vượt trần cho phép (${formatCurrency(maxSal)}) là ${formatCurrency(proposed - maxSal)}. Cần gửi yêu cầu phê duyệt ngoại lệ đến Ban Giám Đốc!`,
      });
    } else {
      setCheckerResult({
        status: 'success',
        title: 'Hợp lệ! Nằm trong khung lương đã duyệt',
        message: `Mức đề xuất (${formatCurrency(proposed)}) nằm trọn vẹn trong dải lương [${formatCurrency(minSal)} - ${formatCurrency(maxSal)}]. Đủ điều kiện duyệt offer!`,
      });
    }
  };

  const activeCount = positions.filter((p) => (p.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  const avgMinSalary =
    positions.length > 0
      ? positions.reduce((acc, p) => acc + (Number(p.min_salary || p.minSalary) || 0), 0) / positions.length
      : 0;
  const avgMaxSalary =
    positions.length > 0
      ? positions.reduce((acc, p) => acc + (Number(p.max_salary || p.maxSalary) || 0), 0) / positions.length
      : 0;

  return (
    <div className="positions-page-wrapper">
      {toast && (
        <div className={`pos-toast toast-${toast.type}`}>
          {toast.type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="pos-page-header">
        <div>
          <div className="pos-breadcrumb">
            <span>Hệ Thống Tuyển Dụng</span> / <span>Danh Mục Vị Trí</span> /{' '}
            <strong className="pos-badge-ticket">SCRUM-62</strong>
          </div>
          <h1 className="pos-page-title">Quản Lý Danh Mục Chức Danh & Khung Dải Lương</h1>
          <p className="pos-page-desc">
            Khai báo và kiểm soát định mức dải lương theo từng vị trí chuyên môn, thiết lập hạn mức
            chuẩn cho quy trình phê duyệt offer tuyển dụng (Subtask SCRUM-97 & SCRUM-98).
          </p>
        </div>

        <div className="pos-role-switch">
          <div className="pos-role-title">
            <FiShield /> Vai trò demo (Kiểm thử SCRUM-99):
          </div>
          <div className="pos-role-tabs">
            <button
              type="button"
              className={`pos-role-btn ${currentRole === 'HR_MANAGER' ? 'active manager' : ''}`}
              onClick={() => {
                setCurrentRole('HR_MANAGER');
                showToast('Chuyển sang: Trưởng phòng Nhân sự (Xem & Quản lý đầy đủ dải lương)');
              }}
            >
              <FiUserCheck /> Trưởng phòng Nhân sự
            </button>
            <button
              type="button"
              className={`pos-role-btn ${currentRole === 'HR_STAFF' ? 'active staff' : ''}`}
              onClick={() => {
                setCurrentRole('HR_STAFF');
                showToast('Chuyển sang: Nhân viên Tuyển dụng (Dải lương bị bảo mật)');
              }}
            >
              <FiShield /> Nhân viên Tuyển dụng
            </button>
          </div>
        </div>
      </div>

      <div className="pos-stats-grid">
        <div className="pos-stat-card">
          <div className="pos-stat-icon stat-blue">
            <FiBriefcase />
          </div>
          <div className="pos-stat-content">
            <span className="pos-stat-label">Tổng số chức danh</span>
            <span className="pos-stat-val">{positions.length}</span>
            <span className="pos-stat-sub">Vị trí trong danh mục</span>
          </div>
        </div>

        <div className="pos-stat-card">
          <div className="pos-stat-icon stat-emerald">
            <FiCheckCircle />
          </div>
          <div className="pos-stat-content">
            <span className="pos-stat-label">Đang áp dụng</span>
            <span className="pos-stat-val">{activeCount}</span>
            <span className="pos-stat-sub">Vị trí sẵn sàng tuyển</span>
          </div>
        </div>

        <div className="pos-stat-card">
          <div className="pos-stat-icon stat-purple">
            <FiDollarSign />
          </div>
          <div className="pos-stat-content">
            <span className="pos-stat-label">Khung lương trung bình</span>
            <span className="pos-stat-val">
              {currentRole === 'HR_MANAGER' ? (
                `${(avgMinSalary / 1000000).toFixed(0)}M - ${(avgMaxSalary / 1000000).toFixed(0)}M`
              ) : (
                '••••••••'
              )}
            </span>
            <span className="pos-stat-sub">
              {currentRole === 'HR_MANAGER' ? 'Định mức toàn công ty' : 'Bảo mật - Chỉ TP Nhân sự'}
            </span>
          </div>
        </div>

        <div className="pos-stat-card">
          <div className="pos-stat-icon stat-amber">
            <FiShield />
          </div>
          <div className="pos-stat-content">
            <span className="pos-stat-label">Quyền xem dải lương</span>
            <span className="pos-stat-val">
              {currentRole === 'HR_MANAGER' ? 'Toàn quyền' : 'Bảo mật'}
            </span>
            <span className="pos-stat-sub">
              {currentRole === 'HR_MANAGER' ? 'Trưởng phòng Nhân sự' : 'Chỉ xem mã & tên'}
            </span>
          </div>
        </div>
      </div>

      <div className="pos-actions-bar">
        <div className="pos-section-title-wrap">
          <h2 className="pos-section-title">Danh sách chức danh & Dải lương</h2>
          <span className="pos-badge-count">{positions.length} bản ghi</span>
        </div>

        <div className="pos-btn-group">
          <button
            type="button"
            className="pos-btn pos-btn-outline"
            onClick={handleResetData}
            title="Khôi phục dữ liệu mẫu ban đầu"
          >
            <FiRotateCcw /> Đặt lại mẫu
          </button>

          <button
            type="button"
            className="pos-btn pos-btn-primary"
            onClick={handleAddNew}
            disabled={currentRole !== 'HR_MANAGER'}
            title={
              currentRole === 'HR_MANAGER'
                ? 'Thêm chức danh & dải lương mới'
                : 'Chỉ Trưởng phòng Nhân sự mới có quyền thêm'
            }
          >
            <FiPlus /> Thêm chức danh mới
          </button>
        </div>
      </div>

      <PositionTable
        positions={positions}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        currentRole={currentRole}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
      />

      <div className="pos-offer-checker">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pos-stat-icon stat-blue">
            <FiTrendingUp />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
              Công cụ kiểm soát hạn mức duyệt Offer theo khung lương (SCRUM-62)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: '#475569' }}>
              Kiểm tra nhanh xem mức lương tuyển dụng đề xuất cho ứng viên có nằm trong dải lương đã duyệt hay không.
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckOffer}>
          <div className="checker-row">
            <div className="pos-form-group" style={{ flex: 1, minWidth: '220px' }}>
              <label className="pos-form-label">Chọn vị trí chức danh đề xuất</label>
              <select
                className="pos-form-select"
                value={checkerPositionId}
                onChange={(e) => {
                  setCheckerPositionId(e.target.value);
                  setCheckerResult(null);
                }}
              >
                {positions.map((p) => (
                  <option key={p.position_id || p.id} value={p.position_id || p.id}>
                    [{p.position_code || p.code}] {p.position_name || p.name} ({p.position_level || p.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="pos-form-group" style={{ flex: 1, minWidth: '220px' }}>
              <label className="pos-form-label">Mức lương đề xuất offer (VNĐ)</label>
              <div className="pos-input-with-suffix">
                <input
                  type="text"
                  className="pos-form-input"
                  placeholder="VD: 25.000.000"
                  value={checkerProposedSalary}
                  onChange={(e) => {
                    setCheckerProposedSalary(formatNumberWithDots(e.target.value));
                    setCheckerResult(null);
                  }}
                />
                <span className="pos-input-suffix">₫</span>
              </div>
            </div>

            <div style={{ marginBottom: '2px' }}>
              <button type="submit" className="pos-btn pos-btn-primary">
                <FiCheck /> Kiểm tra hạn mức
              </button>
            </div>
          </div>

          {checkerResult && (
            <div className={`checker-banner ${checkerResult.status}`}>
              {checkerResult.status === 'success' && <FiCheckCircle style={{ fontSize: '1.3rem', flexShrink: 0 }} />}
              {checkerResult.status === 'warning' && <FiAlertCircle style={{ fontSize: '1.3rem', flexShrink: 0 }} />}
              {checkerResult.status === 'danger' && <FiAlertCircle style={{ fontSize: '1.3rem', flexShrink: 0 }} />}
              <div>
                <strong>{checkerResult.title}</strong>
                <p style={{ margin: '4px 0 0' }}>{checkerResult.message}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {isFormOpen && (
        <PositionForm
          key={editingPosition ? (editingPosition.position_id || editingPosition.id) : 'create-new'}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingPosition}
        />
      )}

      {deletingPosition && (
        <div className="pos-modal-overlay" onClick={() => setDeletingPosition(null)}>
          <div className="pos-modal-container pos-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h3 className="pos-modal-title">Xác nhận xóa chức danh</h3>
              <button
                type="button"
                className="pos-btn-close"
                onClick={() => setDeletingPosition(null)}
              >
                <FiX />
              </button>
            </div>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <FiAlertCircle style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '12px' }} />
              <p style={{ margin: 0 }}>
                Bạn có chắc chắn muốn xóa chức danh{' '}
                <strong>
                  [{deletingPosition.position_code || deletingPosition.code}]{' '}
                  {deletingPosition.position_name || deletingPosition.name}
                </strong>{' '}
                khỏi hệ thống không?
              </p>
            </div>
            <div className="pos-modal-actions" style={{ padding: '1rem 1.5rem' }}>
              <button
                type="button"
                className="pos-btn pos-btn-secondary"
                onClick={() => setDeletingPosition(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="pos-btn pos-btn-danger"
                onClick={handleConfirmDelete}
              >
                Xóa chức danh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PositionManagement;
