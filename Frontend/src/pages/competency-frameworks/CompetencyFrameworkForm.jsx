import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import competencyFrameworkApi from '../../api/competencyFrameworkApi';
import jobPositionApi from '../../api/jobPositionApi';

const CompetencyFrameworkForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    framework_code: '',
    framework_name: '',
    description: ''
  });

  const [criteriaList, setCriteriaList] = useState([]);

  // Danh sách chức danh
  const [jobPositions, setJobPositions] = useState([]);

  // Chức danh được gắn với khung năng lực
  const [selectedPositionId, setSelectedPositionId] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [error, setError] = useState('');

  /**
   * ============================================================
   * LOAD DỮ LIỆU BAN ĐẦU
   * ============================================================
   */
  useEffect(() => {
    fetchJobPositions();

    if (isEditMode) {
      fetchFramework();
    } else {
      setCriteriaList([
        {
          criteria_name: '',
          weight: '',
          description: ''
        }
      ]);
    }
  }, [id]);

  /**
   * ============================================================
   * LẤY DANH SÁCH CHỨC DANH
   * ============================================================
   */
  const fetchJobPositions = async () => {
    setLoadingPositions(true);

    try {
      const res = await jobPositionApi.getAll({
        status: 'ACTIVE',
        page: 1,
        limit: 100
      });

      const responseData = res.data?.data;

      // API có thể trả:
      // { data: [...], meta: {...} }
      // hoặc trực tiếp [...]
      let positions = [];

      if (Array.isArray(responseData)) {
        positions = responseData;
      } else if (Array.isArray(responseData?.data)) {
        positions = responseData.data;
      }

      setJobPositions(positions);

      /**
       * Nếu đang sửa khung năng lực,
       * tìm chức danh hiện đang sử dụng khung này.
       */
      if (isEditMode && id && positions.length > 0) {
        const currentPosition = positions.find(
          (position) =>
            String(position.competency_framework_id) === String(id)
        );

        if (currentPosition) {
          setSelectedPositionId(
            String(currentPosition.position_id)
          );
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách chức danh:', err);

      setError(
        'Không thể tải danh sách chức danh. Vui lòng kiểm tra Backend.'
      );
    } finally {
      setLoadingPositions(false);
    }
  };

  /**
   * ============================================================
   * LẤY THÔNG TIN KHUNG NĂNG LỰC KHI EDIT
   * ============================================================
   */
  const fetchFramework = async () => {
    setLoading(true);

    try {
      const res = await competencyFrameworkApi.getById(id);
      const data = res.data.data;

      setFormData({
        framework_code: data.framework_code,
        framework_name: data.framework_name,
        description: data.description || ''
      });

      if (data.criteria && data.criteria.length > 0) {
        setCriteriaList(
          data.criteria.map((c) => ({
            criteria_name: c.criteria_name,
            weight: c.weight,
            description: c.description || ''
          }))
        );
      } else {
        setCriteriaList([
          {
            criteria_name: '',
            weight: '',
            description: ''
          }
        ]);
      }
    } catch (err) {
      console.error('Lỗi khi tải khung năng lực:', err);

      setError(
        err.response?.data?.message ||
        'Không thể tải thông tin khung năng lực.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * ============================================================
   * THAY ĐỔI THÔNG TIN CHUNG
   * ============================================================
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    setError('');
  };

  /**
   * ============================================================
   * THAY ĐỔI CHỨC DANH
   * ============================================================
   */
  const handlePositionChange = (e) => {
    setSelectedPositionId(e.target.value);
    setError('');
  };

  /**
   * ============================================================
   * THAY ĐỔI TIÊU CHÍ
   * ============================================================
   */
  const handleCriteriaChange = (index, field, value) => {
    const newList = [...criteriaList];

    newList[index][field] = value;

    setCriteriaList(newList);
    setError('');
  };

  /**
   * ============================================================
   * THÊM TIÊU CHÍ
   * ============================================================
   */
  const addCriteria = () => {
    setCriteriaList([
      ...criteriaList,
      {
        criteria_name: '',
        weight: '',
        description: ''
      }
    ]);
  };

  /**
   * ============================================================
   * XÓA TIÊU CHÍ
   * ============================================================
   */
  const removeCriteria = (index) => {
    const newList = [...criteriaList];

    newList.splice(index, 1);

    setCriteriaList(newList);
  };

  /**
   * ============================================================
   * TÍNH TỔNG TRỌNG SỐ
   * ============================================================
   */
  const totalWeight = criteriaList.reduce(
    (sum, item) => sum + (Number(item.weight) || 0),
    0
  );

  const roundedTotal =
    Math.round(totalWeight * 100) / 100;

  const isWeightValid = roundedTotal === 100;

  /**
   * ============================================================
   * SUBMIT FORM
   * ============================================================
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    /**
     * ----------------------------------------------------------
     * 1. KIỂM TRA CHỨC DANH
     * ----------------------------------------------------------
     */
    if (!selectedPositionId) {
      setError('Vui lòng chọn chức danh.');
      return;
    }

    /**
     * ----------------------------------------------------------
     * 2. KIỂM TRA TIÊU CHÍ
     * ----------------------------------------------------------
     */
    if (criteriaList.length === 0) {
      setError('Phải có ít nhất 1 tiêu chí đánh giá.');
      return;
    }

    for (let i = 0; i < criteriaList.length; i++) {
      if (
        !criteriaList[i].criteria_name ||
        criteriaList[i].weight === '' ||
        criteriaList[i].weight === null ||
        criteriaList[i].weight === undefined
      ) {
        setError(
          `Tiêu chí thứ ${i + 1} không được để trống Tên và Trọng số.`
        );
        return;
      }
    }

    /**
     * ----------------------------------------------------------
     * 3. KIỂM TRA TỔNG TRỌNG SỐ
     * ----------------------------------------------------------
     */
    if (!isWeightValid) {
      setError(
        `Tổng trọng số phải bằng chính xác 100%. Hiện tại là ${roundedTotal}%.`
      );
      return;
    }

    setLoading(true);

    try {
      /**
       * --------------------------------------------------------
       * 4. TẠO / CẬP NHẬT KHUNG NĂNG LỰC
       * --------------------------------------------------------
       */
      const payload = {
        frameworkCode: formData.framework_code,
        frameworkName: formData.framework_name,
        description: formData.description,
        criteriaList: criteriaList,

        // Hỗ trợ update
        framework_name: formData.framework_name
      };

      let frameworkId;

      if (isEditMode) {
        const response =
          await competencyFrameworkApi.update(id, payload);

        frameworkId =
          response.data?.data?.framework_id || id;
      } else {
        const response =
          await competencyFrameworkApi.create(payload);

        frameworkId =
          response.data?.data?.framework_id ||
          response.data?.data?.insertId;

        if (!frameworkId) {
          throw new Error(
            'Không lấy được ID của khung năng lực vừa tạo.'
          );
        }
      }

      /**
       * --------------------------------------------------------
       * 5. GẮN KHUNG NĂNG LỰC VỚI CHỨC DANH
       * --------------------------------------------------------
       */
      if (selectedPositionId) {
        const previousPositions = jobPositions.filter(
          (pos) =>
            String(pos.competency_framework_id) === String(frameworkId) &&
            String(pos.position_id) !== String(selectedPositionId)
        );
        for (const prevPos of previousPositions) {
          try {
            await jobPositionApi.update(prevPos.position_id, {
              competency_framework_id: null
            });
          } catch (e) {
            console.error('Không thể gỡ liên kết chức danh cũ:', e);
          }
        }

        await jobPositionApi.update(
          selectedPositionId,
          {
            competency_framework_id: Number(frameworkId)
          }
        );
      }

      /**
       * --------------------------------------------------------
       * 6. LƯU THÀNH CÔNG
       * --------------------------------------------------------
       */
      navigate('/competency-frameworks');

    } catch (err) {
      console.error('Lỗi khi lưu khung năng lực:', err);

      setError(
        err.response?.data?.message ||
        err.message ||
        'Có lỗi xảy ra khi lưu dữ liệu.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * ============================================================
   * MÀN HÌNH LOADING
   * ============================================================
   */
  if (loading && isEditMode) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center'
        }}
      >
        Đang tải...
      </div>
    );
  }

  /**
   * ============================================================
   * GIAO DIỆN
   * ============================================================
   */
  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '20px'
      }}
    >
      {/* PAGE HEADER */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '2px solid #f1f5f9'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#1e293b',
              margin: 0
            }}
          >
            {isEditMode
              ? 'Cập Nhật Khung Năng Lực'
              : 'Khai Báo Khung Năng Lực'}
          </h1>

          <p
            style={{
              color: '#64748b',
              marginTop: '8px',
              fontSize: '0.95rem'
            }}
          >
            {isEditMode
              ? 'Chỉnh sửa bộ tiêu chí đánh giá'
              : 'Tạo mới bộ tiêu chí đánh giá cho chức danh'}
          </p>
        </div>

        <Link
          to="/competency-frameworks"
          className="btn-secondary"
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: '600'
          }}
        >
          ⬅ Quay lại
        </Link>
      </div>

      {/* MAIN FORM */}
      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          padding: '32px',
          boxShadow:
            '0 20px 40px -15px rgba(0,0,0,0.05)',
          border: '1px solid #f1f5f9'
        }}
      >
        {/* ERROR */}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              borderLeft: '4px solid #ef4444',
              color: '#b91c1c',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>
              ⚠️
            </span>

            <span style={{ fontWeight: '500' }}>
              {error}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* ==================================================
              THÔNG TIN CHUNG
          ================================================== */}
          <h3
            style={{
              margin: '0 0 20px 0',
              color: '#1e293b',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📄</span>
            Thông tin chung
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: '24px',
              marginBottom: '32px'
            }}
          >

            {/* MÃ KHUNG */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#334155'
                }}
              >
                Mã Khung{' '}
                <span style={{ color: '#ef4444' }}>
                  *
                </span>
              </label>

              <input
                type="text"
                name="framework_code"
                value={formData.framework_code}
                onChange={handleChange}
                required
                disabled={isEditMode}
                placeholder="VD: FW_DEV_BE"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: isEditMode
                    ? '#f8fafc'
                    : '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  color: isEditMode
                    ? '#94a3b8'
                    : '#0f172a'
                }}
              />
            </div>

            {/* TÊN KHUNG */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#334155'
                }}
              >
                Tên Khung Năng Lực{' '}
                <span style={{ color: '#ef4444' }}>
                  *
                </span>
              </label>

              <input
                type="text"
                name="framework_name"
                value={formData.framework_name}
                onChange={handleChange}
                required
                placeholder="VD: Khung năng lực Lập trình viên Backend..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* MÔ TẢ */}
            <div
              style={{
                gridColumn: '1 / -1'
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#334155'
                }}
              >
                Mô tả chi tiết
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                placeholder="Mô tả về bộ tiêu chí này..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* ==================================================
                CHỨC DANH
            ================================================== */}
            <div
              style={{
                gridColumn: '1 / -1'
              }}
            >
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#334155'
                }}
              >
                Chức danh{' '}
                <span style={{ color: '#ef4444' }}>
                  *
                </span>
              </label>

              <select
                value={selectedPositionId}
                onChange={handlePositionChange}
                required
                disabled={loadingPositions}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: loadingPositions
                    ? '#f8fafc'
                    : '#fff',
                  fontSize: '1rem',
                  outline: 'none',
                  color: '#0f172a',
                  cursor: loadingPositions
                    ? 'not-allowed'
                    : 'pointer'
                }}
              >
                <option value="">
                  {loadingPositions
                    ? 'Đang tải danh sách chức danh...'
                    : '-- Chọn chức danh --'}
                </option>

                {jobPositions.map((position) => (
                  <option
                    key={position.position_id}
                    value={position.position_id}
                  >
                    {position.position_code
                      ? `${position.position_code} - ${position.position_name}`
                      : position.position_name}
                  </option>
                ))}
              </select>

              <p
                style={{
                  marginTop: '8px',
                  marginBottom: 0,
                  color: '#64748b',
                  fontSize: '0.85rem'
                }}
              >
                Chọn chức danh sử dụng khung năng lực này.
              </p>
            </div>

          </div>

          {/* ==================================================
              BỘ TIÊU CHÍ
          ================================================== */}
          <div
            style={{
              background: '#f8fafc',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              marginBottom: '32px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}
            >
              <h3
                style={{
                  margin: '0',
                  color: '#1e293b',
                  fontSize: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>🎯</span>
                Bộ Tiêu Chí Đánh Giá
              </h3>

              {/* TỔNG TRỌNG SỐ */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background:
                    roundedTotal === 100
                      ? '#dcfce7'
                      : '#fee2e2',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: `1px solid ${
                    roundedTotal === 100
                      ? '#bbf7d0'
                      : '#fecaca'
                  }`
                }}
              >
                <span
                  style={{
                    fontWeight: '600',
                    color:
                      roundedTotal === 100
                        ? '#166534'
                        : '#991b1b'
                  }}
                >
                  Tổng trọng số:
                </span>

                <span
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: '800',
                    color:
                      roundedTotal === 100
                        ? '#15803d'
                        : '#b91c1c'
                  }}
                >
                  {roundedTotal}%
                </span>
              </div>
            </div>

            {/* HEADER */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  '2fr 1fr 2fr auto',
                gap: '16px',
                marginBottom: '12px',
                fontWeight: '600',
                color: '#475569',
                fontSize: '0.9rem',
                padding: '0 8px'
              }}
            >
              <div>
                Tên tiêu chí{' '}
                <span style={{ color: '#ef4444' }}>
                  *
                </span>
              </div>

              <div>
                Trọng số (%){' '}
                <span style={{ color: '#ef4444' }}>
                  *
                </span>
              </div>

              <div>
                Mô tả (Hướng dẫn chấm)
              </div>

              <div
                style={{
                  width: '40px'
                }}
              />
            </div>

            {/* DANH SÁCH TIÊU CHÍ */}
            {criteriaList.map((criteria, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '2fr 1fr 2fr auto',
                  gap: '16px',
                  marginBottom: '16px',
                  alignItems: 'start'
                }}
              >
                {/* TÊN */}
                <input
                  type="text"
                  value={criteria.criteria_name}
                  onChange={(e) =>
                    handleCriteriaChange(
                      index,
                      'criteria_name',
                      e.target.value
                    )
                  }
                  placeholder="VD: Kỹ năng giải quyết vấn đề"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border:
                      '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />

                {/* TRỌNG SỐ */}
                <div
                  style={{
                    position: 'relative'
                  }}
                >
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={criteria.weight}
                    onChange={(e) =>
                      handleCriteriaChange(
                        index,
                        'weight',
                        e.target.value
                      )
                    }
                    placeholder="VD: 20"
                    required
                    style={{
                      width: '100%',
                      padding:
                        '12px 30px 12px 12px',
                      borderRadius: '8px',
                      border:
                        '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />

                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform:
                        'translateY(-50%)',
                      color: '#94a3b8',
                      fontWeight: '600'
                    }}
                  >
                    %
                  </span>
                </div>

                {/* MÔ TẢ */}
                <textarea
                  value={criteria.description}
                  onChange={(e) =>
                    handleCriteriaChange(
                      index,
                      'description',
                      e.target.value
                    )
                  }
                  placeholder="Diễn giải cách cho điểm..."
                  rows="1"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border:
                      '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />

                {/* XÓA */}
                <button
                  type="button"
                  onClick={() =>
                    removeCriteria(index)
                  }
                  disabled={criteriaList.length === 1}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      criteriaList.length === 1
                        ? '#f1f5f9'
                        : '#fee2e2',
                    color:
                      criteriaList.length === 1
                        ? '#cbd5e1'
                        : '#ef4444',
                    fontSize: '1.2rem',
                    cursor:
                      criteriaList.length === 1
                        ? 'not-allowed'
                        : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Xóa tiêu chí"
                >
                  ✖
                </button>
              </div>
            ))}

            {/* THÊM TIÊU CHÍ */}
            <button
              type="button"
              onClick={addCriteria}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#e0e7ff',
                color: '#4338ca',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>+</span>
              Thêm Tiêu Chí
            </button>
          </div>

          {/* ==================================================
              NÚT HỦY + LƯU
          ================================================== */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px',
              borderTop:
                '1px solid #f1f5f9',
              paddingTop: '24px'
            }}
          >
            <Link
              to="/competency-frameworks"
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                background: '#f1f5f9',
                color: '#475569',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              Hủy Bỏ
            </Link>

            <button
              type="submit"
              disabled={
                loading ||
                loadingPositions ||
                roundedTotal !== 100
              }
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                background:
                  roundedTotal === 100 &&
                  !loadingPositions
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : '#d1d5db',
                color:
                  roundedTotal === 100 &&
                  !loadingPositions
                    ? '#ffffff'
                    : '#6b7280',
                fontWeight: '600',
                border: 'none',
                cursor:
                  loading ||
                  loadingPositions ||
                  roundedTotal !== 100
                    ? 'not-allowed'
                    : 'pointer',
                boxShadow:
                  roundedTotal === 100 &&
                  !loadingPositions
                    ? '0 4px 12px rgba(22, 163, 74, 0.3)'
                    : 'none',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading
                ? 'Đang xử lý...'
                : 'Lưu Khung Năng Lực'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CompetencyFrameworkForm;