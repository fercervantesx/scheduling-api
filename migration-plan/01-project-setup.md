# Next.js Migration Plan: Project Setup

## 1. Initialize Next.js Project

```bash
npx create-next-app@latest scheduling-next --typescript --eslint --tailwind --app --src-dir
cd scheduling-next
```

## 2. Install Core Dependencies

```bash
npm install @prisma/client zod date-fns ioredis next-auth jose
npm install @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query
npm install resend multer node-cron
npm install -D prisma typescript @types/node
```

## 3. Copy and Set Up Prisma

```bash
cp ../scheduling-api/prisma/schema.prisma ./prisma/
npx prisma generate
```

## 4. Configure NextAuth.js

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth, { AuthOptions } from "next-auth";
import Auth0Provider from "next-auth/providers/auth0";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Auth0Provider({
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      issuer: process.env.AUTH0_ISSUER!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      // Add tenant info to session
      if (token.sub) {
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          include: { tenant: true },
        });
        
        if (user?.tenant) {
          session.user.tenantId = user.tenant.id;
          session.user.tenant = {
            id: user.tenant.id,
            name: user.tenant.name,
            subdomain: user.tenant.subdomain,
            plan: user.tenant.plan,
            features: user.tenant.features,
            branding: user.tenant.branding || {},
          };
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

## 5. Set Up tRPC
Create `src/server/trpc.ts`:

```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Base router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to enforce authentication
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});

// Middleware to enforce tenant context
const hasTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.tenant) {
    throw new TRPCError({ 
      code: 'BAD_REQUEST',
      message: 'Tenant context required' 
    });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
      tenant: ctx.tenant,
    },
  });
});

// Protected procedures (require auth)
export const protectedProcedure = t.procedure.use(isAuthed);

// Tenant procedures (require auth + tenant context)
export const tenantProcedure = t.procedure.use(isAuthed).use(hasTenant);
```

Create `src/server/context.ts`:

```typescript
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { inferAsyncReturnType } from '@trpc/server';
import { headers } from 'next/headers';
import { TRPCError } from '@trpc/server';

// Context for trpc
export async function createContext() {
  const session = await getServerSession(authOptions);
  const headersList = headers();
  
  // Get tenant from subdomain or custom domain
  const host = headersList.get('host') || '';
  let tenant = null;
  
  // Handle X-Tenant-ID header
  const tenantIdHeader = headersList.get('x-tenant-id');
  if (tenantIdHeader) {
    tenant = await prisma.tenant.findFirst({
      where: { 
        OR: [
          { id: tenantIdHeader },
          { subdomain: tenantIdHeader }
        ]
      }
    });
  }
  
  // If no tenant found from header, try subdomain
  if (!tenant) {
    // Extract subdomain from host
    const parts = host.split('.');
    if (parts.length > 1 && !['www', 'admin', 'localhost'].includes(parts[0])) {
      const subdomain = parts[0];
      tenant = await prisma.tenant.findUnique({
        where: { subdomain }
      });
    }
    
    // Try custom domain
    if (!tenant) {
      tenant = await prisma.tenant.findUnique({
        where: { customDomain: host }
      });
    }
  }
  
  // Check tenant status if found
  if (tenant && tenant.status !== 'ACTIVE') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Tenant access denied. Status: ${tenant.status}`
    });
  }
  
  return {
    session,
    prisma,
    tenant,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

## 6. Set Up Client-Side tRPC
Create `src/utils/trpc.tsx`:

```typescript
'use client';

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@/server/routers';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
          headers: () => {
            const headers = new Headers();
            
            // Include the tenant ID from localStorage if available
            const tenantId = localStorage.getItem('currentTenantId');
            if (tenantId) {
              headers.set('x-tenant-id', tenantId);
            }
            
            return headers;
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

## 7. Shared Libraries
Create `src/lib/prisma.ts`:

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

Create `src/lib/redis.ts`:

```typescript
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);
```

## 8. Set Up Environment Variables
Create `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/scheduling_db?schema=public"
REDIS_URL=redis://localhost:6379

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=yoursecrethere

AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_ISSUER=https://your-tenant.auth0.com

RESEND_API_KEY=re_123456789
EMAIL_FROM=onboarding@resend.dev
```

## 9. Update Next.js Config
Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'your-production-domain.com'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

## 10. Update Tailwind Config for Branding Support
Update `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        secondary: "var(--secondary-color)",
      },
    },
  },
  plugins: [],
};
export default config;
```