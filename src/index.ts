import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import locationRoutes from './routes/locations';
import appointmentRoutes from './routes/appointments';
import availabilityRoutes from './routes/availability';
import serviceRoutes from './routes/services';
import employeeRoutes from './routes/employees';
import scheduleRoutes from './routes/schedules';
import tenantsRouter from './routes/admin/tenants';
import { checkJwt } from './middleware/auth';
import { resolveTenant, enforceTenantIsolation } from './middleware/tenant';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(resolveTenant);  // Add tenant resolution middleware
app.use(enforceTenantIsolation);  // Add tenant isolation middleware

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/locations', locationRoutes); // checkJwt middleware is applied in the route file
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', checkJwt, availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/schedules', scheduleRoutes);

// Admin routes
app.use('/api/admin/tenants', tenantsRouter);

// Add error handler for auth errors
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction): void => {
  if (err.name === 'UnauthorizedError') {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid token', message: err.message });
    return;
  }
  next(err);
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction): void => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 