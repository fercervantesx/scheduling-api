import express from 'express';
import cors from 'cors';
import path from 'path';
import tenantsRouter from './routes/admin/tenants';
import tenantRouter from './routes/tenant';
import { resolveTenant, enforceTenantIsolation } from './middleware/tenant';
import { PLANS } from './config/tenant-plans';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

// Tenant plan endpoint
app.get('/api/tenant/plan', (req, res) => {
  if (!req.tenant) {
    return res.status(400).json({ error: 'Tenant context required' });
  }

  // Get plan configuration details
  const planConfig = PLANS[req.tenant.plan as keyof typeof PLANS];
  if (!planConfig) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  // Create feature list from plan configuration
  const features = Object.entries(planConfig.features)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);

  // Add quota-based features
  if (planConfig.quotas.locations > 1 || planConfig.quotas.locations === -1) {
    features.push('Multiple Locations');
  }
  if (planConfig.quotas.employees > 5 || planConfig.quotas.employees === -1) {
    features.push('Extended Team Management');
  }

  return res.json({
    plan: req.tenant.plan,
    status: req.tenant.status,
    trialEndsAt: req.tenant.trialEndsAt,
    features
  });
});

// Admin routes - register them with both patterns for flexibility
app.use('/api/admin/tenants', tenantsRouter);
// Also register without /api prefix for direct access
app.use('/admin/tenants', tenantsRouter);

// Tenant routes
app.use('/api/tenant', tenantRouter);

// Generic error handlers will be added in index.ts

export default app; 