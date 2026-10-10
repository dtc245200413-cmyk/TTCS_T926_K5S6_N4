const fs = require('fs');
const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/departments/DepartmentList.jsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r/g, '');

content = content.replace(
  '  const [showForm, setShowForm] = useState(false);',
  '  const [showForm, setShowForm] = useState(false);\n  const [isFormExpanded, setIsFormExpanded] = useState(true);'
);

content = content.replace(
  '    setEditingDepartment(null);\n    setShowForm(false);\n  };',
  '    setEditingDepartment(null);\n    setShowForm(false);\n    setIsFormExpanded(true);\n  };'
);

content = content.replace(
  /    setError\(''\);\n    setSuccess\(''\);\n    setShowForm\(true\);\n  };/g,
  "    setError('');\n    setSuccess('');\n    setShowForm(true);\n    setIsFormExpanded(true);\n  };"
);

const oldHeader = `          <h2
            style={{
              marginTop: 0,
              marginBottom: '18px',
              color: '#0f172a',
            }}
          >
            {editingDepartment
              ? 'Sửa Phòng Ban'
              : 'Thêm Phòng Ban'}
          </h2>

          <form onSubmit={handleSubmit}>`;

const newHeader = `          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isFormExpanded ? '18px' : '0' }}>
            <h2 style={{ margin: 0, color: '#0f172a' }}>
              {editingDepartment ? 'Sửa Phòng Ban' : 'Thêm Phòng Ban'}
            </h2>
            <button
              type="button"
              onClick={() => setIsFormExpanded(!isFormExpanded)}
              style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '0.85rem', color: '#475569',
                padding: '6px 10px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {isFormExpanded ? '▲ Thu gọn' : '▼ Mở rộng'}
            </button>
          </div>

          {isFormExpanded && (
            <form onSubmit={handleSubmit}>`;

content = content.replace(oldHeader, newHeader);

const oldFooter = `              <button
                type="button"
                onClick={resetForm}
                style={buttonGray}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
  );`;

const newFooter = `              <button
                type="button"
                onClick={resetForm}
                style={buttonGray}
              >
                Hủy
              </button>
            </div>
          </form>
          )}
        </div>
  );`;

content = content.replace(oldFooter, newFooter);

fs.writeFileSync(file, content, 'utf8');
console.log('Success toggle');
