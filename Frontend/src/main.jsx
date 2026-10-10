import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// Force clear local storage mock data to apply translation
localStorage.removeItem('hr_positions_data');
localStorage.removeItem('hr_departments_data');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
