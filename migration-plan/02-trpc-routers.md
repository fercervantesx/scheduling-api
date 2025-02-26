# Next.js Migration Plan: tRPC Routers Implementation

## 1. Main Router Setup

Create `src/server/routers/index.ts`:

```typescript
import { router } from '../trpc';
import { appointmentsRouter } from './appointments';
import { availabilityRouter } from './availability';
import { employeesRouter } from './employees';
import { locationsRouter } from './locations';
import { schedulesRouter } from './schedules';
import { servicesRouter } from './services';
import { tenantRouter } from './tenant';

export const appRouter = router({
  appointments: appointmentsRouter,
  availability: availabilityRouter,
  employees: employeesRouter,
  locations: locationsRouter,
  schedules: schedulesRouter,
  services: servicesRouter,
  tenant: tenantRouter,
});

export type AppRouter = typeof appRouter;
```

## 2. Common Validation Schemas

Create `src/lib/validations.ts`:

```typescript
import { z } from 'zod';

// Common validation schemas
export const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
});

export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  locationIds: z.array(z.string().uuid())
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  price: z.number().optional(),
});

export const scheduleSchema = z.object({
  employeeId: z.string().uuid(),
  locationId: z.string().uuid(),
  weekday: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  blockType: z.enum(['WORKING_HOURS', 'BREAK', 'VACATION']),
});

export const appointmentSchema = z.object({
  serviceId: z.string().uuid(),
  locationId: z.string().uuid(),
  employeeId: z.string().uuid(),
  startTime: z.date(),
  bookedBy: z.string().email().optional(),
  bookedByName: z.string().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('SCHEDULED'),
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  cancelReason: z.string().optional(),
  canceledBy: z.enum(['CLIENT', 'ADMIN', 'EMPLOYEE', 'SYSTEM']).optional(),
});

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const brandingSchema = z.object({
  logo: z.union([z.string().url(), z.string().max(0), z.null()]).optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
});
```

## 3. Location Router

Create `src/server/routers/locations.ts`:

```typescript
import { tenantProcedure, protectedProcedure, router } from '../trpc';
import { locationSchema } from '@/lib/validations';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const locationsRouter = router({
  // Get all locations for the current tenant
  getAll: tenantProcedure.query(async ({ ctx }) => {
    return ctx.prisma.location.findMany({
      where: { tenantId: ctx.tenant.id },
      orderBy: { createdAt: 'desc' },
    });
  }),

  // Get location by ID
  getById: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const location = await ctx.prisma.location.findUnique({
        where: {
          id: input.id,
          tenantId: ctx.tenant.id,
        },
        include: {
          employees: {
            include: {
              employee: true,
            },
          },
        },
      });

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      return location;
    }),

  // Create a new location
  create: tenantProcedure
    .input(locationSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.location.create({
        data: {
          ...input,
          tenant: {
            connect: {
              id: ctx.tenant.id,
            },
          },
        },
      });
    }),

  // Update a location
  update: tenantProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: locationSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      // Check if location exists and belongs to the tenant
      const location = await ctx.prisma.location.findUnique({
        where: {
          id,
          tenantId: ctx.tenant.id,
        },
      });

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      return ctx.prisma.location.update({
        where: { id },
        data,
      });
    }),

  // Delete a location
  delete: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if location exists and belongs to the tenant
      const location = await ctx.prisma.location.findUnique({
        where: {
          id: input.id,
          tenantId: ctx.tenant.id,
        },
      });

      if (!location) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Location not found',
        });
      }

      // Perform cascading delete
      return ctx.prisma.$transaction(async (tx) => {
        // Cancel all scheduled appointments for this location
        await tx.appointment.updateMany({
          where: {
            locationId: input.id,
            status: 'SCHEDULED',
            tenantId: ctx.tenant.id,
          },
          data: {
            status: 'CANCELLED',
            canceledBy: 'ADMIN',
            cancelReason: 'Location removed from system',
          },
        });

        // Delete the location
        return tx.location.delete({
          where: { id: input.id },
        });
      });
    }),
});
```

