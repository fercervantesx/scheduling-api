import axios from 'axios';

// Default to 'http://localhost:3005' in development (without /api)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

// For debugging API URL issues
console.log('API URL:', API_URL);

// Check if a specific tenant ID is set in localStorage (for manual override)
const storedTenantId = localStorage.getItem('currentTenantId');

// Get URL search params for tenant selection
const urlParams = new URLSearchParams(window.location.search);
const tenantParam = urlParams.get('tenant');

// If tenant param exists, store it for future use
if (tenantParam) {
  localStorage.setItem('currentTenantId', tenantParam);
  console.log(`Setting tenant ID from URL param: ${tenantParam}`);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    // If we have a tenant param or stored tenant ID, add it to default headers
    ...(tenantParam || storedTenantId ? { 'X-Tenant-ID': tenantParam || storedTenantId } : {}),
  },
});

// Add request interceptor for logging and tenant header handling
api.interceptors.request.use(
  (config) => {
    // Log token information
    const authHeader = config.headers.Authorization;
    
    // Check existing X-Tenant-ID header
    const existingTenantId = config.headers['X-Tenant-ID'];
    if (existingTenantId) {
      console.log(`📝 Using existing tenant header: ${existingTenantId}`);
      return config;
    }
    
    // Get tenant from URL param
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) {
      config.headers['X-Tenant-ID'] = tenantParam;
      console.log(`📝 Setting tenant header from URL parameter: ${tenantParam}`);
      return config;
    }
    
    // Get stored tenant from localStorage
    const storedTenantId = localStorage.getItem('currentTenantId');
    if (storedTenantId) {
      config.headers['X-Tenant-ID'] = storedTenantId;
      console.log(`📝 Setting tenant header from localStorage: ${storedTenantId}`);
      return config;
    }
    
    // Extract tenant from hostname as a fallback
    const hostname = window.location.hostname;
    let tenantId = null;
    
    // Extract subdomain (everything before the first dot)
    const parts = hostname.split('.');
    
    // Check if this is a localhost with a subdomain (e.g., itinaritravel.localhost)
    if (parts.length > 1) {
      if (parts[parts.length-1] === 'localhost' || parts[parts.length-1] === '127.0.0.1') {
        // For localhost with subdomain, use the first part
        if (parts[0] !== 'www' && parts[0] !== 'admin') {
          tenantId = parts[0];
        }
      } else if (parts[0] !== 'www' && parts[0] !== 'admin') {
        // For regular domain with subdomain
        tenantId = parts[0];
      }
      
      if (tenantId) {
        // Add tenant header to all requests
        config.headers['X-Tenant-ID'] = tenantId;
        console.log(`📝 Setting tenant header from subdomain: ${tenantId}`);
      }
    }
    
    console.log('API Request:', {
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      method: config.method,
      hostname: hostname,
      tenant: tenantId,
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