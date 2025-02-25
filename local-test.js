// Test script to manually verify the tenant query parameter works
const express = require('express');
const app = express();

// Middleware to simulate tenant resolution
app.use((req, res, next) => {
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);
  
  // First try query parameter
  const tenantId = req.query.tenant_id;
  if (tenantId) {
    console.log('Found tenant ID from query parameter:', tenantId);
    req.tenant = { id: tenantId, source: 'query' };
    next();
    return;
  }
  
  // Next try header
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId) {
    console.log('Found tenant ID from header:', headerTenantId);
    req.tenant = { id: headerTenantId, source: 'header' };
    next();
    return;
  }
  
  console.log('No tenant ID found');
  req.tenant = { id: 'default', source: 'default' };
  next();
});

// Test endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    tenant: req.tenant
  });
});

// Start server
const PORT = 3333;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Try the following tests:');
  console.log('1. curl http://localhost:3333/health');
  console.log('2. curl http://localhost:3333/health?tenant_id=test123');
  console.log('3. curl -H "X-Tenant-ID: header123" http://localhost:3333/health');
});