import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const RecruitmentRequestApprovalList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axiosClient.get(
        '/recruitment-requests/approvals'
      );

      const data =
        response?.data?.data ??
        response?.data ??
        [];

      if (Array.isArray(data)) {
        setRequests(data);
      } else if (Array.isArray(data.requests)) {
        setRequests(data.requests);
      } else if (Array.isArray(data.items)) {
        setRequests(data.items);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error(
        'Lỗi tải danh sách duyệt:',
        err
      );

      setError(
        err?.response?.data?.message ||
          'Không thể tải danh sách yêu cầu tuyển dụng.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const getRequestId = (request) =>
    request.requisition_id ??
    request.request_id ??
    request.id;

  const getRequestCode = (request) =>
    request.requisition_code ||
    request.request_code ||
    `#${getRequestId(request) ?? ''}`;

  const getStatusLabel = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'Lưu nháp';

      case 'PENDING':
        return 'Chờ duyệt';

      case 'APPROVED':
        return 'Đã duyệt';

      case 'REJECTED':
        return 'Đã từ chối';

      case 'CLOSED':
        return 'Đã đóng';

      default:
        return status || 'Không xác định';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
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

      case 'DRAFT':
        return {
          background: '#f1f5f9',
          color: '#475569',
          border: '1px solid #cbd5e1',
        };

      default:
        return {
          background: '#f8fafc',
          color: '#475569',
          border: '1px solid #e2e8f0',
        };
    }
  };

  const formatMoney = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return '—';
    }

    return `${number.toLocaleString('vi-VN')} đ`;
  };

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }

    return date.toLocaleDateString('vi-VN');
  };

  const getBudgetState = (request) => {
    const exceededHeadcount = Number(
      request.exceeded_headcount ?? 0
    );

    const exceededSalary = Number(
      request.exceeded_salary_budget ?? 0
    );

    const explicitlyExceeded =
      request.budget_exceeded === true ||
      request.is_exceeded === true;

    if (
      request.is_override ||
      request.override_reason
    ) {
      return {
        label: 'Đã duyệt vượt chỉ tiêu',
        detail: 'Yêu cầu được phê duyệt ghi đè',
        background: '#fff7ed',
        color: '#c2410c',
        border: '1px solid #fed7aa',
      };
    }

    if (
      explicitlyExceeded ||
      exceededHeadcount > 0 ||
      exceededSalary > 0
    ) {
      return {
        label: 'Vượt chỉ tiêu',
        detail:
          exceededHeadcount > 0
            ? `Vượt ${exceededHeadcount} nhân sự`
            : 'Vượt ngân sách',
        background: '#fef2f2',
        color: '#dc2626',
        border: '1px solid #fecaca',
      };
    }

    if (request.status === 'PENDING') {
      return {
        label: 'Cần kiểm tra',
        detail: 'Mở yêu cầu để kiểm tra chỉ tiêu',
        background: '#eff6ff',
        color: '#2563eb',
        border: '1px solid #bfdbfe',
      };
    }

    if (request.status === 'APPROVED') {
      return {
        label: 'Đã xử lý',
        detail: 'Yêu cầu đã được phê duyệt',
        background: '#f0fdf4',
        color: '#15803d',
        border: '1px solid #bbf7d0',
      };
    }

    if (request.status === 'REJECTED') {
      return {
        label: 'Đã xử lý',
        detail: 'Yêu cầu đã bị từ chối',
        background: '#f8fafc',
        color: '#64748b',
        border: '1px solid #e2e8f0',
      };
    }

    return {
      label: 'Chưa kiểm tra',
      detail: 'Chưa có kết quả kiểm tra',
      background: '#f8fafc',
      color: '#64748b',
      border: '1px solid #e2e8f0',
    };
  };

  const summary = useMemo(() => {
    return requests.reduce(
      (result, request) => {
        result.total += 1;

        if (request.status === 'PENDING') {
          result.pending += 1;
        }

        if (request.status === 'APPROVED') {
          result.approved += 1;
        }

        if (request.status === 'REJECTED') {
          result.rejected += 1;
        }

        return result;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    return [...requests]
      .filter((request) => {
        if (
          statusFilter !== 'ALL' &&
          request.status !== statusFilter
        ) {
          return false;
        }

        if (!keyword) return true;

        const content = [
          getRequestCode(request),
          request.department_name,
          request.position_name,
          request.created_by_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return content.includes(keyword);
      })
      .sort((a, b) => {
        if (
          a.status === 'PENDING' &&
          b.status !== 'PENDING'
        ) {
          return -1;
        }

        if (
          a.status !== 'PENDING' &&
          b.status === 'PENDING'
        ) {
          return 1;
        }

        return (
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
        );
      });
  }, [requests, search, statusFilter]);

  const StatCard = ({
    title,
    value,
    color,
    background,
  }) => (
    <div
      style={{
        padding: '18px 20px',
        borderRadius: '14px',
        background,
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          color: '#64748b',
          fontSize: '13px',
          marginBottom: '7px',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '26px',
          fontWeight: 800,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div
      style={{
        padding: '28px',
        background: '#f8fafc',
        minHeight: '100%',
      }}
    >
      {/* TIÊU ĐỀ */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '26px 28px',
          border: '1px solid #e2e8f0',
          marginBottom: '22px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '30px',
            color: '#0f172a',
          }}
        >
          Duyệt yêu cầu tuyển dụng
        </h1>

        <p
          style={{
            margin: '7px 0 0',
            color: '#64748b',
            fontSize: '16px',
          }}
        >
          Kiểm tra thông tin, chỉ tiêu và xử lý các
          yêu cầu tuyển dụng
        </p>
      </div>

      {/* THỐNG KÊ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <StatCard
          title="Tổng yêu cầu"
          value={summary.total}
          color="#0f172a"
          background="#ffffff"
        />

        <StatCard
          title="Chờ duyệt"
          value={summary.pending}
          color="#d97706"
          background="#fffbeb"
        />

        <StatCard
          title="Đã duyệt"
          value={summary.approved}
          color="#15803d"
          background="#f0fdf4"
        />

        <StatCard
          title="Đã từ chối"
          value={summary.rejected}
          color="#dc2626"
          background="#fef2f2"
        />
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {/* DANH SÁCH */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '24px',
        }}
      >
        {/* LỌC */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '22px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: '21px',
              }}
            >
              Danh sách cần xử lý
            </h2>

            <p
              style={{
                margin: '5px 0 0',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              Yêu cầu chờ duyệt được ưu tiên hiển thị
              trước
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Tìm phòng ban, chức danh..."
              style={{
                width: '240px',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
              }}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={{
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                background: '#ffffff',
              }}
            >
              <option value="ALL">
                Tất cả trạng thái
              </option>

              <option value="PENDING">
                Chờ duyệt
              </option>

              <option value="APPROVED">
                Đã duyệt
              </option>

              <option value="REJECTED">
                Đã từ chối
              </option>
            </select>

            <button
              type="button"
              onClick={loadRequests}
              style={{
                padding: '10px 15px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ↻ Tải lại
            </button>
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: '50px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            Đang tải yêu cầu...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div
            style={{
              padding: '50px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '42px',
                marginBottom: '10px',
              }}
            >
              ✅
            </div>

            <strong
              style={{
                color: '#334155',
              }}
            >
              Không có yêu cầu phù hợp
            </strong>

            <p
              style={{
                color: '#64748b',
                marginBottom: 0,
              }}
            >
              Hiện không có yêu cầu cần xử lý với bộ
              lọc này.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(390px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredRequests.map(
              (request, index) => {
                const id =
                  getRequestId(request);

                const budgetState =
                  getBudgetState(request);

                const pending =
                  request.status === 'PENDING';

                return (
                  <article
                    key={
                      id ??
                      request.requisition_code ??
                      index
                    }
                    style={{
                      border: pending
                        ? '1px solid #fbbf24'
                        : '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '20px',
                      background: pending
                        ? '#fffdf5'
                        : '#ffffff',
                    }}
                  >
                    {/* ĐẦU THẺ */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        gap: '12px',
                        marginBottom: '18px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: '#64748b',
                            fontSize: '13px',
                            marginBottom: '5px',
                          }}
                        >
                          {getRequestCode(
                            request
                          )}
                        </div>

                        <h3
                          style={{
                            margin: 0,
                            color: '#0f172a',
                            fontSize: '19px',
                            lineHeight: 1.35,
                          }}
                        >
                          {request.position_name ||
                            'Chưa xác định chức danh'}
                        </h3>
                      </div>

                      <span
                        style={{
                          height: 'fit-content',
                          display:
                            'inline-block',
                          padding:
                            '7px 11px',
                          borderRadius:
                            '999px',
                          fontSize:
                            '13px',
                          fontWeight: 700,
                          whiteSpace:
                            'nowrap',
                          ...getStatusStyle(
                            request.status
                          ),
                        }}
                      >
                        {getStatusLabel(
                          request.status
                        )}
                      </span>
                    </div>

                    {/* THÔNG TIN */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(2, minmax(0, 1fr))',
                        gap: '12px',
                        marginBottom: '16px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                          }}
                        >
                          Phòng ban
                        </div>

                        <strong>
                          {request.department_name ||
                            '—'}
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                          }}
                        >
                          Số lượng tuyển
                        </div>

                        <strong>
                          {request.headcount ??
                            '—'}
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                          }}
                        >
                          Chi phí dự kiến
                        </div>

                        <strong>
                          {formatMoney(
                            request.estimated_salary_cost
                          )}
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            color: '#94a3b8',
                            fontSize: '12px',
                          }}
                        >
                          Ngày tạo
                        </div>

                        <strong>
                          {formatDate(
                            request.created_at
                          )}
                        </strong>
                      </div>
                    </div>

                    {/* CHỈ TIÊU */}
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '11px',
                        marginBottom: '17px',
                        background:
                          budgetState.background,
                        color:
                          budgetState.color,
                        border:
                          budgetState.border,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: '3px',
                        }}
                      >
                        {budgetState.label}
                      </div>

                      <div
                        style={{
                          fontSize: '13px',
                        }}
                      >
                        {budgetState.detail}
                      </div>
                    </div>

                    {/* NÚT */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'flex-end',
                      }}
                    >
                      {id !== undefined &&
                      id !== null ? (
                        <Link
                          to={`/recruitment-requests/${id}`}
                          style={{
                            textDecoration: 'none',
                            borderRadius: '9px',
                            padding: '9px 15px',
                            fontWeight: 700,
                            background: pending
                              ? '#4f46e5'
                              : '#eff6ff',
                            color: pending
                              ? '#ffffff'
                              : '#2563eb',
                          }}
                        >
                          {pending
                            ? 'Xem và duyệt'
                            : 'Xem chi tiết'}
                        </Link>
                      ) : (
                        <span
                          style={{
                            color: '#94a3b8',
                          }}
                        >
                          Không có mã
                        </span>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default RecruitmentRequestApprovalList;