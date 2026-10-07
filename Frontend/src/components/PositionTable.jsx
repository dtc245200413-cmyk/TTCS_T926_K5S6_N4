import React from 'react';
import {
  FiEdit2,
  FiTrash2,
  FiLock,
  FiUnlock,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
} from 'react-icons/fi';
import { formatCurrency, getLevelBadge, POSITION_LEVELS } from '../utils/formatters';

function PositionTable({
  positions,
  onEdit,
  onDelete,
  isHrManager: isHrManagerProp,
  userRoleName,
  currentRole,
  searchTerm,
  setSearchTerm,
  selectedLevel,
  setSelectedLevel,
  selectedStatus,
  setSelectedStatus,
}) {
  const isHrManager =
    isHrManagerProp !== undefined ? isHrManagerProp : currentRole === 'HR_MANAGER';

  const filteredPositions = positions.filter((pos) => {
    const code = pos.position_code || pos.code || '';
    const name = pos.position_name || pos.name || '';
    const level = pos.position_level || pos.level || '';
    const status = (pos.status || '').toUpperCase();

    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLevel = selectedLevel === 'ALL' || level === selectedLevel;

    const matchesStatus =
      selectedStatus === 'ALL' || status === selectedStatus.toUpperCase();

    return matchesSearch && matchesLevel && matchesStatus;
  });

  return (
    <div className="pos-table-card">
      <div className="pos-table-toolbar">
        <div className="pos-search-box">
          <FiSearch className="pos-search-icon" />
          <input
            type="text"
            className="pos-search-input"
            placeholder="Tìm theo tên chức danh hoặc mã chức danh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="pos-clear-btn"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="pos-filter-group">
          <div className="pos-select-wrap">
            <FiFilter className="pos-filter-icon" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="pos-toolbar-select"
            >
              <option value="ALL">Tất cả cấp bậc</option>
              {POSITION_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pos-select-wrap">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="pos-toolbar-select"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang áp dụng</option>
              <option value="INACTIVE">Tạm ngưng</option>
            </select>
          </div>
        </div>
      </div>

      {!isHrManager ? (
        <div className="pos-role-alert">
          <FiLock className="pos-alert-icon" />
          <div>
            <strong>Chế độ xem: {userRoleName || 'Chức vụ khác'} (Dải lương bị bảo mật)</strong>
            <p>
              Theo quy định phân quyền hệ thống: Dải lương tối thiểu và
              tối đa được bảo mật, chỉ <strong>Trưởng phòng Nhân sự</strong> mới có quyền xem và cấu
              hình dải lương này.
            </p>
          </div>
        </div>
      ) : (
        <div className="pos-role-alert manager-alert">
          <FiUnlock className="pos-alert-icon" />
          <div>
            <strong>Quyền hạn: Trưởng phòng Nhân sự (HR Manager)</strong>
            <p>
              Bạn có đầy đủ thẩm quyền xem dải lương, quản lý hạn mức duyệt offer và thêm/sửa/xóa
              danh mục chức danh.
            </p>
          </div>
        </div>
      )}

      <div className="pos-table-responsive">
        <table className="pos-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }} className="text-center">STT</th>
              <th style={{ width: '130px' }}>Mã chức danh</th>
              <th>Tên chức danh & Nhiệm vụ</th>
              <th style={{ width: '150px' }}>Cấp bậc</th>
              <th style={{ width: '160px' }} className="text-right">
                Lương tối thiểu {isHrManager ? '' : '🔒'}
              </th>
              <th style={{ width: '160px' }} className="text-right">
                Lương tối đa {isHrManager ? '' : '🔒'}
              </th>
              <th style={{ width: '130px' }} className="text-center">Trạng thái</th>
              <th style={{ width: '130px' }} className="text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredPositions.length === 0 ? (
              <tr>
                <td colSpan={8} className="pos-empty-row">
                  <div className="pos-empty-state">
                    <FiInfo className="pos-empty-icon" />
                    <p className="pos-empty-title">Không tìm thấy chức danh phù hợp</p>
                    <p className="pos-empty-desc">
                      Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc cấp bậc / trạng thái.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPositions.map((pos, index) => {
                const code = pos.position_code || pos.code;
                const name = pos.position_name || pos.name;
                const level = pos.position_level || pos.level;
                const minSal = pos.min_salary !== undefined ? pos.min_salary : pos.minSalary;
                const maxSal = pos.max_salary !== undefined ? pos.max_salary : pos.maxSalary;
                const status = (pos.status || 'ACTIVE').toUpperCase();
                const badgeInfo = getLevelBadge(level);

                return (
                  <tr key={pos.position_id || pos.id || index} className="pos-tr-hover">
                    <td className="text-center text-muted font-medium">{index + 1}</td>
                    <td>
                      <span className="pos-code-badge">{code}</span>
                    </td>
                    <td>
                      <div className="pos-name-wrap">
                        <span className="pos-name">{name}</span>
                        {pos.description && (
                          <span className="pos-desc" title={pos.description}>
                            {pos.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`pos-level-pill pos-level-${badgeInfo.color}`}>
                        {badgeInfo.label}
                      </span>
                    </td>

                    <td className="text-right">
                      {isHrManager ? (
                        <span className="pos-sal-val min-salary">
                          {formatCurrency(minSal)}
                        </span>
                      ) : (
                        <span className="pos-sal-masked" title="Chỉ Trưởng phòng Nhân sự xem được">
                          •••••••• ₫
                        </span>
                      )}
                    </td>

                    <td className="text-right">
                      {isHrManager ? (
                        <span className="pos-sal-val max-salary">
                          {formatCurrency(maxSal)}
                        </span>
                      ) : (
                        <span className="pos-sal-masked" title="Chỉ Trưởng phòng Nhân sự xem được">
                          •••••••• ₫
                        </span>
                      )}
                    </td>

                    <td className="text-center">
                      {status === 'ACTIVE' ? (
                        <span className="pos-status-badge status-active">
                          <FiCheckCircle className="status-icon" /> Đang áp dụng
                        </span>
                      ) : (
                        <span className="pos-status-badge status-inactive">
                          <FiAlertTriangle className="status-icon" /> Tạm ngưng
                        </span>
                      )}
                    </td>

                    <td className="text-center">
                      <div className="pos-actions-cell">
                        <button
                          type="button"
                          className="pos-action-btn btn-edit"
                          title={
                            isHrManager
                              ? 'Chỉnh sửa chức danh & dải lương'
                              : 'Chỉ Trưởng phòng Nhân sự mới được chỉnh sửa'
                          }
                          disabled={!isHrManager}
                          onClick={() => onEdit(pos)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="pos-action-btn btn-delete"
                          title={
                            isHrManager
                              ? 'Xóa chức danh'
                              : 'Chỉ Trưởng phòng Nhân sự mới được xóa'
                          }
                          disabled={!isHrManager}
                          onClick={() => onDelete(pos)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="pos-table-footer">
        <div>
          Hiển thị <strong>{filteredPositions.length}</strong> / <strong>{positions.length}</strong> chức danh
        </div>
        <div className="pos-table-note">
          * Dải lương được áp dụng làm hạn mức trần & sàn khi phòng nhân sự duyệt quyết định offer.
        </div>
      </div>
    </div>
  );
}

export default PositionTable;
