import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CompanyProfile = () => {
  const [profile, setProfile] = useState({ name: '', description: '', website: '', logo_url: '', banner_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3000/api/company-profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setProfile(res.data.data);
        }
      } catch (err) {
        console.error('Lỗi tải hồ sơ công ty', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('description', profile.description);
      formData.append('website', profile.website);
      if (logoFile) formData.append('logo', logoFile);
      if (bannerFile) formData.append('banner', bannerFile);

      const res = await axios.put('http://localhost:3000/api/company-profile', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        alert('Đã lưu thành công!');
        setProfile(res.data.data);
        setLogoFile(null);
        setBannerFile(null);
        setPreviewMode(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi lưu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '24px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;

  const renderEditMode = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#e0e7ff', padding: '6px', borderRadius: '8px', color: '#4f46e5' }}>🏢</span> Tên công ty
          </label>
          <input 
            type="text" 
            value={profile.name} 
            onChange={e => setProfile({...profile, name: e.target.value})}
            style={{ padding: '10px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '500', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            placeholder="Nhập tên công ty..."
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: '#e0e7ff', padding: '6px', borderRadius: '8px', color: '#4f46e5' }}>🌐</span> Website
          </label>
          <input 
            type="text" 
            value={profile.website} 
            onChange={e => setProfile({...profile, website: e.target.value})}
            style={{ padding: '10px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '500', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
            onFocus={e => e.target.style.borderColor = '#4f46e5'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            placeholder="https://techcorp.com"
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ background: '#e0e7ff', padding: '6px', borderRadius: '8px', color: '#4f46e5' }}>📝</span> Mô tả công ty (Bài giới thiệu)
        </label>
        <textarea 
          value={profile.description} 
          onChange={e => setProfile({...profile, description: e.target.value})}
          style={{ padding: '12px 16px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none', minHeight: '100px', fontFamily: 'inherit', transition: 'all 0.2s', backgroundColor: '#f8fafc', color: '#0f172a', lineHeight: '1.5', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}
          onFocus={e => e.target.style.borderColor = '#4f46e5'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          placeholder="Viết lời giới thiệu hấp dẫn về công ty của bạn để thu hút ứng viên..."
        />
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ background: '#e0e7ff', padding: '4px', borderRadius: '6px', color: '#4f46e5', fontSize: '0.9rem' }}>🎨</span> Logo công ty
          </label>
          <label style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
                 onMouseOver={e => e.currentTarget.style.borderColor = '#4f46e5'}
                 onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
            <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            {profile.logo_url && !logoFile && <img src={`http://localhost:3000${profile.logo_url}`} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', background: 'white', padding: '10px', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />}
            {logoFile ? (
              <div style={{ textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
                <div style={{ fontSize: '2rem', marginBottom: '4px' }}>✅</div>
                <span style={{ color: '#059669', fontWeight: '700', fontSize: '0.95rem' }}>{logoFile.name}</span>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                {!profile.logo_url && <div style={{ fontSize: '2rem', marginBottom: '4px', color: '#94a3b8' }}>🖼️</div>}
                <div style={{ padding: '6px 16px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '20px', fontWeight: '700', fontSize: '0.9rem' }}>Tải ảnh lên</div>
              </div>
            )}
          </label>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ background: '#e0e7ff', padding: '4px', borderRadius: '6px', color: '#4f46e5', fontSize: '0.9rem' }}>🖼️</span> Ảnh bìa (Banner)
          </label>
          <label style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
                 onMouseOver={e => e.currentTarget.style.borderColor = '#4f46e5'}
                 onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}>
            <input type="file" accept="image/*" onChange={e => setBannerFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            {profile.banner_url && !bannerFile && <img src={`http://localhost:3000${profile.banner_url}`} alt="Banner" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />}
            {bannerFile ? (
              <div style={{ textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
                <div style={{ fontSize: '2rem', marginBottom: '4px' }}>✅</div>
                <span style={{ color: '#059669', fontWeight: '700', fontSize: '0.95rem' }}>{bannerFile.name}</span>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                {!profile.banner_url && <div style={{ fontSize: '2rem', marginBottom: '4px', color: '#94a3b8' }}>🏞️</div>}
                <div style={{ padding: '6px 16px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '20px', fontWeight: '700', fontSize: '0.9rem' }}>Tải ảnh bìa</div>
              </div>
            )}
          </label>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );

  const renderPreviewMode = () => {
    const previewBannerUrl = bannerFile ? URL.createObjectURL(bannerFile) : (profile.banner_url ? `http://localhost:3000${profile.banner_url}` : null);
    const previewLogoUrl = logoFile ? URL.createObjectURL(logoFile) : (profile.logo_url ? `http://localhost:3000${profile.logo_url}` : null);

    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', background: 'white', position: 'relative' }}>
        {/* Banner */}
        <div style={{ height: '250px', width: '100%', backgroundColor: '#cbd5e1', backgroundImage: previewBannerUrl ? `url(${previewBannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}></div>
        </div>
        
        {/* Content */}
        <div style={{ padding: '0 40px 40px', position: 'relative' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', marginTop: '-50px', marginBottom: '30px' }}>
            <div style={{ width: '120px', height: '120px', backgroundColor: 'white', borderRadius: '24px', padding: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewLogoUrl ? 
                <img src={previewLogoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> :
                <div style={{ fontSize: '3rem', color: '#94a3b8' }}>🏢</div>
              }
            </div>
            <div style={{ paddingBottom: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px' }}>{profile.name || 'Tên công ty'}</h1>
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', textDecoration: 'none', fontWeight: '600', marginTop: '4px' }}>
                  🌐 {profile.website}
                </a>
              )}
            </div>
          </div>
          
          {/* Description */}
          <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '800' }}>Về chúng tôi</h2>
            <div style={{ color: '#475569', lineHeight: '1.8', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
              {profile.description || 'Chưa có thông tin giới thiệu.'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f7fb', minHeight: 'calc(100vh - 80px)', backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '16px 24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Cấu hình Trang Công Ty</h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Thiết kế trang giới thiệu để thu hút ứng viên tài năng.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setPreviewMode(!previewMode)}
              style={{ background: previewMode ? '#f1f5f9' : 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: previewMode ? '#475569' : '#4f46e5', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s', boxShadow: previewMode ? 'none' : '0 4px 6px rgba(79, 70, 229, 0.1)', transform: 'translateY(0)' }}
              onMouseOver={e => !previewMode && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={e => !previewMode && (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {previewMode ? '✏️ Quay lại Chỉnh sửa' : '👁️ Xem trước Giao diện'}
            </button>
            {!previewMode && (
              <button 
                onClick={handleSave}
                disabled={saving}
                style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', padding: '12px 30px', borderRadius: '12px', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 15px rgba(15, 23, 42, 0.25)', transition: 'all 0.3s', transform: 'translateY(0)' }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(15, 23, 42, 0.3)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(15, 23, 42, 0.25)'; }}
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
              </button>
            )}
          </div>
        </div>

        <div style={{ background: previewMode ? 'transparent' : 'white', padding: previewMode ? '0' : '24px', borderRadius: '16px', boxShadow: previewMode ? 'none' : '0 10px 25px rgba(0,0,0,0.03)' }}>
          {previewMode ? renderPreviewMode() : renderEditMode()}
        </div>

      </div>
    </div>
  );
};

export default CompanyProfile;
