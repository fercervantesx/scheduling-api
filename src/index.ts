import dotenv from 'dotenv';
import locationRoutes from './routes/locations';
import appointmentRoutes from './routes/appointments';
import availabilityRoutes from './routes/availability';
import serviceRoutes from './routes/services';
import employeeRoutes from './routes/employees';
import scheduleRoutes from './routes/schedules';
import { checkJwt } from './middleware/auth';
import app from './app'; // Import the app from app.ts

// Load environment variables
dotenv.config();

// Configure Express to recognize subdomains with localhost
app.set('subdomain offset', 1); // This is critical for localhost subdomains

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Routes - these are in addition to those in app.ts
app.use('/api/locations', locationRoutes); // checkJwt middleware is applied in the route file
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', checkJwt, availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/schedules', scheduleRoutes);

// Add error handler for auth errors
app.use((err: any, _req: any, res: any, next: any): void => {
  if (err.name === 'UnauthorizedError') {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid token', message: err.message });
    return;
  }
  next(err);
});

// Error handling middleware
app.use((err: any, _req: any, res: any, _next: any): void => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on 0.0.0.0:${port} (all interfaces)`);
}); 