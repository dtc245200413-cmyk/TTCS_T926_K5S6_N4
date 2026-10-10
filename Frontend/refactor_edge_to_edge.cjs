const fs = require('fs');

const globalCssFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/styles/global.css';
let cssContent = fs.readFileSync(globalCssFile, 'utf8');

// Make main wrapper and body white
cssContent = cssContent.replace(
  /background-color: #f8fafc;/g,
  'background-color: #ffffff;'
);
cssContent = cssContent.replace(
  /background-color: var\(--bg-light\);/g,
  'background-color: #ffffff;'
);
cssContent = cssContent.replace(
  /--bg-light: #f8fafc;/g,
  '--bg-light: #ffffff;'
);

// Flatten .g-card to edge-to-edge
cssContent = cssContent.replace(
  /\.g-card \{\s*background: #ffffff;\s*border-radius: 8px;\s*padding: 24px;\s*margin-bottom: 24px;\s*box-shadow: 0 1px 3px 0 rgba\(0, 0, 0, 0\.1\), 0 1px 2px -1px rgba\(0, 0, 0, 0\.1\);\s*border: 1px solid #e2e8f0;\s*\}/g,
  `.g-card {
  background: transparent;
  border-radius: 0;
  padding: 0;
  margin-bottom: 32px;
  box-shadow: none;
  border: none;
}`
);

// Fallback if the above exact match failed
cssContent = cssContent.replace(
  /border-radius: 8px;\s*padding: 24px;\s*margin-bottom: 24px;\s*box-shadow: 0 1px 3px 0 rgba\(0, 0, 0, 0\.1\), 0 1px 2px -1px rgba\(0, 0, 0, 0\.1\);\s*border: 1px solid #e2e8f0;/g,
  `border-radius: 0;
  padding: 0;
  margin-bottom: 32px;
  box-shadow: none;
  border: none;`
);

// Tweak main-content padding so text isn't directly on the screen edge
cssContent = cssContent.replace(
  /padding: 36px 24px;/g,
  'padding: 32px 40px;'
);

// Tweak main-header border to separate from white content
cssContent = cssContent.replace(
  /\.main-header \{\s*height: 76px;/g,
  `.main-header {
  height: 64px;`
);

fs.writeFileSync(globalCssFile, cssContent, 'utf8');

// Find remaining hardcoded #f8fafc and #f3f4f6 and remove them
cssContent = cssContent.replace(/background-color: #f3f4f6;/g, 'background-color: #ffffff;');
fs.writeFileSync(globalCssFile, cssContent, 'utf8');

console.log('Applied edge-to-edge UI');
