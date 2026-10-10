const fs = require('fs');

// Fix global.css color
const globalCssFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/styles/global.css';
let cssContent = fs.readFileSync(globalCssFile, 'utf8');
cssContent = cssContent.replace(/#4f46e5/g, '#2563eb');
cssContent = cssContent.replace(/#4338ca/g, '#1d4ed8');
fs.writeFileSync(globalCssFile, cssContent, 'utf8');

// Fix UserList.jsx emojis
const userListFile = 'e:/he-thong-tuyen-dung-noi-bo/frontend/src/pages/users/UserList.jsx';
let userListContent = fs.readFileSync(userListFile, 'utf8');

if (!userListContent.includes('FiDownload')) {
  userListContent = userListContent.replace(/import \{ FiUserPlus, FiUpload, FiRefreshCcw, FiSearch, FiEdit2, FiTrash2 \} from 'react-icons\/fi';/, 
    "import { FiUserPlus, FiUpload, FiRefreshCcw, FiSearch, FiEdit2, FiTrash2, FiDownload, FiInfo } from 'react-icons/fi';");
  
  if (!userListContent.includes('FiDownload')) {
    userListContent = userListContent.replace(/import \{.*?\} from 'react-icons\/fi';/, 
      "import { FiUserPlus, FiUpload, FiRefreshCcw, FiSearch, FiEdit2, FiTrash2, FiDownload, FiInfo } from 'react-icons/fi';");
  }
}

userListContent = userListContent.replace(/<span style=\{\{ fontSize: '1\.2rem', fontWeight: 'bold' \}\}>📥<\/span>/g, '<FiDownload style={{ fontSize: "1.2rem" }}/>');
userListContent = userListContent.replace(/<span style=\{\{ fontSize: '1\.2rem', fontWeight: 'bold' \}\}>\+<\/span>/g, '<FiUserPlus style={{ fontSize: "1.2rem" }}/>');
userListContent = userListContent.replace(/<span style=\{\{ position: 'absolute'.*?\}\}>🔍<\/span>/g, '<FiSearch style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "1.1rem" }}/>');
userListContent = userListContent.replace(/<div style=\{\{ fontSize: '3rem', marginBottom: '10px' \}\}>🔍<\/div>/g, '<FiInfo style={{ fontSize: "3rem", marginBottom: "10px", color: "#cbd5e1" }}/>');

fs.writeFileSync(userListFile, userListContent, 'utf8');

console.log('Fixed AI aesthetics');
