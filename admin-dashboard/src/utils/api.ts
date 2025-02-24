import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
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

export default api; 