// Isolated test entry. Never imported by App.jsx or included in the Vite build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../src/context/AuthContext';
import OfferForm from '../src/pages/offers/OfferForm';

const fixture = window.__offerFixture;
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: fixture.user }}>
    <BrowserRouter>
      <Routes>
        <Route path="/offers/new" element={<OfferForm />} />
        <Route path="/offers/:id/edit" element={<OfferForm />} />
        <Route path="/login" element={<p>Vui lòng đăng nhập lại.</p>} />
        <Route path="/offers" element={<p>Danh sách Offer</p>} />
      </Routes>
    </BrowserRouter>
  </AuthContext.Provider>
);