## 4. Example Tenant Router

Create `src/server/routers/tenant.ts`:

```typescript
import { protectedProcedure, router, tenantProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { brandingSchema } from '@/lib/validations';
import { z } from 'zod';

export const tenantRouter = router({
  // Get tenant plan information
  getPlan: tenantProcedure.query(async ({ ctx }) => {
    const featuresObject = ctx.tenant.features as Record<string, boolean>;
    const features = Object.entries(featuresObject)
      .filter(([_, value]) => value)
      .map(([key]) => {
        return key.replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
      });

    return {
      plan: ctx.tenant.plan,
      status: ctx.tenant.status,
      trialEndsAt: ctx.tenant.trialEndsAt,
      features,
    };
  }),

  // Get tenant features
  getFeatures: tenantProcedure.query(async ({ ctx }) => {
    const featuresObject = ctx.tenant.features as Record<string, boolean>;
    const features = Object.entries(featuresObject)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    return { features };
  }),

  // Get tenant branding
  getBranding: tenantProcedure.query(async ({ ctx }) => {
    // Check if tenant has custom branding feature
    const featuresObject = ctx.tenant.features as Record<string, boolean>;
    const hasCustomBranding = featuresObject.customBranding === true;

    if (!hasCustomBranding) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Custom branding not available on current plan',
      });
    }

    return ctx.tenant.branding || {};
  }),

  // Update tenant branding
  updateBranding: tenantProcedure
    .input(brandingSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if tenant has custom branding feature
      const featuresObject = ctx.tenant.features as Record<string, boolean>;
      const hasCustomBranding = featuresObject.customBranding === true;

      if (!hasCustomBranding) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Custom branding not available on current plan',
        });
      }

      // Update tenant branding
      await ctx.prisma.tenant.update({
        where: { id: ctx.tenant.id },
        data: {
          branding: input,
        },
      });

      return { message: 'Branding updated successfully' };
    }),
});
```

## 5. Create API Route for tRPC

Create `src/app/api/trpc/[trpc]/route.ts`:

```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers';
import { createContext } from '@/server/context';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });
};

export { handler as GET, handler as POST };
```

## 6. Implement Remaining Routers

The pattern for the remaining routers (appointments, availability, employees, schedules, services) will follow the same structure as the locations router. Each will include:

- Query procedures to fetch data (getAll, getById)
- Mutation procedures to modify data (create, update, delete)
- Proper tenant isolation using the tenantProcedure
- Input validation using Zod schemas
- Error handling with TRPCError

## 7. Implement Components

Example of client component using tRPC:

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { locationSchema } from '@/lib/validations';
import { z } from 'zod';

type LocationForm = z.infer<typeof locationSchema>;

export default function LocationsPage() {
  const { data: locations, isLoading } = trpc.locations.getAll.useQuery();
  const createMutation = trpc.locations.create.useMutation({
    onSuccess: () => {
      // Invalidate query to refresh data
      utils.locations.getAll.invalidate();
    },
  });
  const utils = trpc.useUtils();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
  });
  
  const onSubmit = (data: LocationForm) => {
    createMutation.mutate(data, {
      onSuccess: () => reset(),
    });
  };
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Locations</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="mb-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input {...register('name')} className="border rounded p-2 w-full" />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium">Address</label>
            <input {...register('address')} className="border rounded p-2 w-full" />
            {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
          </div>
          
          <button 
            type="submit" 
            className="bg-primary text-white px-4 py-2 rounded"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Location'}
          </button>
        </div>
      </form>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations?.map((location) => (
          <div key={location.id} className="border rounded p-4">
            <h2 className="font-bold">{location.name}</h2>
            <p className="text-gray-600">{location.address}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

This example demonstrates how to:
1. Query data using `trpc.locations.getAll.useQuery()`
2. Mutate data using `trpc.locations.create.useMutation()`
3. Invalidate queries to refresh data
4. Use form validation with Zod schemas
5. Display loading and error states