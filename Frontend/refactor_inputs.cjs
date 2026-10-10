const fs = require('fs');

function refactorFile(file) {
  let content = fs.readFileSync(file, 'utf8').replace(/\r/g, '');

  content = content.replace(/style=\{\{\s*fontWeight:\s*'600',\s*color:\s*'#334155',\s*fontSize:\s*'0\.95rem'\s*\}\}/g, 'className="g-form-label"');
  
  // input style replacement
  content = content.replace(/style=\{\{\s*padding:\s*'12px 16px',\s*borderRadius:\s*'8px',\s*border:\s*'1px solid #cbd5e1',\s*outline:\s*'none',\s*background:\s*'#f8fafc',\s*color:\s*'#1e293b',\s*transition:\s*'all 0\.2s'(?:,\s*\.\.\.customStyle)?\s*\}\}/g, 'className="g-form-input"');
  content = content.replace(/style=\{\{\s*\.\.\.inputStyle,\s*paddingRight:\s*'45px'\s*\}\}/g, 'className="g-form-input" style={{ paddingRight: "45px" }}');
  content = content.replace(/style=\{inputStyle\}/g, 'className="g-form-input"');
  content = content.replace(/style=\{labelStyle\}/g, 'className="g-form-label"');
  
  fs.writeFileSync(file, content, 'utf8');
}

['UserEdit.jsx', 'UserList.jsx', 'UserImport.jsx'].forEach(f => {
  try {
    refactorFile('e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/users/' + f);
    console.log('Refactored ' + f);
  } catch (e) {
    console.log('Error refactoring ' + f + ': ' + e.message);
  }
});
