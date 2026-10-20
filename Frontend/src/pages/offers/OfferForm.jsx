import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import offerApi, { ELIGIBILITY_PENDING, offerErrorMessage, validOfferVersion } from '../../api/offerApi';
import { canEditOffer, canUseOfferDrafts, draftPayload, formFromOffer, validateOfferForm } from './offerFormModel';
import './OfferForm.css';

function responseOffer(response) {
  const offer = response?.data?.data;
  if (!response?.data?.success || !offer || !/^[1-9]\d*$/.test(String(offer.id)) || !offer.status) {
    throw new Error('Invalid Offer response');
  }
  return offer;
}

// API injection is used by isolated browser tests; application routes always use
// the real adapter. No runtime mock, storage fallback or write-enabling flag.
export default function OfferForm({ api = offerApi }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [offer, setOffer] = useState(null);
  const [form, setForm] = useState(formFromOffer);
  const [options, setOptions] = useState({ available: false, applications: [] });
  const [applicationId, setApplicationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const lock = useRef(false);
  const generation = useRef(0);
  const createdId = useRef(null);

  useEffect(() => {
    let active = true;
    ++generation.current;
    createdId.current = null;
    setOffer(null);
    setForm(formFromOffer());
    setOptions({ available: false, applications: [] });
    setApplicationId('');
    setBlocked(false);
    setErrors({});
    setNotice(location.state?.offerNotice || null);
    setLoading(true);
    const load = async () => {
      try {
        if (id) {
          const data = responseOffer(await api.getById(id));
          if (String(data.id) !== id) throw new Error('Mismatched Offer');
          if (active) { setOffer(data); setForm(formFromOffer(data)); }
        } else if (canUseOfferDrafts(user)) {
          const data = await api.getCreationOptions();
          if (active) setOptions(data);
        } else if (active) {
          setNotice({ type: 'error', text: offerErrorMessage({ response: { status: 403 } }) });
        }
      } catch (error) {
        if (active) setNotice({ type: 'error', text: offerErrorMessage(error) });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; ++generation.current; };
  }, [id, api, user, location.key]);

  const applications = options.available === true && Array.isArray(options.applications)
    ? options.applications.filter(item => item.eligible === true && Number(item.application_id) > 0)
    : [];
  const application = applications.find(item => String(item.application_id) === applicationId);
  const identity = offer || application || {};
  const editable = !blocked && (id ? canEditOffer(user, offer) : canUseOfferDrafts(user) && !!application);
  const missingVersion = !!id && !!offer && !validOfferVersion(offer.row_version);
  const reason = offer?.status === 'CHANGE_REQUESTED'
    ? offer.approvals?.find(item => ['REQUEST_CHANGE', 'CHANGE_REQUESTED'].includes(item.action))?.reason
    : null;

  const save = async (submit) => {
    if (lock.current || !editable || loading || missingVersion) return;
    const validation = validateOfferForm(form, identity.position_id, submit);
    setErrors(validation);
    setNotice(null);
    if (Object.keys(validation).length) return;
    lock.current = true;
    setBusy(true);
    const currentGeneration = generation.current;
    const stillHere = () => currentGeneration === generation.current;
    let saved = offer;
    try {
      if (!id) {
        // A previously confirmed POST must never be repeated if its submit fails.
        if (createdId.current) return;
        saved = responseOffer(await api.create({
          application_id: Number(applicationId),
          position_id: identity.position_id ?? null,
          ...draftPayload(form),
        }));
        createdId.current = saved.id;
        if (saved.status !== 'DRAFT') throw new Error('Unexpected create response');
      } else {
        saved = responseOffer(await api.update(id, draftPayload(form), offer.row_version));
        if (String(saved.id) !== id) throw new Error('Mismatched Offer');
      }
      if (!stillHere()) return;
      setOffer(saved);
      setForm(formFromOffer(saved));
      if (submit) {
        const submitted = responseOffer(await api.submit(saved.id));
        if (String(submitted.id) !== String(saved.id) || submitted.status !== 'PENDING_APPROVAL') {
          throw new Error('Unexpected submit response');
        }
        if (!stillHere()) return;
        setOffer(submitted);
        setForm(formFromOffer(submitted));
      }
      if (!id) navigate(`/offers/${saved.id}/edit`, {
        replace: true,
        state: { offerNotice: { type: 'success', text: submit ? 'Đã gửi Offer chờ phê duyệt.' : 'Đã lưu nháp Offer.' } },
      });
      else setNotice({ type: 'success', text: submit ? 'Đã gửi Offer chờ phê duyệt.' : 'Đã lưu nháp Offer.' });
    } catch (error) {
      if (!stillHere()) return;
      const status = error.response?.status;
      if ([401, 403, 404].includes(status)) { setOffer(null); setForm(formFromOffer()); setBlocked(true); }
      if ([409, 428].includes(status)) setBlocked(true);
      // Keep the confirmed draft ID if creation succeeded but submit failed.
      // Navigation reloads its real state; the failed action remains visible.
      if (!id && createdId.current) {
        navigate(`/offers/${createdId.current}/edit`, { replace: true, state: { offerNotice: { type: 'error', text: offerErrorMessage(error) } } });
      } else setNotice({ type: 'error', text: offerErrorMessage(error) });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const field = (name, label, type = 'text') => (
    <label className="offer-form-field" key={name}>
      <span>{label}</span>
      {type === 'textarea'
        ? <textarea name={name} rows={3} value={form[name]} disabled={!editable || busy}
            aria-invalid={!!errors[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} />
        : <input name={name} type={type} value={form[name]} disabled={!editable || busy}
            inputMode={name === 'basic_salary' ? 'decimal' : undefined}
            aria-invalid={!!errors[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} />}
      {errors[name] && <small role="alert">{errors[name]}</small>}
    </label>
  );

  return (
    <main className="offer-form-page">
      <Link to="/offers">← Danh sách Offer</Link>
      <h1>{id ? 'Chi tiết và chỉnh sửa Offer' : 'Soạn Offer mới'}</h1>
      {loading ? <p role="status">Đang tải thông tin Offer…</p> : <>
        {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`offer-notice ${notice.type}`}>{notice.text}</p>}
        {!id && !options.available && <p role="status" className="offer-notice">{ELIGIBILITY_PENDING}</p>}
        {offer && <p>Trạng thái: <strong>{offer.status}</strong></p>}
        {id && offer && !editable && <p className="offer-notice">Chế độ chỉ đọc. Offer này không được phép chỉnh sửa.</p>}
        {missingVersion && <p role="alert" className="offer-notice">Backend chưa cung cấp phiên bản cập nhật hợp lệ. Chưa thể lưu hoặc gửi duyệt.</p>}
        {reason && <p className="offer-notice">Yêu cầu chỉnh sửa: {reason}</p>}
        {blocked && <button type="button" onClick={() => window.location.reload()}>Tải lại Offer</button>}
        {(!id || offer) && <form noValidate onSubmit={e => { e.preventDefault(); save(false); }} aria-label="Thông tin Offer">
          <div className="offer-form-grid">
            <label className="offer-form-field"><span>Ứng viên</span><input readOnly value={identity.candidate_name || ''} placeholder="Chọn hồ sơ đã xác minh" /></label>
            <label className="offer-form-field"><span>Hồ sơ / vị trí tuyển dụng</span>
              {id
                ? <input readOnly value={identity.application_name || identity.position_name || ''} placeholder="Chưa có thông tin hồ sơ" />
                : <select name="application_id" disabled={!options.available || busy} value={applicationId}
                    onChange={e => setApplicationId(e.target.value)}>
                    <option value="">Chọn hồ sơ đủ điều kiện</option>
                    {applications.map(item => <option key={item.application_id} value={item.application_id}>
                      {item.candidate_name} — {item.application_name || item.position_name}
                    </option>)}
                  </select>}
            </label>
            <label className="offer-form-field"><span>Vị trí</span><input readOnly value={identity.position_name || ''} />
              {errors.position_id && <small role="alert">{errors.position_id}</small>}
            </label>
            <label className="offer-form-field"><span>Phòng ban</span><input readOnly value={identity.department_name || ''} /></label>
            {field('job_title', 'Chức danh')}
            {field('basic_salary', 'Mức lương')}
            {field('currency', 'Tiền tệ')}
            {field('expected_start_date', 'Ngày dự kiến nhận việc', 'date')}
            {field('response_deadline', 'Hạn phản hồi', 'date')}
            {field('work_location', 'Địa điểm làm việc')}
          </div>
          {field('message', 'Nội dung Offer / ghi chú', 'textarea')}
          {field('benefits', 'Phúc lợi', 'textarea')}
          {field('special_terms', 'Điều khoản bổ sung', 'textarea')}
          <p className="offer-form-hint">Có thể để trống nội dung khi lưu nháp. Khi gửi duyệt cần chức danh, vị trí, mức lương, tiền tệ, ngày nhận việc và hạn phản hồi. Hồ sơ và phòng ban được xác định từ Backend.</p>
          <div className="offer-form-actions">
            <button type="submit" disabled={!editable || busy || missingVersion}>Lưu nháp</button>
            <button type="button" disabled={!editable || busy || missingVersion} onClick={() => save(true)}>Gửi duyệt</button>
            {busy && <span role="status">Đang xử lý…</span>}
          </div>
        </form>}
      </>}
    </main>
  );
}
