import React, { useEffect, useState } from 'react';

const ApprovalDialog = ({
  mode,
  busy,
  error,
  canOverride,
  excess,
  onCancel,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setReason('');
    setConfirmed(false);
    setLocalError('');
  }, [mode]);

  const isReject = mode === 'reject';
  const isOverride = mode === 'override';
  const isApprove = mode === 'approve';

  const money = (value) => {
    const number = Number(value || 0);

    return `${number.toLocaleString('vi-VN')} đ`;
  };

  const handleSubmit = () => {
    const trimmedReason = reason.trim();

    if (isReject && !trimmedReason) {
      setLocalError('Vui lòng nhập lý do từ chối.');
      return;
    }

    if (isOverride && !trimmedReason) {
      setLocalError('Vui lòng nhập lý do ghi đè chỉ tiêu.');
      return;
    }

    if (isOverride && !confirmed) {
      setLocalError(
        'Bạn cần xác nhận phê duyệt vượt chỉ tiêu.'
      );
      return;
    }

    if (isOverride && !canOverride) {
      setLocalError(
        'Bạn không có quyền phê duyệt vượt chỉ tiêu.'
      );
      return;
    }

    setLocalError('');

    onConfirm(
      isApprove ? '' : trimmedReason
    );
  };

  const config = isReject
    ? {
        title: 'Từ chối yêu cầu tuyển dụng',
        description:
          'Yêu cầu sẽ chuyển sang trạng thái đã từ chối. Vui lòng ghi rõ lý do để người tạo có thể kiểm tra.',
        button: 'Xác nhận từ chối',
        buttonColor: '#dc2626',
        headerColor: '#dc2626',
      }
    : isOverride
    ? {
        title: 'Xác nhận duyệt vượt chỉ tiêu',
        description:
          'Yêu cầu này vượt chỉ tiêu nhân sự hoặc ngân sách. Việc ghi đè chỉ áp dụng cho yêu cầu hiện tại.',
        button: 'Xác nhận ghi đè và duyệt',
        buttonColor: '#4f46e5',
        headerColor: '#c2410c',
      }
    : {
        title: 'Xác nhận phê duyệt',
        description:
          'Yêu cầu đang nằm trong chỉ tiêu. Bạn có chắc chắn muốn phê duyệt yêu cầu tuyển dụng này?',
        button: 'Xác nhận duyệt',
        buttonColor: '#4f46e5',
        headerColor: '#15803d',
      };

  const disabled =
    busy ||
    (isOverride &&
      (!reason.trim() ||
        !confirmed ||
        !canOverride)) ||
    (isReject && !reason.trim());

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        onClick={(event) =>
          event.stopPropagation()
        }
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow:
            '0 24px 70px rgba(15, 23, 42, 0.28)',
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '24px 26px 18px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '18px',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '23px',
                  color: '#0f172a',
                }}
              >
                {config.title}
              </h2>

              <p
                style={{
                  margin: '8px 0 0',
                  color: '#64748b',
                  lineHeight: 1.55,
                  fontSize: '14px',
                }}
              >
                {config.description}
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              style={{
                width: '36px',
                height: '36px',
                border: 'none',
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#475569',
                cursor: busy
                  ? 'not-allowed'
                  : 'pointer',
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div
          style={{
            padding: '22px 26px',
          }}
        >
          {/* VƯỢT CHỈ TIÊU */}
          {isOverride && (
            <div
              style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  color: '#c2410c',
                  fontWeight: 800,
                  marginBottom: '10px',
                }}
              >
                ⚠ Yêu cầu vượt chỉ tiêu
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    background: '#ffffff',
                    padding: '12px',
                    borderRadius: '9px',
                  }}
                >
                  <div
                    style={{
                      color: '#64748b',
                      fontSize: '12px',
                    }}
                  >
                    Vượt số lượng tuyển
                  </div>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '4px',
                      color: '#dc2626',
                      fontSize: '18px',
                    }}
                  >
                    {Number(
                      excess?.headcount || 0
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    padding: '12px',
                    borderRadius: '9px',
                  }}
                >
                  <div
                    style={{
                      color: '#64748b',
                      fontSize: '12px',
                    }}
                  >
                    Vượt ngân sách
                  </div>

                  <strong
                    style={{
                      display: 'block',
                      marginTop: '4px',
                      color: '#dc2626',
                      fontSize: '18px',
                    }}
                  >
                    {money(
                      excess?.salary || 0
                    )}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* LÝ DO */}
          {(isReject || isOverride) && (
            <div
              style={{
                marginBottom: '18px',
              }}
            >
              <label
                style={{
                  display: 'block',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '14px',
                  marginBottom: '7px',
                }}
              >
                {isReject
                  ? 'Lý do từ chối'
                  : 'Lý do ghi đè chỉ tiêu'}{' '}
                <span
                  style={{
                    color: '#dc2626',
                  }}
                >
                  *
                </span>
              </label>

              <textarea
                rows="4"
                value={reason}
                disabled={busy}
                onChange={(event) => {
                  setReason(
                    event.target.value
                  );

                  if (localError) {
                    setLocalError('');
                  }
                }}
                placeholder={
                  isReject
                    ? 'Nhập lý do từ chối yêu cầu...'
                    : 'Ví dụ: Nhu cầu tuyển dụng gấp phục vụ dự án mới...'
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '105px',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {/* CHECKBOX OVERRIDE */}
          {isOverride && (
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                background: '#f8fafc',
                padding: '13px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '18px',
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(event) => {
                  setConfirmed(
                    event.target.checked
                  );

                  if (localError) {
                    setLocalError('');
                  }
                }}
                style={{
                  marginTop: '3px',
                  width: '17px',
                  height: '17px',
                }}
              />

              <span
                style={{
                  color: '#334155',
                  lineHeight: 1.45,
                  fontSize: '14px',
                }}
              >
                Tôi xác nhận phê duyệt yêu cầu vượt
                chỉ tiêu và đã kiểm tra mức vượt
                hiển thị ở trên.
              </span>
            </label>
          )}

          {/* ERROR */}
          {(localError || error) && (
            <div
              role="alert"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '11px 13px',
                borderRadius: '9px',
                fontSize: '13px',
              }}
            >
              {localError || error}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '17px 26px 22px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              cursor: busy
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '10px',
              background: config.buttonColor,
              color: '#ffffff',
              fontWeight: 700,
              cursor: disabled
                ? 'not-allowed'
                : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {busy
              ? 'Đang xử lý...'
              : config.button}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDialog;