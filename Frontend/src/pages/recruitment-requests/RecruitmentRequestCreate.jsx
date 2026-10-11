import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

import BudgetSummary from '../../components/recruitment/BudgetSummary';
import useDepartmentBudget from '../../hooks/useDepartmentBudget';

import {
  budgetExcess,
  estimateCost,
} from '../../utils/recruitmentBudget';

import {
  FaArrowLeft,
  FaSave,
  FaPaperPlane,
} from 'react-icons/fa';

const RecruitmentRequestCreate = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);

  const [formLoading, setFormLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    department_id: '',
    position_id: '',
    headcount: '',
    reason: 'Thay thế',
    proposed_salary_min: '',
    proposed_salary_max: '',
    needed_by_date: '',
    job_description: '',
    candidate_requirements: '',
    salary_explanation: '',
    work_location_code: '',
    work_type_code: '',
  });

  const flattenDepartments = (items = []) => {
    const result = [];

    const walk = (nodes) => {
      if (!Array.isArray(nodes)) return;

      nodes.forEach((item) => {
        result.push(item);

        if (
          Array.isArray(item.children) &&
          item.children.length > 0
        ) {
          walk(item.children);
        }
      });
    };

    walk(items);
    return result;
  };

  const budgetYear =
    formData.needed_by_date?.slice(0, 4) || '';

  const budget = useDepartmentBudget(
    formData.department_id,
    budgetYear
  );

  const estimatedCost = estimateCost(
    formData.headcount,
    formData.proposed_salary_max
  );

  const excess = useMemo(() => {
    if (!budget.data) {
      return null;
    }

    return budgetExcess(
      budget.data,
      formData.headcount,
      estimatedCost,
      'PENDING'
    );
  }, [
    budget.data,
    formData.headcount,
    estimatedCost,
  ]);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      setFormLoading(true);
      setError('');

      const [
        departmentResponse,
        positionResponse,
        masterDataResponse,
      ] = await Promise.all([
        axiosClient.get('/departments'),
        axiosClient.get('/job-positions'),
        axiosClient.get('/master-data'),
      ]);

      if (departmentResponse.data.success) {
        const departmentData =
          departmentResponse.data.data;

        const list = Array.isArray(departmentData)
          ? departmentData
          : departmentData?.departments || [];

        setDepartments(
          flattenDepartments(list)
        );
      }

      if (positionResponse.data.success) {
        const positionData =
          positionResponse.data.data;

        setPositions(
          Array.isArray(positionData)
            ? positionData
            : positionData?.data || []
        );
      }

      if (masterDataResponse.data.success) {
        const masterData =
          masterDataResponse.data.data;

        const items = Array.isArray(masterData)
          ? masterData
          : masterData?.data ||
            masterData?.items ||
            [];

        setLocations(
          items.filter(
            (item) =>
              item.category_group ===
                'WORK_LOCATION' &&
              item.is_active
          )
        );

        setWorkTypes(
          items.filter(
            (item) =>
              item.category_group ===
                'WORK_TYPE' &&
              item.is_active
          )
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          'Không tải được dữ liệu tạo yêu cầu. Vui lòng tải lại trang.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: null,
      }));
    }

    setError('');
  };

  const selectedPosition = useMemo(() => {
    if (!formData.position_id) {
      return null;
    }

    return positions.find(
      (position) =>
        String(position.position_id) ===
        String(formData.position_id)
    );
  }, [
    positions,
    formData.position_id,
  ]);

  const isSalaryOutsideStandard = () => {
    if (!selectedPosition) {
      return false;
    }

    const proposedMin = Number(
      formData.proposed_salary_min
    );

    const proposedMax = Number(
      formData.proposed_salary_max
    );

    const standardMin = Number(
      selectedPosition.min_salary
    );

    const standardMax = Number(
      selectedPosition.max_salary
    );

    if (
      proposedMin &&
      standardMin &&
      proposedMin < standardMin
    ) {
      return true;
    }

    if (
      proposedMax &&
      standardMax &&
      proposedMax > standardMax
    ) {
      return true;
    }

    if (
      proposedMin &&
      standardMax &&
      proposedMin > standardMax
    ) {
      return true;
    }

    return false;
  };

  const validateForm = (status) => {
    const newErrors = {};

    if (!formData.department_id) {
      newErrors.department_id =
        'Bắt buộc chọn phòng ban';
    }

    if (!formData.position_id) {
      newErrors.position_id =
        'Bắt buộc chọn chức danh';
    }

    if (
      !Number.isInteger(
        Number(formData.headcount)
      ) ||
      Number(formData.headcount) <= 0
    ) {
      newErrors.headcount =
        'Số lượng tuyển phải là số nguyên dương';
    }

    if (
      formData.proposed_salary_min &&
      Number(
        formData.proposed_salary_min
      ) < 0
    ) {
      newErrors.proposed_salary_min =
        'Mức lương không được âm';
    }

    if (
      formData.proposed_salary_max &&
      Number(
        formData.proposed_salary_max
      ) < 0
    ) {
      newErrors.proposed_salary_max =
        'Mức lương không được âm';
    }

    if (
      formData.proposed_salary_min &&
      formData.proposed_salary_max &&
      Number(
        formData.proposed_salary_min
      ) >
        Number(
          formData.proposed_salary_max
        )
    ) {
      newErrors.proposed_salary_max =
        'Mức lương tối đa phải lớn hơn hoặc bằng mức tối thiểu';
    }

    if (formData.needed_by_date) {
      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const neededDate =
        new Date(
          formData.needed_by_date
        );

      if (neededDate < today) {
        newErrors.needed_by_date =
          'Ngày cần người không được nằm trong quá khứ';
      }
    }

    if (status === 'PENDING') {
      if (!formData.reason) {
        newErrors.reason =
          'Bắt buộc chọn lý do tuyển';
      }

      if (!formData.needed_by_date) {
        newErrors.needed_by_date =
          'Bắt buộc chọn ngày cần người';
      }

      if (
        !formData.work_location_code
      ) {
        newErrors.work_location_code =
          'Bắt buộc chọn địa điểm';
      }

      if (!formData.work_type_code) {
        newErrors.work_type_code =
          'Bắt buộc chọn hình thức làm việc';
      }

      if (
        !formData.proposed_salary_max ||
        Number(
          formData.proposed_salary_max
        ) <= 0
      ) {
        newErrors.proposed_salary_max =
          'Bắt buộc nhập mức lương tối đa';
      }

      if (!formData.job_description.trim()) {
        newErrors.job_description =
          'Bắt buộc nhập mô tả công việc';
      }

      if (
        !formData.candidate_requirements.trim()
      ) {
        newErrors.candidate_requirements =
          'Bắt buộc nhập yêu cầu ứng viên';
      }

      if (
        isSalaryOutsideStandard() &&
        !formData.salary_explanation.trim()
      ) {
        newErrors.salary_explanation =
          'Bắt buộc nhập giải trình khi mức lương nằm ngoài khung chuẩn';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (
    status
  ) => {
    if (loading) {
      return;
    }

    const validationErrors =
      validateForm(status);

    if (
      Object.keys(
        validationErrors
      ).length > 0
    ) {
      setErrors(validationErrors);

      setError(
        'Vui lòng kiểm tra lại các thông tin được đánh dấu.'
      );

      return;
    }

    setLoading(true);
    setError('');
    setErrors({});

    try {
      const payload = {
        ...formData,

        department_id: Number(
          formData.department_id
        ),

        position_id: Number(
          formData.position_id
        ),

        headcount: Number(
          formData.headcount
        ),

        proposed_salary_min:
          formData.proposed_salary_min
            ? Number(
                formData.proposed_salary_min
              )
            : null,

        proposed_salary_max:
          formData.proposed_salary_max
            ? Number(
                formData.proposed_salary_max
              )
            : null,

        status,
      };

      await axiosClient.post(
        '/recruitment-requests',
        payload
      );

      navigate(
        '/recruitment-requests'
      );
    } catch (err) {
      console.error(err);

      const result =
        err.response?.data;

      if (
        result?.code ===
        'BUDGET_NOT_FOUND'
      ) {
        setError(
          'Phòng ban chưa được thiết lập chỉ tiêu cho năm đã chọn.'
        );
      } else if (
        result?.code ===
        'BUDGET_EXCEEDED'
      ) {
        setError(
          'Yêu cầu đang vượt chỉ tiêu. Bạn vẫn có thể gửi chờ duyệt nếu chính sách hệ thống cho phép.'
        );
      } else {
        setError(
          result?.message ||
            'Không thể tạo yêu cầu tuyển dụng. Vui lòng thử lại.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '0 đ';
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return '0 đ';
    }

    return `${number.toLocaleString(
      'vi-VN'
    )} đ`;
  };

  const getToday = () => {
    const date = new Date();

    date.setMinutes(
      date.getMinutes() -
        date.getTimezoneOffset()
    );

    return date
      .toISOString()
      .slice(0, 10);
  };

  const fieldStyle = (name) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    borderRadius: '10px',
    border: `1px solid ${
      errors[name]
        ? '#ef4444'
        : '#cbd5e1'
    }`,
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
  });

  const labelStyle = {
    display: 'block',
    color: '#334155',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '7px',
  };

  const FieldError = ({
    name,
  }) => {
    if (!errors[name]) {
      return null;
    }

    return (
      <div
        style={{
          color: '#dc2626',
          fontSize: '12px',
          marginTop: '5px',
        }}
      >
        {errors[name]}
      </div>
    );
  };

  if (formLoading) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#64748b',
        }}
      >
        Đang tải dữ liệu tạo yêu cầu...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '28px',
        background: '#f8fafc',
        minHeight: '100%',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background:
            'linear-gradient(135deg, #4f46e5, #5b4bea)',
          borderRadius: '18px',
          padding: '24px 28px',
          marginBottom: '22px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          boxShadow:
            '0 10px 25px rgba(79,70,229,0.18)',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '30px',
              fontWeight: 800,
            }}
          >
            Tạo yêu cầu tuyển dụng
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              opacity: 0.88,
            }}
          >
            Điền thông tin vị trí và kiểm tra
            chỉ tiêu trước khi gửi phê duyệt
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(-1)
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            border:
              '1px solid rgba(255,255,255,0.45)',
            background:
              'rgba(255,255,255,0.14)',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          <FaArrowLeft />
          Quay lại
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border:
              '1px solid #fecaca',
            color: '#b91c1c',
            padding: '14px 18px',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* BUDGET */}
      <div
        style={{
          marginBottom: '22px',
        }}
      >
        <BudgetSummary
          loading={budget.loading}
          error={budget.error || ''}
          data={budget.data}
          cost={estimatedCost}
          excess={excess}
          status="PENDING"
          creating
        />
      </div>

      {/* FORM */}
      <div
        style={{
          background: '#ffffff',
          border:
            '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '26px',
        }}
      >
        <div
          style={{
            marginBottom: '22px',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#0f172a',
              fontSize: '21px',
            }}
          >
            Thông tin yêu cầu
          </h2>

          <p
            style={{
              margin: '6px 0 0',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            Các trường có dấu * là bắt buộc khi
            gửi yêu cầu phê duyệt.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px',
          }}
        >
          {/* PHÒNG BAN */}
          <div>
            <label
              style={labelStyle}
            >
              Phòng ban{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <select
              name="department_id"
              value={
                formData.department_id
              }
              onChange={handleChange}
              style={fieldStyle(
                'department_id'
              )}
            >
              <option value="">
                -- Chọn phòng ban --
              </option>

              {departments.map(
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

            <FieldError name="department_id" />
          </div>

          {/* CHỨC DANH */}
          <div>
            <label
              style={labelStyle}
            >
              Chức danh{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <select
              name="position_id"
              value={
                formData.position_id
              }
              onChange={handleChange}
              style={fieldStyle(
                'position_id'
              )}
            >
              <option value="">
                -- Chọn chức danh --
              </option>

              {positions.map(
                (position) => (
                  <option
                    key={
                      position.position_id
                    }
                    value={
                      position.position_id
                    }
                  >
                    {
                      position.position_name
                    }
                  </option>
                )
              )}
            </select>

            <FieldError name="position_id" />
          </div>

          {/* SỐ LƯỢNG */}
          <div>
            <label
              style={labelStyle}
            >
              Số lượng tuyển{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <input
              type="number"
              min="1"
              name="headcount"
              placeholder="VD: 2"
              value={
                formData.headcount
              }
              onChange={handleChange}
              style={fieldStyle(
                'headcount'
              )}
            />

            <FieldError name="headcount" />
          </div>

          {/* LÝ DO */}
          <div>
            <label
              style={labelStyle}
            >
              Lý do tuyển{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              style={fieldStyle(
                'reason'
              )}
            >
              <option value="Thay thế">
                Thay thế
              </option>

              <option value="Tăng mới">
                Tăng mới
              </option>
            </select>

            <FieldError name="reason" />
          </div>

          {/* NGÀY CẦN NGƯỜI */}
          <div>
            <label
              style={labelStyle}
            >
              Ngày cần người{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <input
              type="date"
              min={getToday()}
              name="needed_by_date"
              value={
                formData.needed_by_date
              }
              onChange={handleChange}
              style={fieldStyle(
                'needed_by_date'
              )}
            />

            <FieldError name="needed_by_date" />
          </div>

          {/* ĐỊA ĐIỂM */}
          <div>
            <label
              style={labelStyle}
            >
              Địa điểm{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <select
              name="work_location_code"
              value={
                formData.work_location_code
              }
              onChange={handleChange}
              style={fieldStyle(
                'work_location_code'
              )}
            >
              <option value="">
                -- Chọn địa điểm --
              </option>

              {locations.map(
                (location) => (
                  <option
                    key={
                      location.code
                    }
                    value={
                      location.code
                    }
                  >
                    {location.name}
                  </option>
                )
              )}
            </select>

            <FieldError name="work_location_code" />
          </div>

          {/* HÌNH THỨC */}
          <div>
            <label
              style={labelStyle}
            >
              Hình thức làm việc{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <select
              name="work_type_code"
              value={
                formData.work_type_code
              }
              onChange={handleChange}
              style={fieldStyle(
                'work_type_code'
              )}
            >
              <option value="">
                -- Chọn hình thức --
              </option>

              {workTypes.map(
                (type) => (
                  <option
                    key={type.code}
                    value={type.code}
                  >
                    {type.name}
                  </option>
                )
              )}
            </select>

            <FieldError name="work_type_code" />
          </div>

          {/* LƯƠNG */}
          <div>
            <label
              style={labelStyle}
            >
              Mức lương đề xuất (VND/tháng)
            </label>

            {selectedPosition && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#6366f1',
                  marginBottom: '7px',
                }}
              >
                Khung chuẩn:{' '}
                {formatMoney(
                  selectedPosition.min_salary
                )}
                {' - '}
                {formatMoney(
                  selectedPosition.max_salary
                )}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '1fr 20px 1fr',
                gap: '7px',
                alignItems: 'center',
              }}
            >
              <input
                type="number"
                min="0"
                name="proposed_salary_min"
                placeholder="Từ..."
                value={
                  formData.proposed_salary_min
                }
                onChange={handleChange}
                style={fieldStyle(
                  'proposed_salary_min'
                )}
              />

              <span
                style={{
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                –
              </span>

              <input
                type="number"
                min="0"
                name="proposed_salary_max"
                placeholder="Đến..."
                value={
                  formData.proposed_salary_max
                }
                onChange={handleChange}
                style={fieldStyle(
                  'proposed_salary_max'
                )}
              />
            </div>

            <FieldError name="proposed_salary_min" />
            <FieldError name="proposed_salary_max" />
          </div>
        </div>

        {/* GIẢI TRÌNH LƯƠNG */}
        {isSalaryOutsideStandard() && (
          <div
            style={{
              marginTop: '18px',
              padding: '16px',
              background: '#fff7ed',
              border:
                '1px solid #fed7aa',
              borderRadius: '12px',
            }}
          >
            <label
              style={labelStyle}
            >
              Giải trình mức lương ngoài khung chuẩn{' '}
              <span
                style={{
                  color: '#dc2626',
                }}
              >
                *
              </span>
            </label>

            <textarea
              name="salary_explanation"
              rows="3"
              value={
                formData.salary_explanation
              }
              onChange={handleChange}
              placeholder="Nhập lý do đề xuất mức lương nằm ngoài khung chuẩn..."
              style={{
                ...fieldStyle(
                  'salary_explanation'
                ),
                resize: 'vertical',
              }}
            />

            <FieldError name="salary_explanation" />
          </div>
        )}

        {/* MÔ TẢ CÔNG VIỆC */}
        <div
          style={{
            marginTop: '22px',
          }}
        >
          <label
            style={labelStyle}
          >
            Mô tả công việc{' '}
            <span
              style={{
                color: '#dc2626',
              }}
            >
              *
            </span>
          </label>

          <textarea
            name="job_description"
            rows="4"
            value={
              formData.job_description
            }
            onChange={handleChange}
            placeholder="Nhập mô tả chi tiết công việc..."
            style={{
              ...fieldStyle(
                'job_description'
              ),
              resize: 'vertical',
            }}
          />

          <FieldError name="job_description" />
        </div>

        {/* YÊU CẦU ỨNG VIÊN */}
        <div
          style={{
            marginTop: '18px',
          }}
        >
          <label
            style={labelStyle}
          >
            Yêu cầu ứng viên{' '}
            <span
              style={{
                color: '#dc2626',
              }}
            >
              *
            </span>
          </label>

          <textarea
            name="candidate_requirements"
            rows="4"
            value={
              formData.candidate_requirements
            }
            onChange={handleChange}
            placeholder="Kinh nghiệm, kỹ năng, trình độ..."
            style={{
              ...fieldStyle(
                'candidate_requirements'
              ),
              resize: 'vertical',
            }}
          />

          <FieldError name="candidate_requirements" />
        </div>

        {/* FOOTER */}
        <div
          style={{
            marginTop: '26px',
            paddingTop: '20px',
            borderTop:
              '1px solid #e2e8f0',
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              color: '#64748b',
              fontSize: '13px',
            }}
          >
            Yêu cầu chờ duyệt chưa làm giảm chỉ
            tiêu. Chỉ tiêu được kiểm tra lại khi
            phê duyệt.
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
            }}
          >
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                handleSubmit('DRAFT')
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '11px 18px',
                border:
                  '1px solid #cbd5e1',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#334155',
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
                fontWeight: 700,
                opacity: loading
                  ? 0.6
                  : 1,
              }}
            >
              <FaSave />
              Lưu nháp
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                handleSubmit('PENDING')
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '11px 20px',
                border: 'none',
                borderRadius: '10px',
                background: '#4f46e5',
                color: '#ffffff',
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
                fontWeight: 700,
                opacity: loading
                  ? 0.6
                  : 1,
                boxShadow:
                  '0 5px 14px rgba(79,70,229,0.22)',
              }}
            >
              <FaPaperPlane />
              {loading
                ? 'Đang xử lý...'
                : 'Gửi yêu cầu tuyển dụng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruitmentRequestCreate;