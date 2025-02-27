# Multi-Tenant Auth0 Setup Guide

This guide explains how to configure Auth0 for a multi-tenant application while using a single Auth0 tenant (free plan).

## Overview

Our architecture uses:
- Single Auth0 tenant
- Multiple business tenants in our application
- Customized mobile apps and web dashboards for each tenant
- Tenant-specific authentication flows

## Auth0 Setup

### 1. Create Auth0 Applications

Create three Auth0 applications:

1. **Web Application** (Admin Dashboard)
   - Name: "Scheduling API Admin Dashboard"
   - Type: Regular Web Application

2. **iOS Application**
   - Name: "Scheduling API iOS Client"
   - Type: Native

3. **Android Application**
   - Name: "Scheduling API Android Client" 
   - Type: Native

### 2. Configure Callback URLs

For each application, configure wildcard callback URLs:

**Web Dashboard**:
```
https://*.yourdomain.com/callback
https://*.yourdomain.com/silent-callback
```

**iOS**:
```
schedulingapp://callback/*
com.yourcompany.scheduling://callback/*
```

**Android**:
```
schedulingapp://callback/*
com.yourcompany.scheduling://callback/*
```

### 3. Configure Logout URLs

Similar to callback URLs, add wildcard logout URLs:

**Web Dashboard**:
```
https://*.yourdomain.com/logout
```

**iOS/Android**:
```
schedulingapp://logout/*
com.yourcompany.scheduling://logout/*
```

## Implementation

### Backend Implementation

#### 1. Tenant-User Association

Create a database table to associate Auth0 users with tenants:

```sql
CREATE TABLE user_tenants (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,  -- Auth0 user ID
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);
```

#### 2. Tenant Resolution Middleware

```javascript
// middleware/tenant.js
async function resolveTenant(req, res, next) {
  let tenantId;
  
  // Check explicit tenant ID in header
  if (req.headers['x-tenant-id']) {
    tenantId = req.headers['x-tenant-id'];
  } 
  // Extract from hostname
  else if (req.hostname) {
    const subdomain = req.hostname.split('.')[0];
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain }
    });
    if (tenant) tenantId = tenant.id;
  }
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant not specified' });
  }
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });
  
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  
  req.tenant = tenant;
  next();
}
```

#### 3. User-Tenant Authorization

```javascript
// middleware/auth.js
async function validateTenantAccess(req, res, next) {
  const userId = req.auth.sub; // From Auth0 JWT
  const tenantId = req.tenant.id;
  
  const userTenant = await prisma.userTenant.findFirst({
    where: {
      userId,
      tenantId
    }
  });
  
  if (!userTenant) {
    return res.status(403).json({ error: 'Not authorized for this tenant' });
  }
  
  req.userRole = userTenant.role;
  next();
}
```

#### 4. Tenant-Specific Configuration Endpoint

```javascript
// routes/config.js
router.get('/api/config/:tenantId', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.tenantId }
  });
  
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  
  res.json({
    name: tenant.name,
    logo: tenant.branding?.logoUrl,
    colors: tenant.branding?.colors,
    auth0: {
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      audience: process.env.AUTH0_AUDIENCE,
      redirectUri: `schedulingapp://callback/${tenant.subdomain}`
    }
  });
});
```

### Mobile App Implementation (iOS - Swift)

#### 1. Fetch Tenant Config

```swift
func fetchTenantConfig(tenantId: String) {
    let url = URL(string: "https://api.yourdomain.com/api/config/\(tenantId)")!
    
    URLSession.shared.dataTask(with: url) { data, response, error in
        guard let data = data else { return }
        
        do {
            let config = try JSONDecoder().decode(TenantConfig.self, from: data)
            DispatchQueue.main.async {
                self.applyTenantConfig(config)
            }
        } catch {
            print("Error decoding config: \(error)")
        }
    }.resume()
}

func applyTenantConfig(_ config: TenantConfig) {
    // Apply branding
    self.title = config.name
    self.logoImageView.image = UIImage(url: config.logo)
    self.view.backgroundColor = UIColor(hex: config.colors.primary)
    
    // Store Auth0 config
    self.auth0Config = config.auth0
}
```

#### 2. Auth0 Login with Tenant Context

```swift
func login() {
    guard let config = self.auth0Config else { return }
    
    // Include tenant in state parameter
    let state = ["tenantId": self.tenantId].jsonString
    
    Auth0
        .webAuth()
        .domain(config.domain)
        .clientId(config.clientId)
        .audience(config.audience)
        .redirectUri(config.redirectUri)
        .scope("openid profile email")
        .parameters(["state": state])
        .start { result in
            switch result {
            case .success(let credentials):
                self.handleLoginSuccess(credentials)
            case .failure(let error):
                self.handleLoginError(error)
            }
        }
}
```

#### 3. API Request with Tenant Context

```swift
func makeAPIRequest(endpoint: String, method: String = "GET", body: [String: Any]? = nil) {
    guard let credentials = self.credentials else { return }
    
    var request = URLRequest(url: URL(string: "https://api.yourdomain.com\(endpoint)")!)
    request.httpMethod = method
    
    // Include tenant ID in header
    request.addValue(self.tenantId, forHTTPHeaderField: "X-Tenant-ID")
    request.addValue("Bearer \(credentials.accessToken)", forHTTPHeaderField: "Authorization")
    
    if let body = body {
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    }
    
    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }.resume()
}
```

### Web Admin Dashboard Implementation (React)

#### 1. Auth0 Configuration

```javascript
// auth0-config.js
import { useEffect, useState } from 'react';

