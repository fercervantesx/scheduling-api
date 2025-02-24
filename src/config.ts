export const config = {
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    audience: process.env.AUTH0_AUDIENCE || '',
    managementClientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID || '',
    managementClientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || '',
  },
} 