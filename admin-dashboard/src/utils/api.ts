import axios from 'axios';

// Default to 'http://localhost:3005' in development (without /api)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

// For debugging API URL issues
console.log('API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    // Log token information
    const authHeader = config.headers.Authorization;
    console.log('API Request:', {
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method,
      hasAuthHeader: !!authHeader,
      authHeaderType: authHeader ? typeof authHeader : 'none',
      authHeaderStart: authHeader ? `${String(authHeader).substring(0, 20)}...` : 'none',
    });

    // Ensure Authorization header is a string
    if (authHeader && typeof authHeader !== 'string') {
      config.headers.Authorization = String(authHeader);
    }

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method,
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

export default api;