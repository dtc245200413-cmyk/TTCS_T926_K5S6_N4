const fs = require('fs');

const globalCssFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/styles/global.css';
let cssContent = fs.readFileSync(globalCssFile, 'utf8');

cssContent = cssContent.replace(
  /box-shadow: 4px 0 25px rgba\(0, 0, 0, 0\.1\);/g,
  'box-shadow: none;\n  border-right: 1px solid #1e293b;'
);

cssContent = cssContent.replace(
  /background: rgba\(79, 70, 229, 0\.15\);/g,
  'background: rgba(37, 99, 235, 0.15);'
);

cssContent = cssContent.replace(
  /box-shadow: inset 3px 0 0 #4f46e5;/g,
  'box-shadow: inset 3px 0 0 var(--primary-color);'
);

// Tweak main header to look sharper
cssContent = cssContent.replace(
  /box-shadow: 0 4px 6px -1px rgba\(0, 0, 0, 0\.02\);/g,
  'box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);'
);

// Reduce padding in nav links slightly for tighter density
cssContent = cssContent.replace(
  /padding: 14px 24px;/g,
  'padding: 10px 16px;\n  font-size: 0.9rem;'
);

fs.writeFileSync(globalCssFile, cssContent, 'utf8');

// Update font in index.html if it hasn't been updated
const indexHtmlFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/index.html';
if (fs.existsSync(indexHtmlFile)) {
  let html = fs.readFileSync(indexHtmlFile, 'utf8');
  html = html.replace(/Plus\+Jakarta\+Sans/g, 'Inter');
  fs.writeFileSync(indexHtmlFile, html, 'utf8');
}

console.log('Sidebar and nav tuned for enterprise realism.');
