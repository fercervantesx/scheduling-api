import express from 'express';
import cors from 'cors';
import tenantsRouter from './routes/admin/tenants';
import { resolveTenant, enforceTenantIsolation } from './middleware/tenant';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(resolveTenant);
app.use(enforceTenantIsolation);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Admin routes - use standalone configuration for these routes
app.use('/api/admin/tenants', tenantsRouter);

// Generic error handlers will be added in index.ts

export default app; 