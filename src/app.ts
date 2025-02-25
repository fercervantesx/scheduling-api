import express from 'express';
import cors from 'cors';
import tenantsRouter from './routes/admin/tenants';
import { resolveTenant, enforceTenantIsolation } from './middleware/tenant';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug endpoint that doesn't require tenant resolution
app.get('/raw-debug', (req, res) => {
  res.json({
    headers: req.headers,
    hostname: req.hostname,
    subdomains: req.subdomains,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    query: req.query
  });
});

// Apply tenant resolution after raw debug endpoint
app.use(resolveTenant);
app.use(enforceTenantIsolation);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    tenant: req.tenant ? {
      id: req.tenant.id,
      name: req.tenant.name,
      subdomain: req.tenant.subdomain
    } : 'No tenant resolved',
    debug: {
      hostname: req.hostname,
      originalUrl: req.originalUrl,
      headers: req.headers,
      protocol: req.protocol,
      subdomains: req.subdomains
    }
  });
});

// Debug endpoint for tenant information
app.get('/debug-tenant', (req, res) => {
  res.json({
    tenant: req.tenant || null,
    hostname: req.hostname,
    subdomains: req.subdomains,
    headers: {
      'x-tenant-id': req.headers['x-tenant-id'],
      host: req.headers['host']
    }
  });
});

// Admin routes - register them with both patterns for flexibility
app.use('/api/admin/tenants', tenantsRouter);
// Also register without /api prefix for direct access
app.use('/admin/tenants', tenantsRouter);

// Generic error handlers will be added in index.ts

export default app; 