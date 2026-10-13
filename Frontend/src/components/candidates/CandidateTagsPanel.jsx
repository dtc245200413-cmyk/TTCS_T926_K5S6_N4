import React, { useEffect, useRef, useState } from 'react';
import candidateProfileApi from '../../api/candidateProfileApi';
import { profileError } from '../../utils/candidateProfile';

export default function CandidateTagsPanel({ candidateId, canManage }) {
  const [tags, setTags] = useState([]);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(canManage);
  const [readable, setReadable] = useState(false);
  const [error, setError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requestController = useRef(null);
  const writing = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    requestController.current = controller;
    setLoading(true);
    setReadable(false);
    setError('');
    setOptionsError('');
    candidateProfileApi.getTags(candidateId, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(response.data.data)) throw new Error('Invalid tag data');
      setTags(response.data.data);
      setReadable(true);
    }).catch(err => {
      if (!controller.signal.aborted) setError(profileError(err, 'Không thể tải nhãn. Vui lòng thử lại.'));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    if (canManage) {
      setOptionsLoading(true);
      candidateProfileApi.getTagOptions(controller.signal).then(response => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(response.data.data)) throw new Error('Invalid catalogue');
        setOptions(response.data.data.filter(tag => tag.category_group === 'CANDIDATE_TAG' && Number(tag.is_active) === 1));
      }).catch(err => {
        if (!controller.signal.aborted) {
          setOptions([]);
          setOptionsError(profileError(err, 'Không thể tải danh mục nhãn. Vui lòng thử lại.'));
        }
      }).finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    }
    return () => controller.abort();
  }, [candidateId, canManage, attempt]);

  const available = options.filter(option => !tags.some(tag => String(tag.tag_id) === String(option.id)));
  const selectedOption = available.find(option => String(option.id) === selected);

  async function mutate(work, success) {
    if (writing.current || !canManage || !readable) return;
    writing.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const signal = requestController.current.signal;
    try {
      await work(signal);
      if (!signal.aborted) setNotice(success);
    } catch (err) {
      if (signal.aborted) return;
      setError(profileError(err, 'Không thể cập nhật nhãn. Vui lòng thử lại.'));
      if ([403, 404].includes(err.response?.status)) {
        setReadable(false);
        setTags([]);
      }
      if (err.response?.status === 409) {
        // Another session may have attached the same tag. Reconcile with persisted data.
        try {
          const response = await candidateProfileApi.getTags(candidateId, signal);
          if (!signal.aborted && Array.isArray(response.data.data)) { setTags(response.data.data); setSelected(''); }
        } catch (readError) {
          if (!signal.aborted) { setReadable(false); setError(profileError(readError, 'Không thể tải lại nhãn. Vui lòng thử lại.')); }
        }
      }
    } finally {
      writing.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }

  function addTag(event) {
    event.preventDefault();
    if (!selectedOption) return;
    mutate(async signal => {
      const response = await candidateProfileApi.addTag(candidateId, Number(selectedOption.id), signal);
      if (signal.aborted) return;
      setTags(current => [...current, { ...selectedOption, ...response.data.data, tag_id: selectedOption.id }]);
      setSelected('');
    }, 'Đã gắn nhãn.');
  }

  function removeTag(tag) {
    mutate(async signal => {
      await candidateProfileApi.removeTag(candidateId, tag.tag_id, signal);
      if (!signal.aborted) setTags(current => current.filter(item => item.tag_id !== tag.tag_id));
    }, 'Đã bỏ nhãn.');
  }

  return <section className="cp-card" aria-labelledby="cp-tags-title" aria-busy={loading || busy}>
    <h2 id="cp-tags-title">Nhãn ứng viên</h2>
    {loading && <p role="status">Đang tải nhãn...</p>}
    {error && <div className="cp-error" role="alert">{error} <button className="cp-button cp-secondary" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Tải lại nhãn</button></div>}
    {notice && <p className="cp-success" role="status">{notice}</p>}
    {!loading && readable && <>
      {tags.length === 0 ? <p className="cp-muted">Chưa có nhãn.</p> : <ul className="cp-tags">
        {tags.map(tag => <li className="cp-tag" key={tag.tag_id}>
          <span>{tag.name || tag.code}{Number(tag.is_active) !== 1 && <small> (Ngừng sử dụng)</small>}</span>
          {canManage && <button type="button" className="cp-tag-remove" aria-label={`Bỏ nhãn ${tag.name || tag.code}`} disabled={busy} onClick={() => removeTag(tag)}>×</button>}
        </li>)}
      </ul>}
      {canManage && <form onSubmit={addTag} className="cp-tag-form">
        <label htmlFor="cp-tag-select">Chọn nhãn có sẵn</label>
        {optionsLoading && <p role="status">Đang tải danh mục nhãn...</p>}
        {optionsError && <div className="cp-error" role="alert">{optionsError} <button type="button" className="cp-button cp-secondary" disabled={busy} onClick={() => setAttempt(value => value + 1)}>Tải lại danh mục</button></div>}
        <select id="cp-tag-select" value={selectedOption ? selected : ''} onChange={event => setSelected(event.target.value)} disabled={busy || optionsLoading || available.length === 0}>
          <option value="">-- Chọn nhãn --</option>
          {available.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
        {!optionsLoading && !optionsError && available.length === 0 && <p className="cp-muted">Không còn nhãn đang hoạt động để gắn thêm.</p>}
        <button className="cp-button" type="submit" disabled={busy || optionsLoading || !selectedOption}>{busy ? 'Đang cập nhật...' : 'Gắn nhãn'}</button>
      </form>}
    </>}
  </section>;
}
