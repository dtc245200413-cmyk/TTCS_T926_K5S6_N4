const fs = require('fs');
const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/departments/DepartmentList.jsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '{showForm && (\\n        <div\\n          style={{\\n            background: \\'#fff\\',';
const formStart = content.indexOf(startStr);
const endStr = '</form>\\n        </div>\\n      )}';
const formEnd = content.indexOf(endStr) + endStr.length;

if (formStart === -1 || formEnd === -1) {
  console.log('Could not find form block');
  console.log('formStart:', formStart, 'formEnd:', formEnd);
  process.exit(1);
}

const formBlock = content.substring(formStart, formEnd);

let innerJSX = formBlock.replace('{showForm && (\\n', '  const renderDepartmentForm = () => (\\n');
innerJSX = innerJSX.substring(0, innerJSX.lastIndexOf(')}')) + ');\\n';

const returnIndex = content.indexOf('  return (\\n    <div\\n      style={{');
content = content.substring(0, returnIndex) + innerJSX + '\\n' + content.substring(returnIndex);

const replacementCall = '{showForm && (!form.parent_department_id || editingDepartment) && renderDepartmentForm()}';
content = content.replace(formBlock, replacementCall);

const insertPoint = content.indexOf('{department.children?.length > 0 &&');
if (insertPoint === -1) {
  console.log('Could not find renderTree insert point');
  process.exit(1);
}

const inlineCall = `        {showForm && !editingDepartment && String(form.parent_department_id) === String(department.department_id) && (
          <div style={{ marginLeft: \\\`\\\${(level + 1) * 38}px\\\`, marginBottom: '10px' }}>
            {renderDepartmentForm()}
          </div>
        )}

        `;

content = content.substring(0, insertPoint) + inlineCall + content.substring(insertPoint);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully refactored DepartmentList.jsx');
