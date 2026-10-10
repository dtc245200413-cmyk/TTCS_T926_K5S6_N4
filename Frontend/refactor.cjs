const fs = require('fs');
const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/departments/DepartmentList.jsx';
let content = fs.readFileSync(file, 'utf8').replace(/\r/g, '');

const start = content.indexOf('{showForm && (\n        <div');
const end = content.indexOf('      )}\n\n      {loading ? (');

if (start === -1 || end === -1) {
  console.log('Bounds not found');
  process.exit(1);
}

let formJSX = content.substring(start, end);

formJSX = formJSX.replace('{showForm && (\n', '  const renderDepartmentForm = () => (\n');
formJSX = formJSX.substring(0, formJSX.lastIndexOf(')}')) + ');';

content = content.substring(0, start) + '{showForm && (!form.parent_department_id || editingDepartment) && renderDepartmentForm()}' + content.substring(end);

const renderTreeIndex = content.indexOf('  const renderTree =');
content = content.substring(0, renderTreeIndex) + formJSX + '\n\n' + content.substring(renderTreeIndex);

const insertPoint = content.indexOf('{department.children?.length > 0 &&');
const inlineCall = `        {showForm && !editingDepartment && String(form.parent_department_id) === String(department.department_id) && (
          <div style={{ marginLeft: \`\${(level + 1) * 38}px\`, marginBottom: '10px' }}>
            {renderDepartmentForm()}
          </div>
        )}\n\n`;

content = content.substring(0, insertPoint) + inlineCall + content.substring(insertPoint);

fs.writeFileSync(file, content, 'utf8');
console.log('Success');
