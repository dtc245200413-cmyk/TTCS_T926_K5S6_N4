/**
 * offerApi.js
 * API client cho quản lý và phê duyệt Thư mời nhận việc (Offer)
 */

import axiosClient from './axiosClient';

const offerApi = {
  getOffers: (params) => axiosClient.get('/offers', { params }),
  getOfferById: (id) => axiosClient.get(`/offers/${id}`),
  approveOffer: (id, data) => axiosClient.post(`/offers/${id}/approve`, data),
  rejectOffer: (id, data) => axiosClient.post(`/offers/${id}/reject`, data),
  requestChangeOffer: (id, data) => axiosClient.post(`/offers/${id}/request-change`, data),
  publishOffer: (id) => axiosClient.post(`/offers/${id}/publish`),
  getOnboardings: () => axiosClient.get('/offers/onboardings')
};

export default offerApi;
