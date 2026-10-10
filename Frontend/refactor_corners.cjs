const fs = require('fs');
const globalCssFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/styles/global.css';
let cssContent = fs.readFileSync(globalCssFile, 'utf8');

cssContent = cssContent.replace(
  /border-radius: 16px;/g,
  'border-radius: 8px;'
);

cssContent = cssContent.replace(
  /border-radius: 12px;/g,
  'border-radius: 6px;'
);

cssContent = cssContent.replace(
  /box-shadow: 0 8px 24px rgba\(15, 23, 42, 0\.08\);/g,
  'box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);'
);

cssContent = cssContent.replace(
  /box-shadow: 0 4px 12px rgba\(79, 70, 229, 0\.25\);/g,
  'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);'
);

fs.writeFileSync(globalCssFile, cssContent, 'utf8');
console.log('Fixed rounded corners and shadows');
