import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';

import { AuthContext } from '../../context/AuthContext';
import requestApi from '../../api/recruitmentRequestApi';

import useDepartmentBudget from '../../hooks/useDepartmentBudget';

import BudgetSummary from '../../components/recruitment/BudgetSummary';
import ApprovalDialog from '../../components/recruitment/ApprovalDialog';

import {
  budgetExcess,
  money,
  requestCost,
  requestYear,
  statusLabels,
} from '../../utils/recruitmentBudget';

const RecruitmentRequestDetail = () => {
  const { id } = useParams();

  const { user, hasPermission } =
    useContext(AuthContext);

  const isHrManager = user?.roles?.some(
    (role) => role.role_code === 'HR_MANAGER'
  );

  const canApprove =
    isHrManager &&
    hasPermission('RECRUITMENT_REQUEST_APPROVE');

  const canReject =
    isHrManager &&
    hasPermission('RECRUITMENT_REQUEST_REJECT');

  const canOverride =
    isHrManager &&
    hasPermission('RECRUITMENT_REQUEST_OVERRIDE');

  const canViewAll =
    isHrManager &&
    hasPermission('RECRUITMENT_REQUEST_VIEW_ALL');

  const [request, setRequest] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [version, setVersion] = useState(0);

  const [dialog, setDialog] = useState(null);
  const [decisionError, setDecisionError] = useState('');

  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  const year = request ? requestYear(request) : '';

  const cost = request ? requestCost(request) : null;

  const budget = useDepartmentBudget(
    request?.department_id,
    year
  );

  const excess = useMemo(() => {
    if (!request) return null;

    return budgetExcess(
      budget.data,
      request.headcount,
      cost,
      request.status
    );
  }, [
    budget.data,
    request,
    cost,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setRequest(null);
    setError('');
    setDialog(null);
    setSuccess('');

    requestApi
      .getById(id, {
        signal: controller.signal,
      })
      .then((response) => {
        if (!controller.signal.aborted) {
          setRequest(response.data.data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.message ||
              'Không tải được yêu cầu tuyển dụng.'
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, version]);

  const decide = async (reason) => {
    if (
      busy ||
      request?.status !== 'PENDING'
    ) {
      return;
    }

    const rejecting = dialog === 'reject';

    if (rejecting && !canReject) {
      return;
    }

    if (!rejecting && !canApprove) {
      return;
    }

    if (
      dialog === 'override' &&
      !canOverride
    ) {
      return;
    }

    let payload;

    if (rejecting) {
      payload = {
        status: 'REJECTED',
        rejection_reason: reason,
      };
    } else if (dialog === 'override') {
      payload = {
        status: 'APPROVED',
        is_override: true,
        override_reason: reason,
      };
    } else {
      payload = {
        status: 'APPROVED',
      };
    }

    setBusy(true);
    setDecisionError('');
    setSuccess('');

    try {
      const response =
        await requestApi.decide(
          id,
          payload
        );

      setRequest(response.data.data);
      setDialog(null);

      setSuccess(
        rejecting
          ? 'Đã từ chối yêu cầu tuyển dụng.'
          : 'Đã phê duyệt yêu cầu tuyển dụng.'
      );

      budget.refresh();
    } catch (err) {
      const result = err.response?.data;

      if (
        result?.code ===
        'BUDGET_EXCEEDED'
      ) {
        if (result.details) {
          budget.replace(result.details);
        }

        setDialog('override');

        setDecisionError(
          'Chỉ tiêu đã thay đổi hoặc không còn đủ. Hãy kiểm tra lại mức vượt và xác nhận ghi đè nếu được phép.'
        );
      } else if (
        result?.code ===
        'REQUEST_NOT_PENDING'
      ) {
        setDialog(null);

        setVersion(
          (value) => value + 1
        );

        setSuccess(
          'Yêu cầu đã được xử lý trước đó. Hệ thống đã tải lại trạng thái mới.'
        );
      } else {
        setDecisionError(
          result?.message ||
            'Không thực hiện được thao tác. Vui lòng thử lại.'
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'DRAFT':
        return {
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #cbd5e1',
        };

      case 'PENDING':
        return {
          background: '#fff7ed',
          color: '#c2410c',
          border: '1px solid #fed7aa',
        };

      case 'APPROVED':
        return {
          background: '#f0fdf4',
          color: '#15803d',
          border: '1px solid #bbf7d0',
        };

      case 'REJECTED':
        return {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        };

      default:
        return {
          background: '#f8fafc',
          color: '#475569',
          border: '1px solid #e2e8f0',
        };
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }

    return date.toLocaleDateString(
      'vi-VN'
    );
  };

  const formatDateTime = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(
      'vi-VN'
    );
  };

  const detailItem = (
    label,
    value
  ) => (
    <div
      style={{
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '17px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: '#64748b',
          fontSize: '13px',
          marginBottom: '7px',
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: '#0f172a',
          fontWeight: 700,
          fontSize: '16px',
          wordBreak: 'break-word',
        }}
      >
        {value ?? '—'}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#64748b',
        }}
        role="status"
      >
        Đang tải yêu cầu tuyển dụng...
      </div>
    );
  }

  if (error || !request) {
    return (
      <div
        style={{
          padding: '28px',
        }}
      >
        <div
          role="alert"
          style={{
            padding: '15px 18px',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            marginBottom: '16px',
          }}
        >
          {error ||
            'Không tìm thấy yêu cầu tuyển dụng.'}
        </div>

        <button
          type="button"
          onClick={() =>
            setVersion(
              (value) => value + 1
            )
          }
          style={{
            border: 'none',
            borderRadius: '10px',
            background: '#4f46e5',
            color: '#ffffff',
            padding: '10px 18px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const requestCode =
    request.requisition_code ||
    `#${request.requisition_id ?? request.id}`;

  const neededDate =
    request.date_needed ||
    request.needed_by_date;

  const minSalary =
    request.proposed_min_salary ??
    request.proposed_salary_min;

  const maxSalary =
    request.proposed_max_salary ??
    request.proposed_salary_max;

  const isPending =
    request.status === 'PENDING';

  return (
    <div
      style={{
        padding: '28px',
        background: '#f8fafc',
        minHeight: '100%',
      }}
    >
      {/* THANH ĐIỀU HƯỚNG */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '18px',
        }}
      >
        <Link
          to={
            canViewAll
              ? '/recruitment-requests/approvals'
              : '/recruitment-requests'
          }
          style={{
            color: '#4338ca',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Quay lại danh sách yêu cầu
        </Link>

        {isPending && (
          <div
            style={{
              display: 'flex',
              gap: '10px',
            }}
          >
            {canReject && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setDialog('reject');
                  setDecisionError('');
                }}
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px 20px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: busy
                    ? 'not-allowed'
                    : 'pointer',
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Từ chối
              </button>
            )}

            {canApprove && (
              <button
                type="button"
                disabled={
                  busy ||
                  budget.loading ||
                  !budget.data ||
                  !excess
                }
                onClick={() => {
                  setDecisionError('');

                  setDialog(
                    excess?.exceeded
                      ? 'override'
                      : 'approve'
                  );
                }}
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '11px 22px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor:
                    busy ||
                    budget.loading ||
                    !budget.data ||
                    !excess
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    busy ||
                    budget.loading ||
                    !budget.data ||
                    !excess
                      ? 0.6
                      : 1,
                }}
              >
                Duyệt yêu cầu
              </button>
            )}
          </div>
        )}
      </div>

      {/* THÔNG BÁO THÀNH CÔNG */}
      {success && (
        <div
          role="status"
          style={{
            padding: '14px 18px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '12px',
            marginBottom: '18px',
          }}
        >
          {success}
        </div>
      )}

      {/* THÔNG TIN ĐẦU TRANG */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '26px 28px',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div
              style={{
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '7px',
              }}
            >
              {requestCode}
            </div>

            <h1
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: '30px',
                fontWeight: 800,
              }}
            >
              Tuyển dụng{' '}
              {request.position_name ||
                'chưa xác định chức danh'}
            </h1>

            <p
              style={{
                margin: '9px 0 0',
                color: '#64748b',
              }}
            >
              Người tạo:{' '}
              <strong>
                {request.created_by_name ||
                  '—'}
              </strong>
              {' · '}
              {formatDateTime(
                request.created_at
              )}
            </p>
          </div>

          <span
            style={{
              display: 'inline-block',
              padding: '8px 13px',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '14px',
              whiteSpace: 'nowrap',
              ...getStatusStyle(
                request.status
              ),
            }}
          >
            {statusLabels[
              request.status
            ] ||
              request.status}
          </span>
        </div>
      </section>

      {/* THÔNG TIN TUYỂN DỤNG */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '26px 28px',
          marginBottom: '22px',
        }}
      >
        <h2
          style={{
            margin: '0 0 20px',
            fontSize: '22px',
            color: '#0f172a',
          }}
        >
          Thông tin tuyển dụng
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
          }}
        >
          {detailItem(
            'Phòng ban',
            request.department_name
          )}

          {detailItem(
            'Chức danh',
            request.position_name
          )}

          {detailItem(
            'Số lượng tuyển',
            request.headcount
          )}

          {detailItem(
            'Ngày cần người',
            formatDate(neededDate)
          )}

          {detailItem(
            'Lương tối thiểu/tháng',
            money(minSalary)
          )}

          {detailItem(
            'Lương tối đa/tháng',
            money(maxSalary)
          )}

          {detailItem(
            'Chi phí yêu cầu/năm',
            money(cost)
          )}

          {detailItem(
            'Năm chỉ tiêu',
            year || '—'
          )}
        </div>

        <div
          style={{
            marginTop: '22px',
            borderTop:
              '1px solid #e2e8f0',
            paddingTop: '20px',
          }}
        >
          <h3
            style={{
              margin: '0 0 7px',
              fontSize: '16px',
              color: '#334155',
            }}
          >
            Lý do tuyển
          </h3>

          <p
            style={{
              margin: 0,
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            {request.reason || '—'}
          </p>
        </div>

        <div
          style={{
            marginTop: '20px',
          }}
        >
          <h3
            style={{
              margin: '0 0 7px',
              fontSize: '16px',
              color: '#334155',
            }}
          >
            Mô tả công việc
          </h3>

          <p
            style={{
              margin: 0,
              color: '#475569',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {request.job_description ||
              '—'}
          </p>
        </div>

        <div
          style={{
            marginTop: '20px',
          }}
        >
          <h3
            style={{
              margin: '0 0 7px',
              fontSize: '16px',
              color: '#334155',
            }}
          >
            Yêu cầu ứng viên
          </h3>

          <p
            style={{
              margin: 0,
              color: '#475569',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {request.requirements ||
              request.candidate_requirements ||
              '—'}
          </p>
        </div>
      </section>

      {/* YÊU CẦU BỊ TỪ CHỐI */}
      {request.status ===
        'REJECTED' && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '12px',
            padding: '16px 18px',
            marginBottom: '22px',
          }}
        >
          <strong>
            Lý do từ chối:
          </strong>{' '}
          {request.rejection_reason ||
            '—'}
        </div>
      )}

      {/* KIỂM TRA CHỈ TIÊU */}
      <section
        style={{
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            marginBottom: '12px',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: '22px',
            }}
          >
            Kiểm tra chỉ tiêu
          </h2>

          <p
            style={{
              margin: '5px 0 0',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            Hệ thống đối chiếu số lượng tuyển và
            ngân sách với chỉ tiêu của phòng ban.
          </p>
        </div>

        <BudgetSummary
          loading={budget.loading}
          error={budget.error || ''}
          data={budget.data}
          cost={cost}
          excess={excess}
          status={request.status}
          creating={false}
        />
      </section>

      {/* KHÔNG ĐỦ DỮ LIỆU ĐỂ DUYỆT */}
      {isPending &&
        canApprove &&
        (!budget.data || !excess) && (
          <div
            style={{
              background: '#fff7ed',
              color: '#9a3412',
              border:
                '1px solid #fed7aa',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '22px',
            }}
          >
            Chưa tải được đầy đủ chỉ tiêu hoặc
            dữ liệu chi phí để phê duyệt. Bạn
            vẫn có thể từ chối yêu cầu nếu có
            quyền.
          </div>
        )}

      {/* KHU VỰC QUYẾT ĐỊNH */}
      {isPending &&
        (canApprove || canReject) && (
          <section
            style={{
              background: '#ffffff',
              border:
                '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '24px 28px',
              marginBottom: '22px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                gap: '20px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                    fontSize: '20px',
                  }}
                >
                  Quyết định yêu cầu
                </h2>

                <p
                  style={{
                    margin:
                      '6px 0 0',
                    color: '#64748b',
                  }}
                >
                  Kiểm tra thông tin và chỉ tiêu
                  trước khi đưa ra quyết định.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                }}
              >
                {canReject && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setDialog(
                        'reject'
                      );
                      setDecisionError(
                        ''
                      );
                    }}
                    style={{
                      border:
                        '1px solid #fecaca',
                      borderRadius:
                        '10px',
                      padding:
                        '10px 19px',
                      background:
                        '#fef2f2',
                      color:
                        '#dc2626',
                      fontWeight: 700,
                      cursor:
                        busy
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    Từ chối
                  </button>
                )}

                {canApprove && (
                  <button
                    type="button"
                    disabled={
                      busy ||
                      budget.loading ||
                      !budget.data ||
                      !excess
                    }
                    onClick={() => {
                      setDecisionError(
                        ''
                      );

                      setDialog(
                        excess?.exceeded
                          ? 'override'
                          : 'approve'
                      );
                    }}
                    style={{
                      border: 'none',
                      borderRadius:
                        '10px',
                      padding:
                        '10px 21px',
                      background:
                        '#4f46e5',
                      color:
                        '#ffffff',
                      fontWeight: 700,
                      cursor:
                        busy ||
                        budget.loading ||
                        !budget.data ||
                        !excess
                          ? 'not-allowed'
                          : 'pointer',
                      opacity:
                        busy ||
                        budget.loading ||
                        !budget.data ||
                        !excess
                          ? 0.55
                          : 1,
                    }}
                  >
                    {excess?.exceeded
                      ? 'Duyệt vượt chỉ tiêu'
                      : 'Duyệt yêu cầu'}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

      {/* HỘP THOẠI DUYỆT / TỪ CHỐI */}
      {dialog && (
        <ApprovalDialog
          mode={dialog}
          busy={busy}
          error={decisionError}
          canOverride={canOverride}
          excess={excess}
          onCancel={() =>
            setDialog(null)
          }
          onConfirm={decide}
        />
      )}
    </div>
  );
};

export default RecruitmentRequestDetail;