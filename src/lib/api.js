import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const saasApi = {
  getPlans: async () => {
    const res = await apiClient.get('/saas/plans');
    return res.data;
  },

  getConfigCatalog: async () => {
    const res = await apiClient.get('/saas/config-catalog');
    return res.data;
  },

  checkTrialEligibility: async (params) => {
    const res = await apiClient.get('/saas/trial-eligibility', { params });
    return res.data;
  },

  getCountries: async () => {
    const res = await apiClient.get('/saas/locations/countries');
    return res.data;
  },

  getStates: async (countryId) => {
    const res = await apiClient.get(`/saas/locations/states/${countryId}`);
    return res.data;
  },

  getCities: async (stateId) => {
    const res = await apiClient.get(`/saas/locations/cities/${stateId}`);
    return res.data;
  },

  getGenders: async () => {
    const res = await apiClient.get('/saas/genders');
    return res.data;
  },

  createOrder: async (data) => {
    const res = await apiClient.post('/saas/create-order', data);
    return res.data;
  },

  validateCoupon: async (code, amount) => {
    const res = await apiClient.post('/saas/validate-coupon', { code, amount });
    return res.data;
  },

  registerSchool: async (payload) => {
    const res = await apiClient.post('/saas/register', payload);
    return res.data;
  },
};

export default saasApi;
