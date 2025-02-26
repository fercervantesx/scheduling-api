# Migration Plan: Express → Next.js + tRPC

This document outlines the migration strategy from the current Express.js API to a Next.js + tRPC architecture, maintaining the multi-tenant model and Auth0 authentication.

## Architecture Overview

### Current Architecture
- Express.js REST API
- Separate React admin dashboard
- Auth0 authentication
- PostgreSQL with Prisma ORM
- Redis for caching
- Docker-based deployment

### New Architecture
- Next.js API routes with tRPC
- Integrated admin dashboard (Next.js pages)
- Auth0 authentication (adapted for Next.js)
- PostgreSQL with Prisma ORM (unchanged)
- Redis for caching (unchanged)
- Docker-based deployment (compatible with current infrastructure)

## Benefits of Migration

1. **End-to-end Type Safety**:
   - Full TypeScript integration between frontend and backend
   - Autocomplete for API routes and parameters
   - Runtime type checking with Zod

2. **Developer Experience**:
   - Single codebase for API and admin dashboard
   - Automatic API client generation
   - Simplified state management with React Query
   - Better IDE support and error catching

3. **Code Organization**:
   - Colocation of related components and API routes
   - Simplified folder structure
   - Reusable hooks and utilities across frontend/backend

4. **Performance**:
   - Reduced client-server roundtrips
   - Optimized data fetching with React Query
   - Built-in performance optimizations from Next.js

## Migration Steps

### 1. Project Setup (Week 1)

1. Create new Next.js project:
   ```bash
   npx create-next-app@latest scheduling-api-next --typescript
   ```

2. Install tRPC and related dependencies:
   ```bash
   npm install @trpc/server @trpc/client @trpc/react-query @trpc/next zod react-query
   ```

3. Install existing project dependencies:
   ```bash
   npm install @prisma/client date-fns ioredis @auth0/nextjs-auth0
   npm install -D prisma typescript @types/node
   ```

4. Copy Prisma schema and migrate:
   ```bash
   npx prisma generate
   ```

### 2. tRPC Setup (Week 1-2)

1. Create tRPC router structure:
   ```
   /src/server/trpc.ts         # tRPC context and initialization
   /src/server/routers/        # API routers
   /src/utils/trpc.ts          # Client-side tRPC hooks
   /src/pages/api/trpc/[trpc].ts  # tRPC API handler
   ```

2. Implement tenant context extraction:
   ```typescript
   // src/server/trpc.ts
   import { inferAsyncReturnType, initTRPC, TRPCError } from '@trpc/server';
   import { CreateNextContextOptions } from '@trpc/server/adapters/next';
   import { PrismaClient } from '@prisma/client';
   import { getSession } from '@auth0/nextjs-auth0';
   
   const prisma = new PrismaClient();
   
   export async function createContext(opts: CreateNextContextOptions) {
     const req = opts.req;
     const res = opts.res;
     
     // Extract tenant from subdomain or headers (similar to current middleware)
     const host = req.headers.host || '';
     const subdomain = host.split('.')[0];
     const tenantId = req.headers['x-tenant-id'] as string;
     
     // Get Auth0 session
     const session = await getSession(req, res);
     
     // Resolve tenant
     let tenant = null;
     if (tenantId) {
       tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
     } else if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
       tenant = await prisma.tenant.findUnique({ where: { subdomain } });
     }
     
     return { 
       req, 
       res, 
       prisma, 
       session,
       tenant,
       userId: session?.user?.sub
     };
   }
   
   type Context = inferAsyncReturnType<typeof createContext>;
   
   const t = initTRPC.context<Context>().create();
   
   // Tenant middleware 
   const enforceAuth = t.middleware(({ ctx, next }) => {
     if (!ctx.session?.user) {
       throw new TRPCError({ code: 'UNAUTHORIZED' });
     }
     return next({
       ctx: {
         ...ctx,
         // Add user info to context
         user: ctx.session.user,
       },
     });
   });
   
   const enforceTenant = t.middleware(({ ctx, next }) => {
     if (!ctx.tenant) {
       throw new TRPCError({ 
         code: 'BAD_REQUEST',
         message: 'Tenant not found' 
       });
     }
     return next({
       ctx: {
         ...ctx,
         tenant: ctx.tenant,
       },
     });
   });
   
   export const router = t.router;
   export const publicProcedure = t.procedure;
   export const protectedProcedure = t.procedure.use(enforceAuth);
   export const tenantProcedure = t.procedure.use(enforceAuth).use(enforceTenant);
   ```

3. Create base API handlers:
   ```typescript
   // src/pages/api/trpc/[trpc].ts
   import { createNextApiHandler } from '@trpc/server/adapters/next';
   import { appRouter } from '@/server/routers/_app';
   import { createContext } from '@/server/trpc';
   
   export default createNextApiHandler({
     router: appRouter,
     createContext,
   });
   ```

### 3. Port API Routes (Week 2-3)

