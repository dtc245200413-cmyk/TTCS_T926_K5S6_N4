import { API_BASE_URL } from '../config/api';
import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const CandidateAuthContext = createContext(null);
const API = `${API_BASE_URL}/candidate-portal`;

export const CandidateAuthProvider = ({ children }) => {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshCandidate = async () => {
    const token = localStorage.getItem('candidate_token');
    if (!token) {
      setCandidate(null);
      setLoading(false);
      return null;
    }
    try {
      const response = await axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
      setCandidate(response.data.data);
      return response.data.data;
    } catch (error) {
      localStorage.removeItem('candidate_token');
      setCandidate(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshCandidate(); }, []);

  const login = (token, candidateData) => {
    localStorage.setItem('candidate_token', token);
    setCandidate(candidateData);
  };

  const logout = () => {
    localStorage.removeItem('candidate_token');
    setCandidate(null);
  };

  return <CandidateAuthContext.Provider value={{ candidate, loading, login, logout, refreshCandidate }}>{children}</CandidateAuthContext.Provider>;
};