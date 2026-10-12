import React from 'react';

const money = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return '—';
  }

  return `${number.toLocaleString('vi-VN')} đ`;
};

const BudgetSummary = ({
  loading = false,
  error = '',
  data = null,
  cost = null,
  excess = null,
  status = '',
  creating = false,
}) => {
  const exceeded = Boolean(excess?.exceeded);

  return (
    <div className="rb-card">
      <h2>
        Chỉ tiêu phòng ban
        {data?.budget_year ? ` · ${data.budget_year}` : ' · Chưa chọn năm'}
      </h2>

      <p className="rb-muted">
        Chi phí yêu cầu: <strong>{money(cost)}</strong>
        {' · '}
        Số lượng tuyển × lương tối đa/tháng × 12
      </p>

      {loading ? (
        <p role="status">Đang tải chỉ tiêu...</p>
      ) : error ? (
        <p className="rb-alert">{error}</p>
      ) : data ? (
        <>
          <div className="rb-budget-grid">
            {[
              ['Tổng chỉ tiêu nhân sự', data.total_headcount],
              ['Nhân sự đã sử dụng', data.used_headcount],
              ['Chỉ tiêu nhân sự còn lại', data.remaining_headcount],
              ['Tổng ngân sách lương', money(data.total_salary_budget)],
              ['Ngân sách đã sử dụng', money(data.used_salary_budget)],
              ['Ngân sách còn lại', money(data.remaining_salary_budget)],
            ].map(([label, value]) => (
              <div className="rb-budget-item" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          {excess && (
            <div
              className={
                exceeded
                  ? 'rb-budget-warning rb-budget-warning-danger'
                  : 'rb-budget-warning'
              }
            >
              <strong>
                {exceeded ? 'Vượt chỉ tiêu' : 'Trong chỉ tiêu'}
              </strong>

              {exceeded && (
                <div>
                  Mức vượt chỉ tiêu nhân sự: {excess.headcount || 0}
                  {' · '}
                  Mức vượt ngân sách: {money(excess.salary || 0)}
                </div>
              )}

              {status === 'APPROVED' && exceeded && (
                <div>
                  Yêu cầu đã được phê duyệt. Đây là mức vượt hiện tại của
                  phòng ban, không phải lịch sử tại thời điểm duyệt.
                </div>
              )}

              {creating && exceeded && (
                <div>
                  Bạn vẫn có thể gửi chờ duyệt. Trưởng phòng Nhân sự phải
                  xác nhận ghi đè và nhập lý do khi phê duyệt.
                </div>
              )}
            </div>
          )}

          {creating && (
            <p className="rb-muted">
              Yêu cầu chờ duyệt chưa giữ chỗ chỉ tiêu. Chỉ tiêu được kiểm
              tra lại khi Trưởng phòng Nhân sự phê duyệt.
            </p>
          )}
        </>
      ) : (
        <div className="rb-budget-warning">
          Chọn phòng ban và ngày cần người để xem chỉ tiêu.
        </div>
      )}
    </div>
  );
};

export default BudgetSummary;