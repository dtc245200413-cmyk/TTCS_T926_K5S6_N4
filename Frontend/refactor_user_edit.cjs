const fs = require('fs');
const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/users/UserEdit.jsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r/g, '');

const replacements = [
  {
    old: `<div style={{ width: '100%', paddingBottom: '40px' }}>`,
    new: `<div className="g-page-container">`
  },
  {
    old: `<div style={{ 
        background: '#fff', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0',
        padding: '32px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
        marginBottom: '32px'
      }}>`,
    new: `<div className="g-card">`
  },
  {
    old: `<div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 4px 0', color: '#0f172a', fontWeight: '700' }}>
            {isSelfEdit ? 'Hồ Sơ Cá Nhân' : 'Chỉnh Sửa Nhân Sự'}
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            {isSelfEdit ? 'Cập nhật thông tin liên lạc và chức danh hiển thị của bạn.' : \`Đang chỉnh sửa hồ sơ của: \${originalUser.full_name}\`}
          </p>
        </div>`,
    new: `<div className="g-page-header">
          <div>
            <h1 className="g-page-title">
              {isSelfEdit ? 'Hồ Sơ Cá Nhân' : 'Chỉnh Sửa Nhân Sự'}
            </h1>
            <p className="g-page-subtitle">
              {isSelfEdit ? 'Cập nhật thông tin liên lạc và chức danh hiển thị của bạn.' : \`Đang chỉnh sửa hồ sơ của: \${originalUser.full_name}\`}
            </p>
          </div>
        </div>`
  },
  {
    old: `<h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>Thông tin hệ thống</h2>`,
    new: `<h2 className="g-card-title">Thông tin hệ thống</h2>`
  },
  {
    old: `<h2 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>Thông tin cập nhật</h2>`,
    new: `<h2 className="g-card-title">Thông tin cập nhật</h2>`
  },
  {
    old: `labelStyle = { fontWeight: '600', color: '#334155', fontSize: '0.95rem' };`,
    new: `/* using className g-form-label */`
  },
  {
    old: `style={labelStyle}`,
    new: `className="g-form-label"`
  },
  {
    old: `style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#1e293b', transition: 'all 0.2s', ...customStyle }}`,
    new: `className="g-form-input" style={customStyle}`
  },
  {
    old: `<button type="submit" disabled={isSubmitting} style={{
              background: isSubmitting ? '#94a3b8' : '#4f46e5',
              color: 'white', border: 'none', padding: '14px 28px', borderRadius: '10px',
              fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: '0.2s'
            }}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>`,
    new: `<button type="submit" disabled={isSubmitting} className="g-btn-primary" style={isSubmitting ? {background: '#94a3b8', cursor: 'not-allowed'} : {}}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>`
  },
  {
    old: `<Link to={backLink} style={{
              background: '#fff', color: '#475569', border: '1px solid #cbd5e1',
              padding: '14px 28px', borderRadius: '10px', fontWeight: '600',
              textDecoration: 'none', transition: '0.2s'
            }}>
              {backLabel}
            </Link>`,
    new: `<Link to={backLink} className="g-btn-secondary">
              {backLabel}
            </Link>`
  }
];

let changed = false;
replacements.forEach(r => {
  if (content.includes(r.old)) {
    content = content.replace(new RegExp(r.old.replace(/[.*+?^$\{key\}()|[\\]\\\\]/g, '\\\\$&'), 'g'), r.new);
    changed = true;
  }
});

// Since global replace for string might fail if spaces don't match exactly, we can also use string replace:
replacements.forEach(r => {
  content = content.split(r.old).join(r.new);
});

fs.writeFileSync(file, content, 'utf8');
console.log('UserEdit Refactored');
