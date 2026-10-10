const fs = require('fs');
const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/departments/DepartmentList.jsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('{showForm && (') && lines[lines.indexOf(l) + 1].includes('<div'));
if (startIndex === -1) {
  console.log('start not found');
  process.exit(1);
}

let endIndex = -1;
for (let i = startIndex + 1; i < lines.length; i++) {
  if (lines[i].includes('{loading ? (')) {
    endIndex = i - 2;
    break;
  }
}

if (endIndex === -1) {
  console.log('end not found');
  process.exit(1);
}

const formLines = lines.slice(startIndex, endIndex + 1);

formLines[0] = '  const renderDepartmentForm = () => (';
formLines[formLines.length - 1] = '  );';

const replacementCall = '      {showForm && (!form.parent_department_id || editingDepartment) && renderDepartmentForm()}';

const beforeForm = lines.slice(0, startIndex);
const afterForm = lines.slice(endIndex + 1);
const newBottomLines = [...beforeForm, replacementCall, ...afterForm];

const renderTreeIndex = newBottomLines.findIndex(l => l.includes('const renderTree ='));
const topHalf = newBottomLines.slice(0, renderTreeIndex);
const bottomHalf = newBottomLines.slice(renderTreeIndex);

const linesWithFormDef = [...topHalf, ...formLines, '', ...bottomHalf];

const insertPoint = linesWithFormDef.findIndex(l => l.includes('{department.children?.length > 0 &&'));

const inlineCall = `        {showForm && !editingDepartment && String(form.parent_department_id) === String(department.department_id) && (
          <div style={{ marginLeft: \`\${(level + 1) * 38}px\`, marginBottom: '10px' }}>
            {renderDepartmentForm()}
          </div>
        )}`;

const finalLines = [
  ...linesWithFormDef.slice(0, insertPoint),
  inlineCall,
  ...linesWithFormDef.slice(insertPoint)
];

fs.writeFileSync(file, finalLines.join('\n'), 'utf8');
console.log('Success safely');
