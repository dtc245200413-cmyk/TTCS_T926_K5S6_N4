import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="error-page">
      <h1>403</h1>
      <p>You do not have permission to access this function.</p>
      <Link to="/" className="btn-secondary">Return to Dashboard</Link>
    </div>
  );
};

export default Unauthorized;
