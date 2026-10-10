const fs = require('fs');

const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/users/UserList.jsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r/g, '');

const replacements = [
  {
    old: `<div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>`,
    new: `<div className="g-page-header">`
  },
  {
    old: `<h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Quản Lý Nhân Sự</h1>`,
    new: `<h1 className="g-page-title">Quản Lý Nhân Sự</h1>`
  },
  {
    old: `<p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>Quản lý danh sách và quyền hạn của nhân viên</p>`,
    new: `<p className="g-page-subtitle">Quản lý danh sách và quyền hạn của nhân viên</p>`
  },
  {
    old: `<div style={{ background: '#ffffff', borderRadius: '20px', padding: '16px', marginBottom: '24px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>`,
    new: `<div className="g-card" style={{ padding: '16px' }}>`
  },
  {
    old: `style={{ background: '#f8fafc', padding: '12px 16px 12px 48px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', width: '100%' }}`,
    new: `className="g-form-input" style={{ paddingLeft: '48px' }}`
  },
  {
    old: `style={{ background: '#f8fafc', padding: '12px 16px', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.95rem', width: '100%' }}`,
    new: `className="g-form-input"`
  }
];

replacements.forEach(r => {
  content = content.split(r.old).join(r.new);
});
fs.writeFileSync(file, content, 'utf8');

const importFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/users/UserImport.jsx';
let contentImp = fs.readFileSync(importFile, 'utf8').replace(/\r/g, '');

const replacementsImp = [
  {
    old: `<div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>`,
    new: `<div className="g-page-header">`
  },
  {
    old: `<h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>Nhập Danh Sách Nhân Sự</h1>`,
    new: `<h1 className="g-page-title">Nhập Danh Sách Nhân Sự</h1>`
  },
  {
    old: `<p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>Thêm nhanh hàng loạt nhân viên từ file Excel</p>`,
    new: `<p className="g-page-subtitle">Thêm nhanh hàng loạt nhân viên từ file Excel</p>`
  }
];

replacementsImp.forEach(r => {
  contentImp = contentImp.split(r.old).join(r.new);
});
fs.writeFileSync(importFile, contentImp, 'utf8');

console.log('List and Import Refactored');