export const useAuth0Config = (tenantSubdomain) => {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    const domain = process.env.REACT_APP_AUTH0_DOMAIN;
    const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
    const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
    
    // Construct tenant-specific redirect URI
    const redirectUri = `https://${tenantSubdomain}.yourdomain.com/callback`;
    
    setConfig({
      domain,
      clientId,
      audience,
      redirectUri,
      scope: 'openid profile email',
    });
  }, [tenantSubdomain]);
  
  return config;
};
```

#### 2. Auth0 Provider Setup

```jsx
// App.js
import { Auth0Provider } from '@auth0/auth0-react';
import { useAuth0Config } from './auth0-config';

function App() {
  // Extract subdomain from hostname
  const subdomain = window.location.hostname.split('.')[0];
  const auth0Config = useAuth0Config(subdomain);
  
  if (!auth0Config) return <div>Loading...</div>;
  
  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: auth0Config.redirectUri,
        audience: auth0Config.audience,
        scope: auth0Config.scope,
      }}
    >
      <Router>
        {/* Application routes */}
      </Router>
    </Auth0Provider>
  );
}
```

#### 3. API Client with Tenant Context

```javascript
// api-client.js
import { useAuth0 } from '@auth0/auth0-react';

export const useApiClient = () => {
  const { getAccessTokenSilently } = useAuth0();
  const subdomain = window.location.hostname.split('.')[0];
  
  const callApi = async (endpoint, options = {}) => {
    try {
      const token = await getAccessTokenSilently();
      
      const defaultOptions = {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-ID': subdomain,
          'Content-Type': 'application/json'
        }
      };
      
      const response = await fetch(
        `https://api.yourdomain.com${endpoint}`,
        {
          ...defaultOptions,
          ...options,
          headers: {
            ...defaultOptions.headers,
            ...options.headers
          }
        }
      );
      
      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };
  
  return { callApi };
};
```

## User Management

### 1. Creating Users for Tenants

```javascript
// services/user-management.js
async function createUserForTenant(email, role, tenantId) {
  // 1. Create user in Auth0 (or invite existing user)
  const auth0Management = new ManagementClient({
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
    clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET
  });
  
  let auth0User;
  
  try {
    // Check if user exists in Auth0
    const existingUsers = await auth0Management.getUsersByEmail(email);
    
    if (existingUsers && existingUsers.length > 0) {
      auth0User = existingUsers[0];
    } else {
      // Create new user
      auth0User = await auth0Management.createUser({
        email: email,
        connection: 'Username-Password-Authentication',
        password: generateRandomPassword(), // Or send passwordless link
        email_verified: false
      });
    }
    
    // 2. Associate user with tenant in our database
    await prisma.userTenant.create({
      data: {
        userId: auth0User.user_id,
        tenantId: tenantId,
        role: role
      }
    });
    
    // 3. Send welcome email with tenant-specific link
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    
    await sendWelcomeEmail(
      email, 
      tenant.name, 
      `https://${tenant.subdomain}.yourdomain.com`
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}
```

### 2. Removing Users from Tenants

```javascript
async function removeUserFromTenant(userId, tenantId) {
  // Remove association in database
  await prisma.userTenant.deleteMany({
    where: {
      userId: userId,
      tenantId: tenantId
    }
  });
  
  // Check if user has any other tenant associations
  const remainingAssociations = await prisma.userTenant.findMany({
    where: {
      userId: userId
    }
  });
  
  // Optionally remove from Auth0 if no more associations
  if (remainingAssociations.length === 0) {
    const auth0Management = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID,
      clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET
    });
    
    await auth0Management.deleteUser({ id: userId });
  }
  
  return { success: true };
}
```

## Best Practices

1. **Security**:
   - Validate tenant access on every API request
   - Use tenant isolation at database level with Row Level Security
   - Never expose Auth0 credentials in client-side code

2. **Performance**:
   - Cache tenant configuration when possible
   - Use token refresh strategies to minimize re-authentication

3. **UX Considerations**:
   - Brand the Auth0 login page for each tenant
   - Use tenant-specific colors in Auth0 Universal Login (requires Auth0 customization)

4. **Error Handling**:
   - Provide clear error messages for tenant access issues
   - Implement proper logging for authentication failures

## Troubleshooting

### Common Issues

1. **Callback URL Mismatch**
   - Ensure all tenant-specific redirects are covered by your wildcard patterns
   - Check Auth0 logs for redirect errors

2. **Token Validation Failures**
   - Verify audience and scope settings match between Auth0 and API
   - Check JWT expiration times

3. **Tenant Access Denied**
   - Verify user-tenant association exists in database
   - Check role permissions for the tenant

4. **Auth0 Rate Limiting**
   - Implement caching strategies
   - Use refresh tokens appropriately