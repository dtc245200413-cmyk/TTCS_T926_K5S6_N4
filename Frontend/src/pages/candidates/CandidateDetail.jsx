import React, { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import candidateProfileApi from '../../api/candidateProfileApi';
import CandidateTagsPanel from '../../components/candidates/CandidateTagsPanel';
import CandidateNotesPanel from '../../components/candidates/CandidateNotesPanel';
import { candidateProfileAccess, profileError } from '../../utils/candidateProfile';
import '../../styles/candidate-profile.css';

const statuses = { NEW: 'Mới', INTERVIEWING: 'Phỏng vấn', OFFERED: 'Đề nghị (Offer)', HIRED: 'Đã tuyển', REJECTED: 'Đánh trượt' };

function ProfileContent({ id, canManage }) {
  const [candidate, setCandidate] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSourceError('');
    setCandidate(null);
    setBlocked(false);
    candidateProfileApi.getCandidate(id, controller.signal).then(data => {
      if (!controller.signal.aborted) setCandidate(data);
    }).catch(err => {
      if (controller.signal.aborted) return;
      setError(profileError(err, 'Không thể tải thông tin ứng viên. Vui lòng thử lại.'));
      setBlocked([403, 404].includes(err.response?.status));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    candidateProfileApi.getSources(controller.signal).then(response => {
      if (!controller.signal.aborted) setSources(Array.isArray(response.data.data) ? response.data.data : []);
    }).catch(err => {
      if (!controller.signal.aborted) setSourceError(profileError(err, 'Không thể tải tên nguồn ứng viên. Đang hiển thị mã nguồn.'));
    });
    return () => controller.abort();
  }, [id, attempt]);

  return (
    <div className="candidate-profile">
      <header className="cp-card cp-header">
        <div><h1 className="g-page-title">Hồ sơ ứng viên</h1><p className="g-page-subtitle">Thông tin, nhãn và ghi chú nội bộ</p></div>
        <Link className="cp-button cp-secondary" to="/candidates">Quay lại danh sách</Link>
      </header>
      <section className="cp-card" aria-label="Thông tin ứng viên" aria-busy={loading}>
        {loading && <p role="status">Đang tải hồ sơ...</p>}
        {error && <div className="cp-error" role="alert">{error} <button className="cp-button cp-secondary" onClick={() => setAttempt(value => value + 1)}>Thử lại</button></div>}
        {candidate && <>
          <h2>{candidate.full_name}</h2>
          <dl className="cp-details">
            <div><dt>Email</dt><dd>{candidate.email || 'Chưa có'}</dd></div>
            <div><dt>Số điện thoại</dt><dd>{candidate.phone || 'Chưa có'}</dd></div>
            <div><dt>Trạng thái</dt><dd>{statuses[candidate.status] || candidate.status || 'Chưa có'}</dd></div>
            <div><dt>Nguồn ứng viên</dt><dd>{sources.find(source => source.code === candidate.source_code)?.name || candidate.source_code || 'Chưa có'}</dd></div>
          </dl>
          {sourceError && <p className="cp-error" role="alert">{sourceError}</p>}
        </>}
      </section>
      {!blocked && <div className="cp-panels">
        <CandidateTagsPanel candidateId={id} canManage={canManage} />
        <CandidateNotesPanel candidateId={id} canManage={canManage} />
      </div>}
    </div>
  );
}

export default function CandidateDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const { canView, canManage } = candidateProfileAccess(user);
  if (!canView) return <div className="candidate-profile"><div className="cp-card cp-error" role="alert">Bạn không có quyền truy cập hồ sơ nội bộ.</div></div>;
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    return <div className="candidate-profile"><div className="cp-card" role="alert">Không tìm thấy ứng viên</div></div>;
  }
  // Remount on identity/role/ID changes so data or in-flight writes cannot leak between profiles.
  const identity = `${id}:${user.user_id}:${user.roles.map(role => role.role_code).sort().join(',')}`;
  return <ProfileContent key={identity} id={id} canManage={canManage} />;
}
