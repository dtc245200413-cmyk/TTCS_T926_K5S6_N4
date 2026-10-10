const fs = require('fs');
const glob = require('glob'); // Not available by default, I'll use simple fs readdir

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(dir + '/' + file);
    if (stat.isDirectory()) {
      findFiles(dir + '/' + file, fileList);
    } else if (file.endsWith('.jsx')) {
      fileList.push(dir + '/' + file);
    }
  }
  return fileList;
}

const allFiles = findFiles('e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages');

let count = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  let original = content;

  // Replace common header inline styles with global classes
  content = content.replace(/<div className="page-header" style=\{\{.*?\}\}>/g, '<div className="g-page-header">');
  content = content.replace(/<h1 style=\{\{.*?\}\}>/g, '<h1 className="g-page-title">');
  content = content.replace(/<p style=\{\{.*?\}\}>/g, '<p className="g-page-subtitle">');
  
  // Replace big card backgrounds
  content = content.replace(/<div style=\{\{\s*background:\s*'#ffffff',\s*borderRadius:\s*'20px',\s*padding:\s*'16px',\s*marginBottom:\s*'24px',\s*boxShadow:\s*'0 10px 30px -10px rgba\(0,0,0,0\.05\)',\s*border:\s*'1px solid #e2e8f0'\s*\}\}>/g, '<div className="g-card" style={{ padding: "16px" }}>');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
}

console.log('Refactored ' + count + ' files.');
