const fs = require('fs');

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

  // Replace primary button links
  content = content.replace(/className="btn-primary" style=\{\{.*?\}\}/g, 'className="g-btn-primary"');
  
  // Replace secondary button links
  content = content.replace(/className="btn-secondary" style=\{\{.*?\}\}/g, 'className="g-btn-secondary"');

  // Replace manual <button className="btn-primary" style={{...}}>
  content = content.replace(/<button([^>]*)className="btn-primary"([^>]*)style=\{\{.*?\}\}([^>]*)>/g, '<button$1className="g-btn-primary"$2$3>');
  
  // Replace manual <button className="btn-secondary" style={{...}}>
  content = content.replace(/<button([^>]*)className="btn-secondary"([^>]*)style=\{\{.*?\}\}([^>]*)>/g, '<button$1className="g-btn-secondary"$2$3>');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
}

console.log('Refactored buttons in ' + count + ' files.');
