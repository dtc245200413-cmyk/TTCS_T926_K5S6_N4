const fs = require('fs');

const file = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/services/positionService.js';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/Frontend Developer \(Junior\)/g, 'Lập trình viên Frontend (Junior)');
  content = content.replace(/Senior Frontend Developer/g, 'Lập trình viên Senior Frontend');
  content = content.replace(/Backend Developer \(Middle\)/g, 'Lập trình viên Backend (Middle)');
  content = content.replace(/Quality Assurance Lead/g, 'Trưởng nhóm Kiểm thử (QA Lead)');
  fs.writeFileSync(file, content, 'utf8');
}
