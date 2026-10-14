import React, {
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import {
  FaArrowLeft,
  FaSave,
  FaFilePdf,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaUpload,
  FaTimes,
  FaPen
} from 'react-icons/fa';

import { AuthContext } from '../../context/AuthContext';
import { API_BASE_URL as API_BASE } from '../../config/api';
import { candidateProfileAccess } from '../../utils/candidateProfile';

const CandidateCreate = () => {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading
  } = useContext(AuthContext);

  /*
   * Admin, Recruiter và HR Manager
   * được phép tạo hồ sơ ứng viên.
   */
  const canManageCandidates = candidateProfileAccess(user).canManage;
  const parseRequest = useRef(null);
  const saving = useRef(false);
  const checkingDuplicates = useRef(false);
  const saveKey = `candidate-create:${user?.user_id}`;
  const [pendingSave, setPendingSave] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(saveKey)) || null; }
    catch { return null; }
  });

  const rememberSave = (value) => {
    // Store only operation IDs, never the CV or candidate's personal data.
    if (value) sessionStorage.setItem(saveKey, JSON.stringify(value));
    else sessionStorage.removeItem(saveKey);
    setPendingSave(value);
  };

  useEffect(() => () => {
    parseRequest.current?.abort();
    parseRequest.current = null;
  }, []);

  const [sources, setSources] = useState([]);
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [cvFile, setCvFile] = useState(null);
  const [parsing, setParsing] = useState(false);

  const [parseMessage, setParseMessage] =
    useState('');

  const [parseWarning, setParseWarning] =
    useState('');

  const [parsedData, setParsedData] =
    useState(null);

  const [confirmedCv, setConfirmedCv] =
    useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState([]);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    source_code: '',
    recruitment_request_id: ''
  });

  /* =========================================================
     PHÂN QUYỀN
     ========================================================= */

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login', {
        replace: true
      });

      return;
    }

    if (!canManageCandidates) {
      navigate('/unauthorized', {
        replace: true
      });
    }
  }, [
    authLoading,
    user,
    canManageCandidates,
    navigate
  ]);

  /* =========================================================
     LOAD NGUỒN ỨNG VIÊN
     ========================================================= */

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !canManageCandidates
    ) {
      return;
    }

    const token =
      localStorage.getItem('token');

    const loadMasterData = async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/master-data`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

        const masterData =
          response.data?.data || [];

        const candidateSources =
          masterData.filter(
            (item) =>
              item.category_group ===
                'CANDIDATE_SOURCE' &&
              (
                item.is_active === true ||
                item.is_active === 1 ||
                item.is_active === '1'
              )
          );

        setSources(candidateSources);
      } catch (err) {
        console.error(
          'Không tải được nguồn ứng viên:',
          err
        );

        setSources([]);
      }
    };

    loadMasterData();
  }, [
    authLoading,
    user,
    canManageCandidates
  ]);

  /* =========================================================
     LOAD YÊU CẦU TUYỂN DỤNG
     ========================================================= */

  useEffect(() => {
    if (
      authLoading ||
      !user ||
      !canManageCandidates
    ) {
      return;
    }

    const token =
      localStorage.getItem('token');

    const loadRecruitmentRequests =
      async () => {
        try {
          const response = await axios.get(
            `${API_BASE}/recruitment-requests/my`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

          const requestData =
            response.data?.data || [];

          setRequests(
            requestData.filter(
              (item) =>
                item.status === 'APPROVED'
            )
          );
        } catch (err) {
          /*
           * API yêu cầu tuyển dụng lỗi
           * không được làm ảnh hưởng
           * danh sách nguồn ứng viên.
           */
          console.error(
            'Không tải được yêu cầu tuyển dụng:',
            err
          );

          setRequests([]);
        }
      };

    loadRecruitmentRequests();
  }, [
    authLoading,
    user,
    canManageCandidates
  ]);

  /* =========================================================
     FORM
     ========================================================= */

  const handleChange = (event) => {
    const {
      name,
      value
    } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    if (name === 'email' || name === 'phone') {
      setPossibleDuplicates([]);
    }
  };

  const handleParsedChange = (event) => {
    const {
      name,
      value
    } = event.target;

    setParsedData((prev) => ({
      ...prev,
      [name]: value
    }));

    setConfirmedCv(false);
  };

  /* =========================================================
     RESET CV
     ========================================================= */

  const resetCv = () => {
    parseRequest.current?.abort();
    parseRequest.current = null;
    setParsing(false);
    setCvFile(null);
    setParsedData(null);
    setParseMessage('');
    setParseWarning('');
    setConfirmedCv(false);
  };

  /* =========================================================
     UPLOAD + BÓC TÁCH CV
     ========================================================= */

  const handleCvChange = async (event) => {
    parseRequest.current?.abort();
    parseRequest.current = null;
    setParsing(false);
    const file =
      event.target.files?.[0];

    setParseMessage('');
    setParseWarning('');
    setParsedData(null);
    setConfirmedCv(false);

    if (!file) {
      setCvFile(null);
      return;
    }

    const isPdf =
      file.type === 'application/pdf' ||
      file.name
        .toLowerCase()
        .endsWith('.pdf');

    if (!isPdf) {
      setCvFile(null);

      setParseWarning(
        'Chỉ chấp nhận tệp CV định dạng PDF.'
      );

      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCvFile(null);

      setParseWarning(
        'Dung lượng CV tối đa là 5 MB.'
      );

      event.target.value = '';
      return;
    }

    setCvFile(file);
    setParsing(true);
    const controller = new AbortController();
    parseRequest.current = controller;

    try {
      const token =
        localStorage.getItem('token');

      const body = new FormData();

      body.append('cv', file);

      const response = await axios.post(
        `${API_BASE}/candidates/parse-cv`,
        body,
        {
          signal: controller.signal,
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

      if (parseRequest.current !== controller || controller.signal.aborted) return;

      const result =
        response.data?.data;

      if (!result?.parse_success) {
        setParseWarning(
          result?.warning ||
            response.data?.message ||
            'Không thể đọc CV. Bạn vẫn có thể nhập thông tin thủ công.'
        );

        return;
      }

      setParsedData({
        full_name:
          result.full_name || '',

        email:
          result.email || '',

        phone:
          result.phone || '',

        missing_fields:
          result.missing_fields || []
      });

      setParseMessage(
        'Đã đọc CV thành công. Vui lòng kiểm tra thông tin bên dưới.'
      );
    } catch (err) {
      if (parseRequest.current !== controller || controller.signal.aborted) return;
      if (err.response?.status === 413) {
        setParseWarning('Dung lượng CV tối đa là 5 MB. Vui lòng chọn tệp nhỏ hơn.');
        return;
      }
      if (err.response?.status === 403) {
        setParseWarning(
          'Bạn không có quyền bóc tách CV ứng viên.'
        );

        return;
      }

      setParseWarning(
        err.response?.data?.message ||
          'Không thể bóc tách CV. Bạn vẫn có thể nhập thông tin thủ công.'
      );
    } finally {
      if (parseRequest.current === controller) {
        parseRequest.current = null;
        setParsing(false);
      }
    }
  };

  /* =========================================================
     XÁC NHẬN THÔNG TIN TỪ CV
     ========================================================= */

  const applyParsedData = () => {
    if (!parsedData) {
      return;
    }

    setPossibleDuplicates([]);
    const name = parsedData.full_name?.trim();
    const email = parsedData.email?.trim();
    const phone = parsedData.phone?.trim();
    const validPhone = /^\+?[\d\s().-]+$/.test(phone || '') &&
      /^\d{9,15}$/.test((phone || '').replace(/\D/g, ''));
    setFormData((prev) => ({
      ...prev,

      full_name:
        name || prev.full_name,

      email:
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') ? email : prev.email,

      phone:
        validPhone ? phone : prev.phone
    }));

    setConfirmedCv(true);

    setParseMessage(
      'Đã xác nhận thông tin từ CV. Bạn vẫn có thể chỉnh sửa trước khi lưu.'
    );
  };

  /* =========================================================
     LƯU HỒ SƠ ỨNG VIÊN
     ========================================================= */

  const validateForm = () => {
    setError('');

    if (!formData.full_name.trim()) {
      setError(
        'Vui lòng nhập họ và tên ứng viên.'
      );

      return false;
    }

    if (!formData.email.trim()) {
      setError(
        'Vui lòng nhập email ứng viên.'
      );

      return false;
    }

    if (!formData.source_code) {
      setError(
        'Vui lòng chọn nguồn ứng viên.'
      );

      return false;
    }

    return true;
  };

  const finishSave = () => {
    rememberSave(null);
    navigate('/candidates');
  };

  const mergeSavedCandidate = async (operation) => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    // A previous request may have committed even if its response was lost.
    const response = await axios.get(`${API_BASE}/candidates/merges`, { headers });
    const alreadyMerged = response.data.data?.some(merge =>
      Number(merge.primary_id) === Number(operation.primary_id) &&
      Number(merge.secondary_id) === Number(operation.secondary_id)
    );
    if (!alreadyMerged) {
      await axios.post(`${API_BASE}/candidates/merge`, {
        primary_id: operation.primary_id,
        secondary_id: operation.secondary_id
      }, { headers });
    }
    finishSave();
  };

  const retryMerge = async () => {
    if (saving.current || pendingSave?.phase !== 'merge') return;
    saving.current = true;
    setLoading(true);
    setError('');
    try { await mergeSavedCandidate(pendingSave); }
    catch (err) { setError(err.response?.data?.message || 'Chưa thể xác nhận gộp hồ sơ. Bạn có thể thử lại.'); }
    finally { saving.current = false; setLoading(false); }
  };

  const saveCandidate = async (primaryCandidate = null, allowDuplicate = Boolean(primaryCandidate)) => {
    if (saving.current || pendingSave || !validateForm()) return;
    saving.current = true;
    setLoading(true);
    let created = false;

    try {
      const token =
        localStorage.getItem('token');

      // Persist before sending: reload/network failure must not silently repeat POST.
      rememberSave({ phase: 'creating' });
      const response = await axios.post(
        `${API_BASE}/candidates`,
        {
          full_name:
            formData.full_name.trim(),

          email:
            formData.email.trim(),

          phone:
            formData.phone.trim() || null,

          source_code:
            formData.source_code,

          recruitment_request_id:
            formData.recruitment_request_id
              ? Number(
                  formData.recruitment_request_id
                )
              : null,
          allow_duplicate: allowDuplicate
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

      created = true;
      if (primaryCandidate) {
        const operation = {
          phase: 'merge',
          primary_id: primaryCandidate.id,
          secondary_id: response.data.data.id
        };
        rememberSave(operation);
        await mergeSavedCandidate(operation);
      } else {
        finishSave();
      }
    } catch (err) {
      if (!created && err.response?.status >= 400 && err.response.status < 500) {
        rememberSave(null);
      }
      if (!created && err.response?.status === 409 && err.response.data.duplicates) {
        setPossibleDuplicates(err.response.data.duplicates);
        setError('Phát hiện hồ sơ trùng. Hãy so sánh trước khi tiếp tục.');
        return;
      }
      if (err.response?.status === 403) {
        setError(
          'Bạn không có quyền tạo hồ sơ ứng viên.'
        );

        return;
      }

      setError(
        err.response?.data?.message ||
          'Có lỗi xảy ra khi tạo hồ sơ ứng viên.'
      );
    } finally {
      saving.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (checkingDuplicates.current || saving.current || pendingSave || !validateForm()) return;

    checkingDuplicates.current = true;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/candidates/duplicates`, {
        params: { email: formData.email.trim(), phone: formData.phone.trim() },
        headers: { Authorization: `Bearer ${token}` }
      });
      const matches = response.data.data || [];
      setPossibleDuplicates(matches);
      if (matches.length) return;
      await saveCandidate();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể kiểm tra hồ sơ trùng.');
    } finally {
      checkingDuplicates.current = false;
      setLoading(false);
    }
  };

  /* =========================================================
     STYLE
     ========================================================= */

  const cardStyle = {
    background: '#ffffff',

    borderRadius: '18px',

    border: '1px solid #e2e8f0',

    boxShadow:
      '0 4px 18px rgba(15, 23, 42, 0.05)'
  };

  const inputStyle = {
    width: '100%',

    height: '50px',

    boxSizing: 'border-box',

    padding: '0 16px',

    borderRadius: '10px',

    border: '1px solid #cbd5e1',

    outline: 'none',

    background: '#ffffff',

    color: '#0f172a',

    fontSize: '0.95rem'
  };

  const labelStyle = {
    display: 'flex',

    alignItems: 'center',

    gap: '7px',

    marginBottom: '8px',

    color: '#334155',

    fontWeight: 700,

    fontSize: '0.9rem'
  };

  /* =========================================================
     STEP COMPONENT
     ========================================================= */

  const Step = ({
    number,
    title,
    description,
    active,
    done
  }) => {
    return (
      <div
        style={{
          flex: 1,

          minWidth: '190px',

          display: 'flex',

          alignItems: 'center',

          gap: '12px',

          padding: '14px 16px',

          borderRadius: '12px',

          background: done
            ? '#ecfdf5'
            : active
              ? '#eef2ff'
              : '#f8fafc',

          border: done
            ? '1px solid #a7f3d0'
            : active
              ? '1px solid #c7d2fe'
              : '1px solid #e2e8f0'
        }}
      >
        <div
          style={{
            width: '38px',

            height: '38px',

            flexShrink: 0,

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            borderRadius: '50%',

            fontWeight: 800,

            background: done
              ? '#10b981'
              : active
                ? '#4f46e5'
                : '#e2e8f0',

            color:
              done || active
                ? '#ffffff'
                : '#64748b'
          }}
        >
          {done
            ? <FaCheckCircle />
            : number}
        </div>

        <div>
          <div
            style={{
              color: '#0f172a',

              fontWeight: 800
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: '3px',

              color: '#64748b',

              fontSize: '0.8rem'
            }}
          >
            {description}
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     AUTH LOADING
     ========================================================= */

  if (authLoading) {
    return null;
  }

  if (
    !user ||
    !canManageCandidates
  ) {
    return null;
  }

  /* =========================================================
     UI
     ========================================================= */

  if (pendingSave) {
    return (
      <section style={{ ...cardStyle, margin: 28, padding: 26 }} aria-busy={loading}>
        <h2>{pendingSave.phase === 'merge' ? 'Hoàn tất gộp hồ sơ' : 'Kiểm tra kết quả lưu hồ sơ'}</h2>
        {pendingSave.phase === 'merge' ? (
          <p>Hồ sơ #{pendingSave.secondary_id} đã được tạo. Thử lại sẽ chỉ gộp vào hồ sơ #{pendingSave.primary_id}, không tạo ứng viên mới.</p>
        ) : (
          <p>{loading ? 'Đang lưu hồ sơ...' : 'Chưa xác định được kết quả lưu. Hãy kiểm tra danh sách ứng viên trước khi nhập lại để tránh hồ sơ trùng.'}</p>
        )}
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {pendingSave.phase === 'merge' && (
            <button type="button" disabled={loading} onClick={retryMerge}>Thử lại gộp hồ sơ</button>
          )}
          <button type="button" disabled={loading} onClick={() => navigate('/candidates')}>Kiểm tra danh sách ứng viên</button>
          {pendingSave.phase === 'merge' ? (
            <button type="button" disabled={loading} onClick={finishSave}>Kết thúc và kiểm tra kết quả trong danh sách</button>
          ) : (
            <button type="button" disabled={loading} onClick={() => { rememberSave(null); setError(''); }}>Đã kiểm tra danh sách, nhập hồ sơ mới</button>
          )}
        </div>
      </section>
    );
  }

  return (
    <div
      style={{
        minHeight:
          'calc(100vh - 80px)',

        padding: '28px',

        background: '#f4f7fb'
      }}
    >
      <div
        style={{
          width: '100%',

          maxWidth: '1150px',

          margin: '0 auto',

          display: 'flex',

          flexDirection: 'column',

          gap: '20px'
        }}
      >

        {/* ================= HEADER ================= */}

        <div
          style={{
            padding: '26px 30px',

            borderRadius: '20px',

            color: '#ffffff',

            background:
              'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',

            display: 'flex',

            alignItems: 'center',

            justifyContent:
              'space-between',

            gap: '20px',

            boxShadow:
              '0 10px 30px rgba(79,70,229,0.20)'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.8rem',

                opacity: 0.8,

                fontWeight: 700
              }}
            >
              QUẢN LÝ ỨNG VIÊN
            </div>

            <h1
              style={{
                margin: '6px 0 5px',

                fontSize: '1.8rem'
              }}
            >
              Thêm hồ sơ ứng viên
            </h1>

            <div
              style={{
                opacity: 0.9
              }}
            >
              Tải CV để hệ thống hỗ trợ điền
              thông tin hoặc nhập hồ sơ thủ công.
            </div>
          </div>

          <button
            type="button"

            onClick={() =>
              navigate('/candidates')
            }

            style={{
              padding: '10px 17px',

              borderRadius: '10px',

              border:
                '1px solid rgba(255,255,255,0.4)',

              background:
                'rgba(255,255,255,0.12)',

              color: '#ffffff',

              fontWeight: 700,

              cursor: 'pointer'
            }}
          >
            <FaArrowLeft
              style={{
                marginRight: '7px'
              }}
            />

            Quay lại
          </button>
        </div>

        {/* ================= STEPS ================= */}

        {possibleDuplicates.length > 0 && (
          <section style={{ display: 'grid', gap: 12, padding: 18, background: '#fff', border: '1px solid #fbbf24', borderRadius: 10 }}>
            <h3 style={{ margin: 0, color: '#92400e' }}>So sánh hồ sơ có thông tin trùng</h3>
            {possibleDuplicates.map(candidate => (
              <article key={candidate.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: 14, background: '#f8fafc' }}>
                  <strong>Hồ sơ hiện có #{candidate.id}</strong>
                  <p>Họ tên: {candidate.full_name}</p>
                  <p>Email: {candidate.email}</p>
                  <p>Điện thoại: {candidate.phone || 'Chưa có'}</p>
                  <p>Vị trí: {candidate.position_name || 'Chưa gắn yêu cầu'}</p>
                </div>
                <div style={{ padding: 14 }}>
                  <strong>Hồ sơ đang nhập</strong>
                  <p>Họ tên: {formData.full_name}</p>
                  <p>Email: {formData.email}</p>
                  <p>Điện thoại: {formData.phone || 'Chưa có'}</p>
                  <p>Vị trí: {requests.find(request => String(request.id) === String(formData.recruitment_request_id))?.position_name || 'Chưa gắn yêu cầu'}</p>
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 12, borderTop: '1px solid #e2e8f0' }}>
                  <button type="button" disabled={loading} onClick={() => saveCandidate(candidate)} style={{ padding: '9px 12px', border: 0, borderRadius: 6, color: '#fff', background: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>
                    {loading ? 'Đang gộp...' : 'Giữ hồ sơ hiện có và gộp thông tin mới'}
                  </button>
                  <button type="button" disabled={loading} onClick={() => saveCandidate(null, true)} style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, color: '#334155', background: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    Lưu riêng, không gộp
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        <div
          style={{
            ...cardStyle,

            padding: '18px',

            display: 'flex',

            gap: '12px',

            flexWrap: 'wrap'
          }}
        >
          <Step
            number="1"

            title="Tải CV"

            description="Chọn tệp PDF"

            active={!cvFile}

            done={Boolean(cvFile)}
          />

          <Step
            number="2"

            title="Kiểm tra dữ liệu"

            description="Xác nhận hoặc chỉnh sửa"

            active={
              Boolean(parsedData) &&
              !confirmedCv
            }

            done={confirmedCv}
          />

          <Step
            number="3"

            title="Hoàn tất hồ sơ"

            description="Bổ sung và lưu"

            active={
              confirmedCv ||
              Boolean(parseWarning)
            }

            done={false}
          />
        </div>

        {/* ================= CV ================= */}

        <section
          style={{
            ...cardStyle,

            padding: '26px'
          }}
        >
          <div
            style={{
              display: 'flex',

              justifyContent:
                'space-between',

              gap: '15px',

              alignItems:
                'flex-start',

              marginBottom: '18px'
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,

                  color: '#0f172a'
                }}
              >
                <FaFilePdf
                  style={{
                    marginRight: '9px',

                    color: '#ef4444'
                  }}
                />

                CV ứng viên
              </h2>

              <div
                style={{
                  marginTop: '6px',

                  color: '#64748b'
                }}
              >
                PDF tối đa 5 MB. Hệ thống chỉ
                hỗ trợ CV có nội dung văn bản.
              </div>
            </div>

            {cvFile && (
              <button
                type="button"

                onClick={resetCv}

                style={{
                  padding: '8px 12px',

                  border: 'none',

                  borderRadius: '8px',

                  background: '#f1f5f9',

                  color: '#475569',

                  cursor: 'pointer'
                }}
              >
                <FaTimes
                  style={{
                    marginRight: '5px'
                  }}
                />

                Chọn lại
              </button>
            )}
          </div>

          {!cvFile && (
            <label
              style={{
                minHeight: '155px',

                border:
                  '2px dashed #c7d2fe',

                borderRadius: '14px',

                background: '#f8faff',

                display: 'flex',

                flexDirection: 'column',

                alignItems: 'center',

                justifyContent:
                  'center',

                cursor: parsing
                  ? 'wait'
                  : 'pointer'
              }}
            >
              <div
                style={{
                  width: '52px',

                  height: '52px',

                  borderRadius: '13px',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent:
                    'center',

                  background: '#eef2ff',

                  color: '#4f46e5',

                  fontSize: '1.4rem'
                }}
              >
                <FaUpload />
              </div>

              <strong
                style={{
                  marginTop: '12px',

                  color: '#1e293b'
                }}
              >
                {parsing
                  ? 'Đang đọc CV...'
                  : 'Nhấn để chọn CV PDF'}
              </strong>

              <span
                style={{
                  marginTop: '4px',

                  color: '#64748b',

                  fontSize: '0.8rem'
                }}
              >
                Tối đa 5 MB
              </span>

              <input
                type="file"

                accept=".pdf,application/pdf"

                disabled={parsing}

                onChange={handleCvChange}

                style={{
                  display: 'none'
                }}
              />
            </label>
          )}

          {cvFile && (
            <div
              style={{
                padding: '14px 16px',

                border:
                  '1px solid #e2e8f0',

                borderRadius: '12px',

                background: '#f8fafc',

                display: 'flex',

                alignItems: 'center',

                gap: '12px'
              }}
            >
              <FaFilePdf
                style={{
                  color: '#ef4444',

                  fontSize: '1.4rem'
                }}
              />

              <div>
                <strong>
                  {cvFile.name}
                </strong>

                <div
                  style={{
                    marginTop: '3px',

                    color: '#64748b',

                    fontSize: '0.8rem'
                  }}
                >
                  {(
                    cvFile.size /
                    1024 /
                    1024
                  ).toFixed(2)}{' '}
                  MB
                </div>
              </div>
            </div>
          )}

          {/* Cảnh báo parse */}

          {parseWarning && (
            <div
              style={{
                marginTop: '16px',

                padding: '13px 15px',

                border:
                  '1px solid #fed7aa',

                borderRadius: '10px',

                background: '#fff7ed',

                color: '#c2410c'
              }}
            >
              <FaExclamationTriangle
                style={{
                  marginRight: '8px'
                }}
              />

              {parseWarning}

              <div
                style={{
                  marginTop: '4px',

                  fontSize: '0.8rem'
                }}
              >
                Bạn vẫn có thể nhập thông tin
                ứng viên thủ công.
              </div>
            </div>
          )}

          {/* Parse thành công */}

          {parseMessage && (
            <div
              style={{
                marginTop: '16px',

                padding: '13px 15px',

                border:
                  '1px solid #a7f3d0',

                borderRadius: '10px',

                background: '#ecfdf5',

                color: '#047857'
              }}
            >
              <FaCheckCircle
                style={{
                  marginRight: '8px'
                }}
              />

              {parseMessage}
            </div>
          )}

          {/* ================= DATA CV ================= */}

          {parsedData && (
            <div
              style={{
                marginTop: '20px',

                padding: '20px',

                border:
                  '1px solid #c7d2fe',

                borderRadius: '14px',

                background: '#f5f7ff'
              }}
            >
              <div
                style={{
                  display: 'flex',

                  justifyContent:
                    'space-between',

                  marginBottom: '18px'
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,

                      color: '#312e81'
                    }}
                  >
                    Thông tin bóc tách từ CV
                  </h3>

                  <div
                    style={{
                      marginTop: '4px',

                      color: '#6366f1',

                      fontSize: '0.82rem'
                    }}
                  >
                    Bạn có thể chỉnh sửa trước
                    khi xác nhận.
                  </div>
                </div>

                <FaPen
                  style={{
                    color: '#6366f1'
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',

                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',

                  gap: '16px'
                }}
              >
                <div>
                  <label style={labelStyle}>
                    <FaUser />

                    Họ và tên
                  </label>

                  <input
                    name="full_name"

                    value={
                      parsedData.full_name
                    }

                    onChange={
                      handleParsedChange
                    }

                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <FaEnvelope />

                    Email
                  </label>

                  <input
                    type="email"

                    name="email"

                    value={
                      parsedData.email
                    }

                    onChange={
                      handleParsedChange
                    }

                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <FaPhone />

                    Số điện thoại
                  </label>

                  <input
                    name="phone"

                    value={
                      parsedData.phone
                    }

                    onChange={
                      handleParsedChange
                    }

                    style={inputStyle}
                  />
                </div>
              </div>

              {parsedData
                .missing_fields
                ?.length > 0 && (
                <div
                  style={{
                    marginTop: '14px',

                    padding:
                      '10px 12px',

                    borderRadius: '8px',

                    background:
                      '#fffbeb',

                    color: '#92400e'
                  }}
                >
                  CV còn thiếu một số thông
                  tin. Bạn có thể bổ sung
                  thủ công.
                </div>
              )}

              <div
                style={{
                  marginTop: '18px',

                  display: 'flex',

                  justifyContent:
                    'flex-end'
                }}
              >
                <button
                  type="button"

                  onClick={
                    applyParsedData
                  }

                  style={{
                    padding:
                      '11px 18px',

                    border: 'none',

                    borderRadius:
                      '10px',

                    background:
                      confirmedCv
                        ? '#059669'
                        : '#4f46e5',

                    color: '#ffffff',

                    fontWeight: 700,

                    cursor: 'pointer'
                  }}
                >
                  <FaCheckCircle
                    style={{
                      marginRight: '7px'
                    }}
                  />

                  {confirmedCv
                    ? 'Đã xác nhận thông tin'
                    : 'Xác nhận thông tin'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ================= FORM ================= */}

        <form
          onSubmit={handleSubmit}

          style={{
            ...cardStyle,

            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding:
                '24px 26px 16px',

              borderBottom:
                '1px solid #e2e8f0'
            }}
          >
            <h2
              style={{
                margin: 0,

                color: '#0f172a'
              }}
            >
              Thông tin hồ sơ
            </h2>

            <div
              style={{
                marginTop: '5px',

                color: '#64748b'
              }}
            >
              Kiểm tra lần cuối trước khi lưu
              ứng viên vào hệ thống.
            </div>
          </div>

          <div
            style={{
              padding: '24px 26px'
            }}
          >
            {error && (
              <div
                style={{
                  marginBottom: '20px',

                  padding:
                    '12px 14px',

                  border:
                    '1px solid #fecaca',

                  borderRadius:
                    '10px',

                  background:
                    '#fef2f2',

                  color: '#b91c1c'
                }}
              >
                <FaExclamationTriangle
                  style={{
                    marginRight: '7px'
                  }}
                />

                {error}
              </div>
            )}

            <div
              style={{
                display: 'grid',

                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',

                gap: '20px'
              }}
            >

              {/* HỌ TÊN */}

              <div>
                <label style={labelStyle}>
                  <FaUser />

                  Họ và tên

                  <span
                    style={{
                      color: '#ef4444'
                    }}
                  >
                    *
                  </span>
                </label>

                <input
                  name="full_name"

                  value={
                    formData.full_name
                  }

                  onChange={handleChange}

                  placeholder="VD: Nguyễn Văn A"

                  style={inputStyle}
                />
              </div>

              {/* EMAIL */}

              <div>
                <label style={labelStyle}>
                  <FaEnvelope />

                  Email

                  <span
                    style={{
                      color: '#ef4444'
                    }}
                  >
                    *
                  </span>
                </label>

                <input
                  type="email"

                  name="email"

                  value={
                    formData.email
                  }

                  onChange={handleChange}

                  placeholder="VD: candidate@gmail.com"

                  style={inputStyle}
                />
              </div>

              {/* PHONE */}

              <div>
                <label style={labelStyle}>
                  <FaPhone />

                  Số điện thoại
                </label>

                <input
                  name="phone"

                  value={
                    formData.phone
                  }

                  onChange={handleChange}

                  placeholder="VD: 0987654321"

                  style={inputStyle}
                />
              </div>

              {/* NGUỒN ỨNG VIÊN */}

              <div>
                <label style={labelStyle}>
                  Nguồn ứng viên

                  <span
                    style={{
                      color: '#ef4444'
                    }}
                  >
                    *
                  </span>
                </label>

                <select
                  name="source_code"

                  value={
                    formData.source_code
                  }

                  onChange={handleChange}

                  style={inputStyle}
                >
                  <option value="">
                    -- Chọn nguồn ứng viên --
                  </option>

                  {sources.length === 0 && (
                    <option
                      value=""
                      disabled
                    >
                      Chưa có nguồn ứng viên
                    </option>
                  )}

                  {sources.map(
                    (source) => (
                      <option
                        key={source.code}

                        value={source.code}
                      >
                        {source.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* ===========================
                  YÊU CẦU TUYỂN DỤNG
                 =========================== */}

              <div
                style={{
                  gridColumn:
                    '1 / -1'
                }}
              >
                <label style={labelStyle}>
                  <FaBriefcase />

                  Gắn vào yêu cầu tuyển dụng
                </label>

                <select
                  name="recruitment_request_id"

                  value={
                    formData.recruitment_request_id
                  }

                  onChange={handleChange}

                  disabled={
                    requests.length === 0
                  }

                  style={{
                    ...inputStyle,

                    background:
                      requests.length === 0
                        ? '#f1f5f9'
                        : '#ffffff',

                    color:
                      requests.length === 0
                        ? '#64748b'
                        : '#0f172a',

                    cursor:
                      requests.length === 0
                        ? 'not-allowed'
                        : 'pointer'
                  }}
                >
                  {requests.length === 0 ? (
                    <option value="">
                      Chưa có yêu cầu tuyển dụng đã duyệt
                    </option>
                  ) : (
                    <>
                      <option value="">
                        -- Không gắn yêu cầu tuyển dụng --
                      </option>

                      {requests.map(
                        (request) => (
                          <option
                            key={
                              request.id
                            }

                            value={
                              request.id
                            }
                          >
                            #
                            {request.id}
                            {' - '}

                            {request.position_name ||
                              'Chưa có chức danh'}

                            {' ('}

                            {request.department_name ||
                              'Chưa có phòng ban'}

                            {')'}
                          </option>
                        )
                      )}
                    </>
                  )}
                </select>

                <div
                  style={{
                    marginTop: '7px',

                    color:
                      requests.length === 0
                        ? '#64748b'
                        : '#94a3b8',

                    fontSize:
                      '0.78rem'
                  }}
                >
                  {requests.length === 0
                    ? 'Chưa có yêu cầu tuyển dụng được phê duyệt. Trường này không bắt buộc, bạn vẫn có thể lưu hồ sơ ứng viên.'
                    : 'Chỉ các yêu cầu tuyển dụng đã được phê duyệt mới hiển thị.'}
                </div>
              </div>

            </div>
          </div>

          {/* ================= FOOTER ================= */}

          <div
            style={{
              padding: '18px 26px',

              borderTop:
                '1px solid #e2e8f0',

              background: '#f8fafc',

              display: 'flex',

              justifyContent:
                'space-between',

              alignItems: 'center'
            }}
          >
            <button
              type="button"

              onClick={() =>
                navigate('/candidates')
              }

              style={{
                padding:
                  '11px 18px',

                border:
                  '1px solid #cbd5e1',

                borderRadius:
                  '10px',

                background:
                  '#ffffff',

                color: '#475569',

                fontWeight: 700,

                cursor: 'pointer'
              }}
            >
              Hủy
            </button>

            <button
              type="submit"

              disabled={loading}

              style={{
                padding:
                  '12px 22px',

                border: 'none',

                borderRadius:
                  '10px',

                background: loading
                  ? '#94a3b8'
                  : '#10b981',

                color: '#ffffff',

                fontWeight: 800,

                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',

                display: 'flex',

                alignItems: 'center',

                gap: '8px',

                boxShadow:
                  '0 4px 12px rgba(16,185,129,0.20)'
              }}
            >
              <FaSave />

              {loading
                ? 'Đang lưu...'
                : 'Lưu hồ sơ ứng viên'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CandidateCreate;