1. Migrate appointment routes:
   ```typescript
   // src/server/routers/appointments.ts
   import { z } from 'zod';
   import { tenantProcedure, router } from '../trpc';
   import { TRPCError } from '@trpc/server';
   
   // Validation schemas (copied from current project)
   const createAppointmentSchema = z.object({
     serviceId: z.string().uuid(),
     locationId: z.string().uuid(),
     employeeId: z.string().uuid(),
     startTime: z.string().datetime(),
     // other fields...
   });
   
   export const appointmentsRouter = router({
     getAll: tenantProcedure
       .input(z.object({
         status: z.string().optional(),
         from: z.string().optional(),
         to: z.string().optional(),
       }))
       .query(async ({ ctx, input }) => {
         const { tenant, prisma } = ctx;
         
         // Filter logic (similar to current implementation)
         const where = {
           tenantId: tenant.id,
           ...(input.status ? { status: input.status } : {}),
           // other filters...
         };
         
         return prisma.appointment.findMany({
           where,
           include: {
             service: true,
             location: true,
             employee: true,
           },
           orderBy: {
             startTime: 'asc',
           },
         });
       }),
     
     create: tenantProcedure
       .input(createAppointmentSchema)
       .mutation(async ({ ctx, input }) => {
         const { tenant, prisma, userId } = ctx;
         
         // Validation logic (similar to current implementation)
         
         // Create appointment
         const appointment = await prisma.appointment.create({
           data: {
             ...input,
             tenantId: tenant.id,
             status: 'CONFIRMED',
             userId: userId || 'anonymous',
             // other fields...
           },
           include: {
             service: true,
             location: true,
             employee: true,
           },
         });
         
         return appointment;
       }),
     
     // Other appointment procedures (update, delete, etc.)
   });
   ```

2. Create root router:
   ```typescript
   // src/server/routers/_app.ts
   import { router } from '../trpc';
   import { appointmentsRouter } from './appointments';
   import { availabilityRouter } from './availability';
   import { employeesRouter } from './employees';
   import { locationsRouter } from './locations';
   import { schedulesRouter } from './schedules';
   import { servicesRouter } from './services';
   
   export const appRouter = router({
     appointments: appointmentsRouter,
     availability: availabilityRouter,
     employees: employeesRouter,
     locations: locationsRouter,
     schedules: schedulesRouter,
     services: servicesRouter,
   });
   
   export type AppRouter = typeof appRouter;
   ```

