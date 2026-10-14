import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBriefcase, FiExternalLink, FiMapPin } from 'react-icons/fi';

const API = 'http://localhost:3000/api';

const JobPostingPreview = () => {
  const { id } = useParams();
  const [posting, setPosting] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    Promise.all([
      axios.get(`${API}/job-postings/${id}/preview`, { headers }),
      axios.get(`${API}/company-profile`, { headers }).catch(() => null)
    ]).then(([postingResponse, companyResponse]) => {
      setPosting(postingResponse.data.data);
      setCompany(companyResponse?.data?.data || null);
    }).catch(requestError => {
      setError(requestError.response?.data?.message || 'Không thể tải bản xem trước.');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 24 }}>Đang tải bản xem trước...</div>;
  if (!posting) return <div role="alert" className="alert alert-error">{error || 'Không tìm thấy tin tuyển dụng.'}</div>;

  const imageUrl = company?.banner_url ? `http://localhost:3000${company.banner_url}` : '';
  const logoUrl = company?.logo_url ? `http://localhost:3000${company.logo_url}` : '';

  return (
    <div className="g-page-container" style={{ maxWidth: 1040, margin: '0 auto' }}>
      <header className="g-page-header">
        <div><h1 className="g-page-title">Xem trước tin tuyển dụng</h1><p className="g-page-subtitle">Giao diện này gần giống với cách tin hiển thị khi được xuất bản</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="g-btn-secondary" to={`/job-postings/${id}`}><FiArrowLeft /> Quay lại</Link>
          {posting.status === 'PUBLISHED' && <a className="g-btn-secondary" href={`/jobs?job=${posting.id}`} target="_blank" rel="noreferrer"><FiExternalLink /> Mở trang công khai</a>}
        </div>
      </header>

      <article className="g-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
        {imageUrl && <img src={imageUrl} alt="Ảnh bìa công ty" style={{ display: 'block', width: '100%', height: 180, objectFit: 'cover' }} />}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoUrl && <img src={logoUrl} alt="Logo công ty" style={{ width: 48, height: 48, objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: 6, padding: 4 }} />}
            <div><div style={{ color: '#64748b', fontSize: 12 }}>{posting.department_name || company?.name || 'TechCorp'}</div><h2 style={{ margin: '3px 0 0', color: '#0f172a', fontSize: 22 }}>{posting.title}</h2></div>
          </div>
          <span className="badge badge-info">Bản xem trước</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 13 }}>
          <span><FiBriefcase /> {posting.work_type_name || posting.job_type || 'Toàn thời gian'}</span>
          <span><FiMapPin /> {posting.location_name || posting.work_location || 'Linh hoạt'}</span>
          <strong style={{ color: '#2563eb' }}>{posting.salary_display || 'Thỏa thuận'}</strong>
          <span>Đăng ngày: {posting.published_at ? new Date(posting.published_at).toLocaleDateString('vi-VN') : 'Sau khi xuất bản'}</span>
          <span>Hạn nộp: {posting.deadline ? new Date(posting.deadline).toLocaleDateString('vi-VN') : 'Không giới hạn'}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px', gap: 20, padding: 20 }}>
          <div style={{ display: 'grid', gap: 18, lineHeight: 1.65 }}>
            <section><h3 style={{ margin: '0 0 7px', fontSize: 15 }}>Mô tả công việc</h3><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13 }}>{posting.description}</div></section>
            {posting.requirements && <section><h3 style={{ margin: '0 0 7px', fontSize: 15 }}>Yêu cầu ứng viên</h3><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13 }}>{posting.requirements}</div></section>}
            {posting.benefits && <section><h3 style={{ margin: '0 0 7px', fontSize: 15 }}>Quyền lợi</h3><div style={{ whiteSpace: 'pre-wrap', color: '#334155', fontSize: 13 }}>{posting.benefits}</div></section>}
          </div>
          <aside style={{ alignSelf: 'start', padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center' }}>
            <strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Ứng tuyển</strong>
            <button type="button" disabled style={{ width: '100%', padding: 9, border: 0, borderRadius: 5, color: '#fff', background: '#4f46e5', fontWeight: 700, opacity: .75, cursor: 'not-allowed' }}>Ứng tuyển ngay</button>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 11 }}>Nút được bật trên tin đã xuất bản.</p>
          </aside>
        </div>
      </article>
    </div>
  );
};

export default JobPostingPreview;