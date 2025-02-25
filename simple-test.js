// Simple standalone test script to verify tenant_id query parameter functionality
const express = require('express');
const app = express();
const PORT = 3333;

// Debug middleware to print all request info
app.use((req, res, next) => {
  console.log('\nRequest received:', {
    url: req.url,
    query: req.query,
    headers: req.headers,
    hostname: req.hostname
  });
  next();
});

// Middleware to simulate tenant resolution
app.use((req, res, next) => {
  // First check for query parameter tenant_id (highest priority)
  const queryTenantId = req.query.tenant_id;
  
  if (queryTenantId) {
    console.log('✅ Found tenant ID from query parameter:', queryTenantId);
    req.tenant = { id: queryTenantId, source: 'query' };
    next();
    return;
  }
  
  // Next check for X-Tenant-ID header
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId) {
    console.log('✅ Found tenant ID from header:', headerTenantId);
    req.tenant = { id: headerTenantId, source: 'header' };
    next();
    return;
  }
  
  // Fall back to hostname based resolution
  const hostname = req.hostname;
  console.log('🔍 Using hostname for tenant resolution:', hostname);
  
  // For plain localhost without subdomain, use a default tenant
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🔍 Using default tenant for plain localhost');
    req.tenant = { id: 'default', source: 'default' };
  } else {
    // Try to extract subdomain
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'www') {
      const subdomain = parts[0];
      console.log('🔍 Extracted subdomain:', subdomain);
      req.tenant = { id: subdomain, source: 'subdomain' };
    } else {
      console.log('❌ No tenant information found');
      req.tenant = { id: 'unknown', source: 'fallback' };
    }
  }
  
  next();
});

// Test endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    tenant: req.tenant
  });
});

app.get('/raw-debug', (req, res) => {
  res.json({
    query: req.query,
    headers: req.headers,
    hostname: req.hostname,
    url: req.url
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('\nTry these test commands:');
  console.log(`1. curl "http://localhost:${PORT}/health?tenant_id=demo"`);
  console.log(`2. curl -H "X-Tenant-ID: header-test" "http://localhost:${PORT}/health"`);
  console.log(`3. curl "http://localhost:${PORT}/health"`);
});