import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import requestApi from '../../api/recruitmentRequestApi';

const RecruitmentRequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await requestApi.getMy();

      const data = response?.data?.data ?? [];

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
      console.error('Lỗi tải yêu cầu tuyển dụng:', err);

      setError(
        err?.response?.data?.message ||
          'Không thể tải danh sách yêu cầu tuyển dụng.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getRequestId = (request) => {
    return (
      request.requisition_id ??
      request.request_id ??
      request.id
    );
  };

  const getRequestCode = (request) => {
    return (
      request.requisition_code ||
      request.request_code ||
      `#${getRequestId(request) ?? ''}`
    );
  };

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

      case 'CLOSED':
        return {
          background: '#f8fafc',
          color: '#64748b',
          border: '1px solid #e2e8f0',
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

    return date.toLocaleDateString('vi-VN');
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

  const summary = useMemo(() => {
    return requests.reduce(
      (result, request) => {
        result.total += 1;

        switch (request.status) {
          case 'DRAFT':
            result.draft += 1;
            break;

          case 'PENDING':
            result.pending += 1;
            break;

          case 'APPROVED':
            result.approved += 1;
            break;

          case 'REJECTED':
            result.rejected += 1;
            break;

          default:
            break;
        }

        return result;
      },
      {
        total: 0,
        draft: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return requests.filter((request) => {
      if (
        statusFilter !== 'ALL' &&
        request.status !== statusFilter
      ) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchable = [
        getRequestCode(request),
        request.department_name,
        request.position_name,
        request.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [requests, statusFilter, search]);

  const summaryCard = (
    label,
    value,
    background,
    color
  ) => (
    <div
      style={{
        background,
        borderRadius: '14px',
        padding: '18px 20px',
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          color: '#64748b',
          fontSize: '13px',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: '25px',
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
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '26px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          marginBottom: '22px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '30px',
              color: '#0f172a',
              fontWeight: 800,
            }}
          >
            Yêu cầu tuyển dụng
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              color: '#64748b',
              fontSize: '16px',
            }}
          >
            Theo dõi quá trình tạo, gửi và phê duyệt yêu cầu
            tuyển dụng
          </p>
        </div>

        <Link
          to="/recruitment-requests/create"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#4f46e5',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: '20px' }}>+</span>
          Tạo yêu cầu mới
        </Link>
      </div>

      {/* THỐNG KÊ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        {summaryCard(
          'Tổng yêu cầu',
          summary.total,
          '#ffffff',
          '#0f172a'
        )}

        {summaryCard(
          'Lưu nháp',
          summary.draft,
          '#f8fafc',
          '#475569'
        )}

        {summaryCard(
          'Chờ duyệt',
          summary.pending,
          '#fffbeb',
          '#d97706'
        )}

        {summaryCard(
          'Đã duyệt',
          summary.approved,
          '#f0fdf4',
          '#15803d'
        )}

        {summaryCard(
          'Đã từ chối',
          summary.rejected,
          '#fef2f2',
          '#dc2626'
        )}
      </div>

      {/* LỖI */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={fetchRequests}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#2563eb',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* DANH SÁCH */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '24px',
        }}
      >
        {/* BỘ LỌC */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '21px',
                color: '#0f172a',
              }}
            >
              Danh sách yêu cầu
            </h2>

            <p
              style={{
                margin: '5px 0 0',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              Hiển thị {filteredRequests.length} yêu cầu
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
              placeholder="Tìm phòng ban, chức danh..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              style={{
                width: '250px',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '14px',
              }}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              style={{
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                background: '#ffffff',
                fontSize: '14px',
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Lưu nháp</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>

            <button
              type="button"
              onClick={fetchRequests}
              style={{
                padding: '10px 15px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
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
            Đang tải danh sách yêu cầu...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div
            style={{
              padding: '50px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div
              style={{
                fontSize: '40px',
                marginBottom: '10px',
              }}
            >
              📄
            </div>

            <div
              style={{
                fontWeight: 600,
                color: '#334155',
                marginBottom: '5px',
              }}
            >
              Không tìm thấy yêu cầu
            </div>

            <div style={{ fontSize: '14px' }}>
              Hãy thay đổi bộ lọc hoặc tạo yêu cầu tuyển
              dụng mới.
            </div>
          </div>
        ) : (
          <div
            style={{
              overflowX: 'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '950px',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    textAlign: 'left',
                    color: '#475569',
                  }}
                >
                  <th style={{ padding: '14px' }}>
                    Mã yêu cầu
                  </th>

                  <th style={{ padding: '14px' }}>
                    Phòng ban
                  </th>

                  <th style={{ padding: '14px' }}>
                    Chức danh
                  </th>

                  <th style={{ padding: '14px' }}>
                    Số lượng
                  </th>

                  <th style={{ padding: '14px' }}>
                    Chi phí dự kiến
                  </th>

                  <th style={{ padding: '14px' }}>
                    Ngày tạo
                  </th>

                  <th style={{ padding: '14px' }}>
                    Trạng thái
                  </th>

                  <th style={{ padding: '14px' }}>
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map(
                  (request, index) => {
                    const requestId =
                      getRequestId(request);

                    return (
                      <tr
                        key={
                          requestId ??
                          request.requisition_code ??
                          index
                        }
                        style={{
                          borderTop:
                            '1px solid #e2e8f0',
                        }}
                      >
                        <td
                          style={{
                            padding: '16px 14px',
                            fontWeight: 700,
                            color: '#0f172a',
                          }}
                        >
                          {getRequestCode(request)}
                        </td>

                        <td
                          style={{
                            padding: '16px 14px',
                          }}
                        >
                          {request.department_name ||
                            '—'}
                        </td>

                        <td
                          style={{
                            padding: '16px 14px',
                            maxWidth: '220px',
                            lineHeight: 1.4,
                          }}
                        >
                          {request.position_name || '—'}
                        </td>

                        <td
                          style={{
                            padding: '16px 14px',
                            fontWeight: 600,
                          }}
                        >
                          {request.headcount ?? '—'}
                        </td>

                        <td
                          style={{
                            padding: '16px 14px',
                          }}
                        >
                          {formatMoney(
                            request.estimated_salary_cost
                          )}
                        </td>

                        <td
                          style={{
                            padding: '16px 14px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(
                            request.created_at
                          )}
                        </td>

                        <td
                          style={{
                            padding: '16px 14px',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '7px 11px',
                              borderRadius: '999px',
                              fontWeight: 700,
                              fontSize: '13px',
                              whiteSpace: 'nowrap',
                              ...getStatusStyle(
                                request.status
                              ),
                            }}
                          >
                            {getStatusLabel(
                              request.status
                            )}
                          </span>
                        </td>

                        <td
                          style={{
                            padding: '16px 14px',
                          }}
                        >
                          {requestId !== undefined &&
                          requestId !== null ? (
                            <Link
                              to={`/recruitment-requests/${requestId}`}
                              style={{
                                display:
                                  'inline-block',
                                textDecoration: 'none',
                                color: '#2563eb',
                                background: '#eff6ff',
                                padding: '8px 13px',
                                borderRadius: '9px',
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Xem chi tiết
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
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruitmentRequestList;