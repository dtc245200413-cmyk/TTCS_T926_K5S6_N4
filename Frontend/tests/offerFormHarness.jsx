// Isolated test entry. Never imported by App.jsx or included in the Vite build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../src/context/AuthContext';
import OfferForm from '../src/pages/offers/OfferForm';
import offerApi from '../src/api/offerApi';

const fixture = window.__offerFixture;
// This is a proposed VIEW model, not a mocked, supposedly-existing HTTP route.
// Production getCreationOptions remains unavailable until Backend has a contract.
const api = fixture.creationOptions ? {
  ...offerApi,
  getCreationOptions: async () => fixture.creationOptions,
} : offerApi;
createRoot(document.getElementById('root')).render(
  <AuthContext.Provider value={{ user: fixture.user }}>
    <BrowserRouter>
      <Routes>
        <Route path="/offers/new" element={<OfferForm api={api} />} />
        <Route path="/offers/:id/edit" element={<OfferForm api={api} />} />
        <Route path="/login" element={<p>Vui lòng đăng nhập lại.</p>} />
        <Route path="/offers" element={<p>Danh sách Offer</p>} />
      </Routes>
    </BrowserRouter>
  </AuthContext.Provider>
);
