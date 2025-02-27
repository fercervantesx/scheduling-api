# Auth0 Tenant Automation Guide

This guide explains how the automated Auth0 setup works when creating new tenants in our scheduling API service.

## Overview

When a new tenant is created in the system, we automatically:

1. Create a tenant record in our database
2. Set up an Auth0 organization for the tenant
3. Configure callback URLs and branding
4. Create admin users and roles if specified

## Prerequisites

Ensure these environment variables are set in your `.env` file:

```
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-auth0-api-identifier
AUTH0_MANAGEMENT_CLIENT_ID=your-management-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-client-secret
AUTH0_DEFAULT_CONNECTION_ID=con_your_default_connection_id
```

## How It Works

### 1. Tenant Registration Flow

When a new tenant is created:

```
CREATE TENANT REQUEST
        │
        ▼
┌─────────────────┐
│ Create tenant   │
│ database record │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Auth0    │
│ Organization    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set up Auth0    │
│ callbacks & URLs│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create/invite   │
│ admin users     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update tenant   │
│ with Auth0 info │
└─────────────────┘
```

### 2. Key Components

#### `auth0-service.ts`

This service manages all Auth0-related operations:

- Creating Auth0 organizations
- Managing callback URLs
- Setting up branding
- Inviting users
- Creating tenant-specific roles

#### `tenant-registration.service.ts`

Handles the tenant creation process:

- Creates tenant records in the database
- Orchestrates Auth0 setup
- Manages rollback in case of errors
- Sets up admin users

## Using the System

### Creating a Tenant with Auth0 Integration

Creating a tenant through the API will automatically set up Auth0:

```bash
curl -X POST http://your-api/api/admin/tenants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Company Name",
    "subdomain": "companyname",
    "email": "admin@companyname.com",
    "plan": "BASIC",
    "status": "TRIAL"
  }'
```

### Auth0 Organizations

For each tenant, we create an Auth0 organization with:

- A unique name based on the tenant subdomain
- Connection to your default Auth0 database
- Tenant-specific metadata
- Custom branding if configured

## Auth0 Features Used

1. **Organizations**: To isolate tenant users
2. **Roles & Permissions**: To control tenant access
3. **Connections**: To manage user storage
4. **Management API**: To automate the setup

## Benefits of This Approach

1. **Simplified Onboarding**: New tenants are fully configured automatically
2. **Consistent Setup**: Every tenant follows the same configuration pattern
3. **Single Auth0 Tenant**: Works within the constraints of the free Auth0 plan
4. **Proper Isolation**: Uses Auth0 Organizations to keep tenant data separate

## How Users Experience Login

When a user logs in:

1. They visit a tenant-specific URL (`https://{subdomain}.yourdomain.com`)
2. The Auth0 login is customized with tenant branding
3. After authentication, they're redirected to the tenant application
4. Their organization membership determines which tenant they can access

## Mobile App Configuration

Mobile apps fetch tenant configuration via an API endpoint:

```
GET /api/config/{tenantId}
```

This returns:
- Tenant name and branding
- Auth0 configuration
- Callback URLs for the specific tenant

## Customizing the Process

To customize the Auth0 setup for specific tenants:

1. **Modify Branding**: Update the `updateOrganizationBranding` method
2. **Add Custom Roles**: Extend the `createTenantAdminRole` method
3. **Change Default Permissions**: Update the `getAdminPermissions` method

## Troubleshooting

Common issues and solutions:

1. **Auth0 API Errors**: Check management API credentials and scopes
2. **Missing Callbacks**: Verify `AUTH0_DEFAULT_CONNECTION_ID` is set correctly
3. **Tenant Creation Fails**: Check logs for specific Auth0 error messages
4. **User Invitation Issues**: Verify email service is configured correctly

## Maintenance

To keep your Auth0 setup healthy:

1. Regularly audit Auth0 organizations
2. Check for unused connections
3. Verify that deleted tenants have their Auth0 organizations removed
4. Monitor Auth0 rate limits if you have many tenants