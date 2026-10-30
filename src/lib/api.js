import axios from 'axios';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

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

  checkTrialEligibility: async (payload) => {
    const res = await apiClient.post('/saas/check-trial-eligibility', payload);
    return res.data;
  },

  checkAvailability: async (payload) => {
    const res = await apiClient.post('/saas/check-availability', payload);
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

  createOrder: async (payload) => {
    const res = await apiClient.post('/saas/create-order', payload);
    return res.data;
  },

  validateCoupon: async (codeOrPayload, amount, options = {}) => {
    const body =
      typeof codeOrPayload === 'object' && codeOrPayload !== null
        ? codeOrPayload
        : {
            code: codeOrPayload,
            amount,
            ...(options.planAmount !== undefined ? { plan_amount: options.planAmount } : {}),
            ...(options.storageAmount !== undefined ? { storage_amount: options.storageAmount } : {}),
            ...(options.email ? { email: options.email } : {}),
            ...(options.phone ? { phone: options.phone } : {}),
          };
    const res = await apiClient.post('/saas/validate-coupon', body);
    return res.data;
  },

  removeCoupon: async (codeOrPayload) => {
    const body =
      typeof codeOrPayload === 'object' && codeOrPayload !== null
        ? codeOrPayload
        : { code: codeOrPayload };
    const res = await apiClient.post('/saas/remove-coupon', body);
    return res.data;
  },

  registerSchool: async (payload) => {
    const res = await apiClient.post('/saas/register-school', payload);
    return res.data;
  },

  recordPaymentFailure: async (payload) => {
    const res = await apiClient.post('/saas/record-payment-failure', payload);
    return res.data;
  },

  getOrderDetails: async (orderNo) => {
    const res = await apiClient.get(`/saas/orders/${encodeURIComponent(orderNo)}`);
    return res.data;
  },
};

export default saasApi;
