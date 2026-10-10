const fs = require('fs');

const homeFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/Home.jsx';
let content = fs.readFileSync(homeFile, 'utf8');

// Remove max-width constraints on the page wrapper
content = content.replace(
  /<div style=\{\{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' \}\}>/g,
  '<div className="g-page-container">'
);

// Replace main card inline style with g-card
content = content.replace(
  /<div style=\{\{\s*background: '#fff',\s*borderRadius: '16px',\s*border: '1px solid #e2e8f0',\s*padding: '32px',\s*marginBottom: '32px',\s*boxShadow: '0 4px 15px rgba\(0,0,0,0\.02\)',\s*\}\}>/g,
  '<div className="g-card">'
);

// Remove border-radius on utility cards
content = content.replace(
  /borderRadius: '12px'/g,
  "borderRadius: '0'"
);

// Update avatar circle to match new primary color if needed, but the avatar is a circle so we keep its radius 50%
content = content.replace(
  /background: '#4f46e5'/g,
  "background: 'var(--primary-color)'"
);

fs.writeFileSync(homeFile, content, 'utf8');
console.log('Refactored Home.jsx for edge-to-edge');
