import { ManagementClient } from 'auth0';
import dotenv from 'dotenv';

dotenv.config();

let managementClient: ManagementClient | null = null;

export async function getAuth0ManagementClient() {
  if (managementClient) {
    return managementClient;
  }

  managementClient = new ManagementClient({
    domain: process.env.AUTH0_DOMAIN || '',
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || '',
  });

  return managementClient;
} 