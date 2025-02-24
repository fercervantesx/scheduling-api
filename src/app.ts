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

// Admin routes
app.use('/api/admin/tenants', tenantsRouter);

export default app; 