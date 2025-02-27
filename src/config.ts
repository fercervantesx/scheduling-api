export type ConfigType = typeof config;

export const config = {
  auth0: {
    domain: process.env.AUTH0_DOMAIN || '',
    audience: process.env.AUTH0_AUDIENCE || '',
    managementClientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID || '',
    managementClientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || '',
    defaultConnectionId: process.env.AUTH0_DEFAULT_CONNECTION_ID || '',
  },
}

export default config;