import axios from 'axios';

/**
 * Retrieves the API base URL strictly from NEXT_PUBLIC_API_BASE_URL.
 * Does not use fallback data or hardcoded URLs.
 * Throws an explicit error if the required environment variable is missing.
 */
export const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!envUrl || !envUrl.trim()) {
    throw new Error(
      'Missing required environment variable: NEXT_PUBLIC_API_BASE_URL is not defined in .env. Please configure NEXT_PUBLIC_API_BASE_URL in your .env file.'
    );
  }

  return envUrl.trim().replace(/\/+$/, '');
};

/**
 * Retrieves the server base URL derived strictly from NEXT_PUBLIC_API_BASE_URL.
 */
export const getServerBaseUrl = () => {
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api\/?$/, '');
};

let initialBaseUrl = '';
try {
  initialBaseUrl = getApiBaseUrl();
} catch (_) {
  // At build or initialization, interceptor enforces presence before each request
}

const apiClient = axios.create({
  baseURL: initialBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

export const saasApi = {
  getFooterSetting: async () => {
    const res = await apiClient.get('/saas/footer');
    return res.data;
  },

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

  sendRegistrationOtp: async (payload) => {
    const res = await apiClient.post('/saas/send-registration-otp', payload);
    return res.data;
  },

  verifyRegistrationOtp: async (payload) => {
    const res = await apiClient.post('/saas/verify-registration-otp', payload);
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
