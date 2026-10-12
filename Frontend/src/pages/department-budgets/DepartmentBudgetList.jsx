import React, { useContext, useEffect, useMemo, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { AuthContext } from '../../context/AuthContext';

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatMoney = (value) => {
  return `${toNumber(value).toLocaleString('vi-VN')} đ`;
};

const formatCompactMoney = (value) => {
  const number = toNumber(value);
  const absolute = Math.abs(number);

  if (absolute >= 1_000_000_000) {
    return `${(number / 1_000_000_000)
      .toLocaleString('vi-VN', {
        maximumFractionDigits: 2,
      })} tỷ`;
  }

  if (absolute >= 1_000_000) {
    return `${(number / 1_000_000)
      .toLocaleString('vi-VN', {
        maximumFractionDigits: 1,
      })} triệu`;
  }

  return number.toLocaleString('vi-VN');
};

const flattenDepartments = (items = []) => {
  const result = [];

  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;

    nodes.forEach((item) => {
      result.push(item);

      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children);
      }
    });
  };

  walk(items);
  return result;
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;

  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.budgets)) return value.budgets;
  if (Array.isArray(value.departments)) return value.departments;

  return Object.values(value).filter(
    (item) => item && typeof item === 'object'
  );
};

const SummaryCard = ({
  title,
  value,
  subtitle,
  danger = false,
}) => (
  <div
    style={{
      background: '#ffffff',
      border: danger
        ? '1px solid #fecaca'
        : '1px solid #e2e8f0',
      borderRadius: '14px',
      padding: '20px',
      minWidth: 0,
    }}
  >
    <div
      style={{
        color: '#64748b',
        fontSize: '14px',
        marginBottom: '8px',
      }}
    >
      {title}
    </div>

    <div
      style={{
        color: danger ? '#dc2626' : '#0f172a',
        fontSize: '24px',
        fontWeight: 800,
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>

    {subtitle && (
      <div
        style={{
          marginTop: '7px',
          color: danger ? '#b91c1c' : '#94a3b8',
          fontSize: '13px',
        }}
      >
        {subtitle}
      </div>
    )}
  </div>
);

const DepartmentBudgetList = () => {
  const { hasPermission } = useContext(AuthContext);

  const [year, setYear] = useState(new Date().getFullYear());

  const [departments, setDepartments] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [totalHeadcount, setTotalHeadcount] = useState('');
  const [totalSalaryBudget, setTotalSalaryBudget] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canManage = hasPermission('DEPARTMENT_BUDGET_MANAGE');

  const departmentList = useMemo(
    () => flattenDepartments(departments),
    [departments]
  );

  const departmentMap = useMemo(() => {
    const map = new Map();

    departmentList.forEach((department) => {
      map.set(
        Number(department.department_id),
        department.department_name
      );
    });

    return map;
  }, [departmentList]);

  const summary = useMemo(() => {
    return budgets.reduce(
      (result, budget) => {
        result.totalHeadcount += toNumber(
          budget.total_headcount
        );

        result.usedHeadcount += toNumber(
          budget.used_headcount
        );

        result.totalSalary += toNumber(
          budget.total_salary_budget
        );

        result.usedSalary += toNumber(
          budget.used_salary_budget
        );

        if (
          toNumber(budget.remaining_headcount) < 0 ||
          toNumber(budget.remaining_salary_budget) < 0
        ) {
          result.exceededDepartments += 1;
        }

        return result;
      },
      {
        totalHeadcount: 0,
        usedHeadcount: 0,
        totalSalary: 0,
        usedSalary: 0,
        exceededDepartments: 0,
      }
    );
  }, [budgets]);

  const remainingHeadcount =
    summary.totalHeadcount - summary.usedHeadcount;

  const remainingSalary =
    summary.totalSalary - summary.usedSalary;

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [departmentResponse, budgetResponse] =
        await Promise.all([
          axiosClient.get('/departments'),
          axiosClient.get(
            `/department-budgets?year=${year}`
          ),
        ]);

      const departmentData =
        departmentResponse?.data?.data ??
        departmentResponse?.data ??
        [];

      const budgetData =
        budgetResponse?.data?.data ??
        budgetResponse?.data ??
        [];

      setDepartments(normalizeArray(departmentData));
      setBudgets(normalizeArray(budgetData));
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          'Không thể tải dữ liệu chỉ tiêu tuyển dụng.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year]);

  const openCreateModal = () => {
    setError('');
    setSuccess('');

    setDepartmentId('');
    setTotalHeadcount('');
    setTotalSalaryBudget('');

    setShowModal(true);
  };

  const openEditModal = (budget) => {
    setError('');
    setSuccess('');

    setDepartmentId(String(budget.department_id));
    setTotalHeadcount(
      String(budget.total_headcount ?? '')
    );
    setTotalSalaryBudget(
      String(budget.total_salary_budget ?? '')
    );

    setShowModal(true);
  };

  const handleDepartmentChange = (event) => {
    const value = event.target.value;

    setDepartmentId(value);

    const existing = budgets.find(
      (budget) =>
        Number(budget.department_id) === Number(value)
    );

    if (existing) {
      setTotalHeadcount(
        String(existing.total_headcount ?? '')
      );

      setTotalSalaryBudget(
        String(existing.total_salary_budget ?? '')
      );
    } else {
      setTotalHeadcount('');
      setTotalSalaryBudget('');
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!departmentId) {
      setError('Vui lòng chọn phòng ban.');
      return;
    }

    const headcount = Number(totalHeadcount);
    const salaryBudget = Number(totalSalaryBudget);

    if (!Number.isInteger(headcount) || headcount < 0) {
      setError(
        'Tổng chỉ tiêu nhân sự phải là số nguyên không âm.'
      );
      return;
    }

    if (
      Number.isNaN(salaryBudget) ||
      salaryBudget < 0
    ) {
      setError(
        'Tổng ngân sách lương phải là số không âm.'
      );
      return;
    }

    try {
      setLoading(true);

      await axiosClient.put(
        `/department-budgets/${departmentId}/${year}`,
        {
          total_headcount: headcount,
          total_salary_budget: salaryBudget,
        }
      );

      setShowModal(false);
      setSuccess('Đã lưu chỉ tiêu tuyển dụng.');

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err?.response?.data?.message ||
          'Không thể lưu chỉ tiêu tuyển dụng.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: '30px',
              fontWeight: 800,
            }}
          >
            Chỉ tiêu tuyển dụng
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              color: '#64748b',
              fontSize: '16px',
            }}
          >
            Theo dõi chỉ tiêu nhân sự và ngân sách tuyển
            dụng theo từng phòng ban
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '7px',
                color: '#334155',
              }}
            >
              Năm
            </label>

            <input
              type="number"
              value={year}
              min="2000"
              max="2100"
              onChange={(event) =>
                setYear(Number(event.target.value))
              }
              style={{
                width: '110px',
                padding: '10px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              height: '43px',
              padding: '0 18px',
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

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              style={{
                height: '43px',
                padding: '0 20px',
                border: 'none',
                borderRadius: '10px',
                background: '#4f46e5',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Thiết lập chỉ tiêu
            </button>
          )}
        </div>
      </div>

      {/* THÔNG BÁO */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          {success}
        </div>
      )}

      {/* TỔNG QUAN */}
      <div
        style={{
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              color: '#0f172a',
            }}
          >
            Tổng quan năm {year}
          </h2>

          {summary.exceededDepartments > 0 && (
            <span
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '999px',
                padding: '7px 12px',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              ⚠ {summary.exceededDepartments} phòng ban vượt
              chỉ tiêu
            </span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '14px',
          }}
        >
          <SummaryCard
            title="Tổng chỉ tiêu nhân sự"
            value={summary.totalHeadcount}
          />

          <SummaryCard
            title="Nhân sự đã sử dụng"
            value={summary.usedHeadcount}
          />

          <SummaryCard
            title="Chỉ tiêu nhân sự còn lại"
            value={remainingHeadcount}
            danger={remainingHeadcount < 0}
            subtitle={
              remainingHeadcount < 0
                ? `Vượt ${Math.abs(
                    remainingHeadcount
                  )} nhân sự`
                : 'Có thể tiếp tục tuyển'
            }
          />

          <SummaryCard
            title="Tổng ngân sách"
            value={formatCompactMoney(
              summary.totalSalary
            )}
            subtitle={formatMoney(summary.totalSalary)}
          />

          <SummaryCard
            title="Ngân sách đã sử dụng"
            value={formatCompactMoney(
              summary.usedSalary
            )}
            subtitle={formatMoney(summary.usedSalary)}
          />

          <SummaryCard
            title="Ngân sách còn lại"
            value={formatCompactMoney(remainingSalary)}
            danger={remainingSalary < 0}
            subtitle={
              remainingSalary < 0
                ? `Vượt ${formatMoney(
                    Math.abs(remainingSalary)
                  )}`
                : formatMoney(remainingSalary)
            }
          />
        </div>
      </div>

      {/* DANH SÁCH PHÒNG BAN */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '24px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            marginBottom: '18px',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: '21px',
            }}
          >
            Chi tiết theo phòng ban
          </h2>

          <p
            style={{
              margin: '5px 0 0',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            Chỉ các yêu cầu đã duyệt mới được tính vào
            phần đã sử dụng.
          </p>
        </div>

        {loading && budgets.length === 0 ? (
          <div
            style={{
              padding: '30px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            Đang tải dữ liệu...
          </div>
        ) : budgets.length === 0 ? (
          <div
            style={{
              padding: '34px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            Chưa thiết lập chỉ tiêu tuyển dụng cho năm{' '}
            {year}.
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
                borderCollapse: 'collapse',
                minWidth: '900px',
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
                    Phòng ban
                  </th>

                  <th style={{ padding: '14px' }}>
                    Chỉ tiêu
                  </th>

                  <th style={{ padding: '14px' }}>
                    Đã sử dụng
                  </th>

                  <th style={{ padding: '14px' }}>
                    Còn lại
                  </th>

                  <th style={{ padding: '14px' }}>
                    Ngân sách
                  </th>

                  <th style={{ padding: '14px' }}>
                    Ngân sách còn lại
                  </th>

                  <th style={{ padding: '14px' }}>
                    Trạng thái
                  </th>

                  {canManage && (
                    <th style={{ padding: '14px' }}>
                      Thao tác
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {budgets.map((budget) => {
                  const remainingHC = toNumber(
                    budget.remaining_headcount
                  );

                  const remainingBudget = toNumber(
                    budget.remaining_salary_budget
                  );

                  const exceeded =
                    remainingHC < 0 ||
                    remainingBudget < 0;

                  return (
                    <tr
                      key={`${budget.department_id}-${budget.budget_year}`}
                      style={{
                        borderTop: '1px solid #e2e8f0',
                      }}
                    >
                      <td
                        style={{
                          padding: '17px 14px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {budget.department_name ||
                          departmentMap.get(
                            Number(
                              budget.department_id
                            )
                          ) ||
                          `Phòng ban #${budget.department_id}`}
                      </td>

                      <td
                        style={{
                          padding: '17px 14px',
                        }}
                      >
                        {budget.total_headcount}
                      </td>

                      <td
                        style={{
                          padding: '17px 14px',
                        }}
                      >
                        {budget.used_headcount}
                      </td>

                      <td
                        style={{
                          padding: '17px 14px',
                          color:
                            remainingHC < 0
                              ? '#dc2626'
                              : '#0f172a',
                          fontWeight:
                            remainingHC < 0 ? 800 : 500,
                        }}
                      >
                        {remainingHC}

                        {remainingHC < 0 && (
                          <div
                            style={{
                              fontSize: '12px',
                              marginTop: '4px',
                            }}
                          >
                            Vượt{' '}
                            {Math.abs(remainingHC)} người
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: '17px 14px',
                        }}
                        title={formatMoney(
                          budget.total_salary_budget
                        )}
                      >
                        {formatCompactMoney(
                          budget.total_salary_budget
                        )}
                      </td>

                      <td
                        style={{
                          padding: '17px 14px',
                          color:
                            remainingBudget < 0
                              ? '#dc2626'
                              : '#0f172a',
                          fontWeight:
                            remainingBudget < 0
                              ? 800
                              : 500,
                        }}
                        title={formatMoney(
                          budget.remaining_salary_budget
                        )}
                      >
                        {formatCompactMoney(
                          remainingBudget
                        )}

                        {remainingBudget < 0 && (
                          <div
                            style={{
                              fontSize: '12px',
                              marginTop: '4px',
                            }}
                          >
                            Vượt{' '}
                            {formatCompactMoney(
                              Math.abs(
                                remainingBudget
                              )
                            )}
                          </div>
                        )}
                      </td>

                      <td
                        style={{
                          padding: '17px 14px',
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
                            background: exceeded
                              ? '#fef2f2'
                              : '#f0fdf4',
                            color: exceeded
                              ? '#dc2626'
                              : '#15803d',
                            border: exceeded
                              ? '1px solid #fecaca'
                              : '1px solid #bbf7d0',
                          }}
                        >
                          {exceeded
                            ? '⚠ Vượt chỉ tiêu'
                            : '✓ Trong chỉ tiêu'}
                        </span>
                      </td>

                      {canManage && (
                        <td
                          style={{
                            padding: '17px 14px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(budget)
                            }
                            style={{
                              border:
                                '1px solid #c7d2fe',
                              background: '#eef2ff',
                              color: '#4338ca',
                              padding: '8px 12px',
                              borderRadius: '9px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Cập nhật
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THIẾT LẬP CHỈ TIÊU */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
        >
          <form
            onSubmit={handleSave}
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: '620px',
              background: '#ffffff',
              borderRadius: '18px',
              padding: '26px',
              boxShadow:
                '0 20px 60px rgba(15,23,42,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '15px',
                marginBottom: '22px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: '#0f172a',
                  }}
                >
                  Thiết lập chỉ tiêu
                </h2>

                <p
                  style={{
                    margin: '5px 0 0',
                    color: '#64748b',
                  }}
                >
                  Năm {year}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginBottom: '18px',
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: '7px',
                  fontWeight: 700,
                  color: '#334155',
                }}
              >
                Phòng ban
              </label>

              <select
                value={departmentId}
                onChange={handleDepartmentChange}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '15px',
                }}
              >
                <option value="">
                  -- Chọn phòng ban --
                </option>

                {departmentList.map(
                  (department) => (
                    <option
                      key={
                        department.department_id
                      }
                      value={
                        department.department_id
                      }
                    >
                      {
                        department.department_name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '7px',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Tổng chỉ tiêu nhân sự
                </label>

                <input
                  type="number"
                  min="0"
                  value={totalHeadcount}
                  onChange={(event) =>
                    setTotalHeadcount(
                      event.target.value
                    )
                  }
                  placeholder="VD: 12"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    border:
                      '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '15px',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '7px',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Ngân sách lương
                </label>

                <input
                  type="number"
                  min="0"
                  value={totalSalaryBudget}
                  onChange={(event) =>
                    setTotalSalaryBudget(
                      event.target.value
                    )
                  }
                  placeholder="VD: 1800000000"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px',
                    border:
                      '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '15px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#64748b',
                fontSize: '13px',
                marginTop: '18px',
              }}
            >
              Chỉ các yêu cầu tuyển dụng đã được
              phê duyệt mới làm giảm chỉ tiêu và
              ngân sách.
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '22px',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                style={{
                  padding: '10px 20px',
                  border:
                    '1px solid #cbd5e1',
                  borderRadius: '10px',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 22px',
                  border: 'none',
                  borderRadius: '10px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Lưu chỉ tiêu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DepartmentBudgetList;