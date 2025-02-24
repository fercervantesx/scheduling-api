import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import locationRoutes from './routes/locations';
import appointmentRoutes from './routes/appointments';
import availabilityRoutes from './routes/availability';
import serviceRoutes from './routes/services';
import employeeRoutes from './routes/employees';
import scheduleRoutes from './routes/schedules';
import { checkJwt } from './middleware/auth';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/locations', locationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/availability', checkJwt, availabilityRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/schedules', scheduleRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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