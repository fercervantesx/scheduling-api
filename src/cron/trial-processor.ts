import cron from 'node-cron';
import { TrialManagementService } from '../services/trial-management';

// Run at midnight every day
cron.schedule('0 0 * * *', async () => {
  console.log('Running trial processor...');
  
  try {
    await TrialManagementService.processTrials();
    console.log('Trial processing completed successfully');
  } catch (error) {
    console.error('Error processing trials:', error);
  }
}); 