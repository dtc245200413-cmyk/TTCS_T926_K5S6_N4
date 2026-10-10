const fs = require('fs');
const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/styles/global.css';

const newCss = `
/* GLOBAL STANDARD COMPONENTS (V2) */
.g-page-container {
  padding: 0;
  width: 100%;
}

.g-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.g-page-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-dark, #0f172a);
  letter-spacing: -0.5px;
  margin: 0;
}

.g-page-subtitle {
  color: var(--text-light, #64748b);
  margin: 4px 0 0 0;
  font-size: 0.95rem;
}

.g-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2e8f0;
}

.g-card-title {
  font-size: 1.25rem;
  color: #1e293b;
  margin-bottom: 24px;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 12px;
  font-weight: 700;
}

.g-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 768px) {
  .g-form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.g-form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #334155;
  font-size: 0.95rem;
}

.g-form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 0.2s;
  background-color: #f8fafc;
  color: #1e293b;
}

.g-form-input:focus {
  outline: none;
  border-color: var(--primary-color, #4f46e5);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  background-color: #ffffff;
}

.g-btn-primary {
  background-color: var(--primary-color, #4f46e5);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  text-decoration: none;
}
.g-btn-primary:hover {
  background-color: var(--primary-hover, #4338ca);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
}

.g-btn-secondary {
  background-color: #ffffff;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
}
.g-btn-secondary:hover {
  background-color: #f8fafc;
  color: #0f172a;
  border-color: #94a3b8;
}
`;

let content = fs.readFileSync(file, 'utf8');
if (!content.includes('.g-page-container')) {
  fs.appendFileSync(file, newCss);
  console.log('Appended standard CSS');
} else {
  console.log('Already exists');
}
