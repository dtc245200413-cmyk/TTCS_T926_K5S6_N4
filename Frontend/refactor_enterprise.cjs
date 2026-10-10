const fs = require('fs');

// 1. global.css fixes
const globalCssFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/styles/global.css';
let cssContent = fs.readFileSync(globalCssFile, 'utf8');

// Change font to Inter
cssContent = cssContent.replace(/Plus\+Jakarta\+Sans/g, 'Inter');
cssContent = cssContent.replace(/'Plus Jakarta Sans'/g, "'Inter'");

// Tweak .g-card
cssContent = cssContent.replace(/box-shadow: 0 1px 3px 0 rgba\(0, 0, 0, 0\.1\), 0 1px 2px -1px rgba\(0, 0, 0, 0\.1\);/g, 'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);');

// Tweak page title
cssContent = cssContent.replace(/font-size: 1\.8rem;/g, 'font-size: 1.5rem;');

// Tweak button primary
cssContent = cssContent.replace(/padding: 10px 20px;/g, 'padding: 8px 16px;\n  font-size: 0.875rem;');
// Remove translateY on hover
cssContent = cssContent.replace(/transform: translateY\(-1px\);/g, '');

// Tweak form inputs
cssContent = cssContent.replace(/padding: 12px 16px;/g, 'padding: 8px 12px;\n  font-size: 0.875rem;');

fs.writeFileSync(globalCssFile, cssContent, 'utf8');

// 2. Remove gradients from all JSX files
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
allFiles.push('e:/he-thong-tuyen-dung-noi-bo/frontend/src/components/layout/Header.jsx');

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Remove radial gradients
  content = content.replace(/backgroundImage:\s*'radial-gradient.*?'/g, "backgroundColor: '#f8fafc'");
  content = content.replace(/background:\s*'radial-gradient.*?'/g, "background: '#f8fafc'");

  // Replace button linear gradients with solid primary color
  content = content.replace(/background:\s*'linear-gradient\(135deg,\s*(#[a-f0-9]+)\s*0%,\s*#[a-f0-9]+\s*100%\)'/g, "backgroundColor: '$1'");
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log('Enterprise realism applied.');
