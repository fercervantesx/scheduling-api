# Next.js Migration Plan: Deployment with Vercel

## 1. Prepare for Vercel Deployment

### Update `next.config.js` with Production Settings

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', process.env.VERCEL_URL, 'your-production-domain.com'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

### Create a `.env.production` File

```
# Database connection
DATABASE_URL=postgresql://user:password@your-production-db.com:5432/scheduling_db?schema=public
REDIS_URL=redis://your-production-redis.com:6379

# Auth
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-secret-here

# Auth0
AUTH0_CLIENT_ID=your-production-auth0-client-id
AUTH0_CLIENT_SECRET=your-production-auth0-client-secret
AUTH0_ISSUER=https://your-production-auth0-domain.com

# Email
RESEND_API_KEY=your-production-resend-api-key
EMAIL_FROM=noreply@your-production-domain.com

# Vercel
VERCEL_URL=your-production-domain.com
```

### Create Vercel Configuration Files

Create a `vercel.json` file:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "devCommand": "npm run dev",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/trial-processor",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## 2. Set Up Database Infrastructure

### Option 1: Using Vercel Postgres

1. Install Vercel Postgres SDK:

```bash
npm install @vercel/postgres
```

2. Update `src/lib/prisma.ts` to support Vercel Postgres:

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
```

### Option 2: Using External PostgreSQL Provider (e.g., Supabase, Railway, etc.)

1. Create PostgreSQL database in your chosen provider
2. Update `DATABASE_URL` environment variable in Vercel project settings
3. Apply schema migrations

## 3. Set Up Redis for Caching

1. Set up Redis instance using Upstash or another Redis provider
2. Add the `REDIS_URL` environment variable to Vercel project settings

## 4. Create Cron Job Endpoint

Create `src/app/api/cron/trial-processor/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check for correct authorization
    const authHeader = request.headers.get('authorization');
    
    if (process.env.NODE_ENV === 'production' && 
        (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const today = new Date();
    
    // Find tenants whose trial ends today
    const expiringTrials = await prisma.tenant.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: {
          lte: today,
        },
      },
    });
    
    // Process each expiring trial
    for (const tenant of expiringTrials) {
      // Update tenant status to 'SUSPENDED'
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'SUSPENDED' },
      });
      
      // Send notification email if email is available
      if (tenant.email) {
        await sendEmail({
          to: tenant.email,
          subject: 'Your trial period has expired',
          template: 'trial-expiration',
          data: {
            tenantName: tenant.name,
            trialEndDate: tenant.trialEndsAt?.toLocaleDateString(),
          },
        });
      }
    }
    
    return NextResponse.json({
      processed: expiringTrials.length,
      status: 'success',
    });
  } catch (error) {
    console.error('Error processing trials:', error);
    
    return NextResponse.json(
      { error: 'Failed to process trials' },
      { status: 500 }
    );
  }
}
```

## 5. Auth0 Configuration

1. Set up Auth0 application and API
   - Create a new application in Auth0 dashboard
   - Configure callback URLs and allowed origins for your production domain
   - Set up API with appropriate scopes

2. Add Auth0 environment variables to Vercel project settings:
   - `AUTH0_CLIENT_ID`
   - `AUTH0_CLIENT_SECRET`
   - `AUTH0_ISSUER`

## 6. Configure Email with Resend

1. Set up Resend account and obtain API key
2. Add Resend environment variables to Vercel project settings:
   - `RESEND_API_KEY`
   - `EMAIL_FROM`

## 7. GitHub Integration and CI/CD Setup

1. Connect your GitHub repository to Vercel
2. Configure automatic deployments for:
   - Preview deployments for pull requests
   - Production deployments for the main branch

```yaml
# Example GitHub Actions workflow file (.github/workflows/vercel-preview.yml)
name: Vercel Preview Deployment
on:
  pull_request:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
          scope: ${{ secrets.VERCEL_SCOPE }}
```

## 8. Domain and DNS Configuration

1. In Vercel project settings, go to "Domains"
2. Add your primary and custom domains
3. Configure DNS settings according to Vercel's instructions

## 9. Multi-Tenant Domain Strategy

Create a middleware to handle tenant subdomains:

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  
  // Skip for API routes, Next.js internals, or static files
  if (url.pathname.startsWith('/_next') || 
      url.pathname.startsWith('/api') || 
      url.pathname.match(/\.(jpg|png|svg|ico|json)$/)) {
    return NextResponse.next();
  }
  
  // Handle admin dashboard
  if (hostname.startsWith('admin.')) {
    // If requesting the root, redirect to dashboard
    if (url.pathname === '/') {
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  
  // Handle tenant-specific domains
  if (hostname !== 'your-main-domain.com' && !hostname.includes('localhost')) {
    // Let the tenant context middleware handle this in the API
    return NextResponse.next();
  }
  
  // On main domain, redirect to marketing site or login
  if (url.pathname === '/') {
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

// Specify which paths this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next (Next.js internals)
     * 2. /_static (static files)
     * 3. /_vercel (Vercel internals)
     * 4. /favicon.ico, /sitemap.xml (SEO files)
     */
    '/((?!_next|_static|_vercel|favicon.ico|sitemap.xml).*)',
  ],
};
```

## 10. Monitoring and Analytics

### Set Up Error Monitoring with Sentry

1. Install Sentry SDK:

```bash
npm install @sentry/nextjs
```

2. Configure Sentry in your Next.js app:

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// sentry.server.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

3. Add Sentry DSN to Vercel environment variables

### Set Up Analytics

Use Vercel Analytics by adding the script to your layout:

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## 11. Deploy to Vercel

1. Push your changes to GitHub
2. Deploy your application using Vercel CLI or GitHub integration:

```bash
vercel --prod
```

3. Verify deployments and inspect logs in Vercel dashboard

## 12. Post-Deployment Steps

1. Run database migrations:

```bash
npx prisma migrate deploy
```

2. Seed initial data if necessary:

```bash
npx prisma db seed
```

3. Test application functionality, especially:
   - Authentication and user management
   - Multi-tenant isolation
   - Cron jobs and background processes
   - Email functionality