3. Set up client utilities:
   ```typescript
   // src/utils/trpc.ts
   import { createTRPCNext } from '@trpc/next';
   import { httpBatchLink } from '@trpc/client';
   import type { AppRouter } from '@/server/routers/_app';
   
   function getBaseUrl() {
     if (typeof window !== 'undefined') return '';
     // SSR should use local API endpoint
     return `http://localhost:${process.env.PORT || 3000}`;
   }
   
   export const trpc = createTRPCNext<AppRouter>({
     config() {
       return {
         links: [
           httpBatchLink({
             url: `${getBaseUrl()}/api/trpc`,
           }),
         ],
       };
     },
   });
   ```

### 4. Auth0 Integration (Week 3)

1. Configure Auth0 with Next.js:
   ```
   // .env.local
   AUTH0_SECRET='your-auth0-secret'
   AUTH0_BASE_URL='http://localhost:3000'
   AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
   AUTH0_CLIENT_ID='your-client-id'
   AUTH0_CLIENT_SECRET='your-client-secret'
   ```

2. Set up Auth0 provider:
   ```typescript
   // src/pages/_app.tsx
   import { UserProvider } from '@auth0/nextjs-auth0/client';
   import { trpc } from '@/utils/trpc';
   
   function App({ Component, pageProps }) {
     return (
       <UserProvider>
         <Component {...pageProps} />
       </UserProvider>
     );
   }
   
   export default trpc.withTRPC(App);
   ```

3. Create Auth0 API routes:
   ```typescript
   // src/pages/api/auth/[...auth0].ts
   import { handleAuth } from '@auth0/nextjs-auth0';
   
   export default handleAuth();
   ```

### 5. Admin Dashboard Migration (Week 4-5)

1. Create dashboard layout:
   ```typescript
   // src/components/layouts/DashboardLayout.tsx
   import { useUser } from '@auth0/nextjs-auth0/client';
   import { Navbar, Sidebar } from '@/components/dashboard';
   
   export default function DashboardLayout({ children }) {
     const { user, isLoading } = useUser();
     
     if (isLoading) return <div>Loading...</div>;
     if (!user) return <div>Please sign in</div>;
     
     return (
       <div className="flex h-screen">
         <Sidebar />
         <div className="flex-1 overflow-auto">
           <Navbar user={user} />
           <main className="p-4">{children}</main>
         </div>
       </div>
     );
   }
   ```

2. Create dashboard pages:
   ```typescript
   // src/pages/dashboard/index.tsx
   import DashboardLayout from '@/components/layouts/DashboardLayout';
   import { trpc } from '@/utils/trpc';
   
   export default function Dashboard() {
     const { data, isLoading } = trpc.appointments.getRecent.useQuery();
     
     return (
       <DashboardLayout>
         <h1>Dashboard</h1>
         {/* Dashboard content */}
       </DashboardLayout>
     );
   }
   
   // src/pages/dashboard/appointments/index.tsx
   import DashboardLayout from '@/components/layouts/DashboardLayout';
   import { trpc } from '@/utils/trpc';
   
   export default function Appointments() {
     const { data, isLoading } = trpc.appointments.getAll.useQuery({});
     
     return (
       <DashboardLayout>
         <h1>Appointments</h1>
         {/* Appointments list */}
       </DashboardLayout>
     );
   }
   ```

### 6. API and Frontend Testing (Week 6)

1. Set up testing environment:
   ```bash
   npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
   ```

2. Create test setup:
   ```typescript
   // jest.config.js
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'jsdom',
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
     },
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
   };
   
   // jest.setup.js
   import '@testing-library/jest-dom';
   ```

3. Write API tests:
   ```typescript
   // src/server/routers/appointments.test.ts
   import { inferProcedureInput } from '@trpc/server';
   import { createInnerTRPCContext } from '../trpc';
   import { appointmentsRouter } from './appointments';
   import type { AppRouter } from './_app';
   
   // Mock context
   const mockContext = {
     tenant: { id: 'tenant-id' },
     prisma: {
       appointment: {
         findMany: jest.fn(),
         create: jest.fn(),
         // other methods...
       },
       // other models...
     },
     userId: 'user-id',
   };
   
   test('getAll returns appointments for tenant', async () => {
     // Arrange
     const ctx = mockContext as any;
     const caller = appointmentsRouter.createCaller(ctx);
     
     const mockAppointments = [{ id: '1', /* other fields */ }];
     ctx.prisma.appointment.findMany.mockResolvedValue(mockAppointments);
     
     // Act
     const result = await caller.getAll({});
     
     // Assert
     expect(ctx.prisma.appointment.findMany).toHaveBeenCalledWith({
       where: { tenantId: 'tenant-id' },
       include: expect.any(Object),
       orderBy: expect.any(Object),
     });
     expect(result).toEqual(mockAppointments);
   });
   ```

### 7. Migration Deployment (Week 7)

1. Update Docker configuration:
   ```dockerfile
   # Dockerfile
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   
   FROM node:18-alpine AS runner
   WORKDIR /app
   COPY --from=builder /app/package*.json ./
   COPY --from=builder /app/.next ./.next
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/prisma ./prisma
   
   ENV NODE_ENV=production
   ENV PORT=3000
   
   CMD ["npm", "start"]
   ```

2. Update Docker Compose:
   ```yaml
   # docker-compose.yml
   version: '3'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://user:password@db:5432/scheduling
         - REDIS_URL=redis://redis:6379
         # other env vars...
       depends_on:
         - db
         - redis
     
     db:
       image: postgres:14
       # db config...
     
     redis:
       image: redis:7
       # redis config...
   ```

3. Update deployment scripts:
   ```json
   // package.json
   {
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "next lint",
       "test": "jest",
       "test:watch": "jest --watch",
       "prisma:generate": "prisma generate",
       "prisma:migrate": "prisma migrate deploy"
     }
   }
   ```

## Phased Migration Approach

For a smoother transition, consider these phases:

### Phase 1: Parallel Development
- Set up Next.js + tRPC project alongside existing Express app
- Implement core infrastructure (auth, tenant context, etc.)
- Port one resource type completely (e.g., locations)
- Test thoroughly before proceeding

### Phase 2: Gradual Replacement
- Progressively port each resource type
- Update DNS to route specific endpoints to the new app
- Keep both systems running in parallel
- Migrate admin dashboard last

### Phase 3: Complete Switchover
- Complete migration of all endpoints
- Finalize admin dashboard migration
- Run both systems for a short overlap period
- Switch all traffic to new system
- Decommission Express app

## Tech Stack Summary

### Framework
- Next.js (App Router)
- React (Client components)

### API
- tRPC (Type-safe API)
- Zod (validation)

### Database (unchanged)
- PostgreSQL
- Prisma ORM

### Authentication
- Auth0 (with Next.js adapter)

### State Management
- React Query (via tRPC)
- React Context (for global state)

### UI
- Tailwind CSS
- Headless UI components

### Testing
- Jest
- React Testing Library
- Playwright (E2E)

## Risks and Mitigations

1. **Risk**: Auth0 integration differences
   **Mitigation**: Test auth flow extensively in staging environment

2. **Risk**: Data migration issues
   **Mitigation**: No schema changes needed, use same Prisma models

3. **Risk**: Deployment complexity
   **Mitigation**: Use Docker for consistent environments

4. **Risk**: Learning curve for tRPC
   **Mitigation**: Start with simpler endpoints, provide team training

5. **Risk**: Downtime during migration
   **Mitigation**: Run both systems in parallel with gradual traffic shifting