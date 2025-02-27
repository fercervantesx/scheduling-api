# NestJS Migration Guide

This document provides guidance on how to migrate from the Express.js API to the new NestJS-based architecture.

## Project Structure

The NestJS application is organized using a modular approach, with each domain entity having its own module:

```
src/
├── common/                 # Shared utilities
│   ├── decorators/         # Custom decorators
│   ├── guards/             # Auth guards
│   ├── interceptors/       # Request/response interceptors
│   ├── middleware/         # HTTP middleware
│   └── services/           # Common services (Supabase)
├── config/                 # Application configuration
└── modules/                # Feature modules
    ├── appointments/       # Appointments module
    ├── availability/       # Availability module
    ├── employees/          # Employees module
    ├── locations/          # Locations module
    ├── schedules/          # Schedules module
    ├── services/           # Services module
    └── tenant/             # Tenant management
```

## Key Migration Changes

### 1. Middleware to Guards/Interceptors

**Express.js (Before):**
```javascript
// Define middleware
const authMiddleware = (req, res, next) => {
  // Auth logic
  next();
};

// Apply middleware
app.use('/api/appointments', authMiddleware, appointmentsRouter);
```

**NestJS (After):**
```typescript
// Define guard
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Auth logic
    return true;
  }
}

// Apply guard
@Controller('api/appointments')
@UseGuards(AuthGuard)
export class AppointmentsController {
  // ...
}
```

### 2. Routes to Controllers

**Express.js (Before):**
```javascript
const router = Router();

router.get('/', async (req, res) => {
  // Handle GET request
});

router.post('/', async (req, res) => {
  // Handle POST request
});

export default router;
```

**NestJS (After):**
```typescript
@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  findAll() {
    return this.appointmentsService.findAll();
  }

  @Post()
  create(@Body() createDto: CreateDto) {
    return this.appointmentsService.create(createDto);
  }
}
```

### 3. Database Access with Services

**Express.js (Before):**
```javascript
router.get('/', async (req, res) => {
  try {
    const data = await prisma.appointment.findMany({
      where: { tenantId: req.tenant.id }
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
```

**NestJS (After):**
```typescript
@Injectable()
export class AppointmentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(tenantId: string): Promise<Appointment[]> {
    const { data, error } = await this.supabase.supabase
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }

    return data.map(this.mapToAppointment);
  }
}
```

### 4. Tenant Isolation

**Express.js (Before):**
```javascript
// Middleware
export const resolveTenant = async (req, res, next) => {
  // Extract tenant from request
  req.tenant = tenant;
  next();
};

// Usage in route
router.get('/', async (req, res) => {
  const { tenantId } = req.tenant;
  // Use tenantId in query
});
```

**NestJS (After):**
```typescript
// Middleware
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant from request
    req.tenant = tenant;
    next();
  }
}

// Controller with tenant from request
@Controller('api/appointments')
export class AppointmentsController {
  @Get()
  findAll(@Req() req: Request) {
    return this.appointmentsService.findAll(req.tenant.id);
  }
}
```

## API Endpoints Migration

All API endpoints from the Express.js application have been migrated to equivalent NestJS endpoints with the same URL paths. The request and response formats remain the same, ensuring backward compatibility.

## Authentication

The authentication flow using Auth0 has been preserved but implemented using NestJS Guards instead of middleware:

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    // Verify token with Auth0
    // Set user information to request
    
    return true;
  }
}
```

## Request Validation

Request validation now uses NestJS Pipes and class-validator decorators:

```typescript
export class CreateAppointmentDto {
  @IsUUID()
  @IsString()
  serviceId: string;

  @IsUUID()
  @IsString()
  locationId: string;

  @IsDateString()
  startTime: string;
}
```

## Running Both Applications Side by Side

During the migration, you can run both applications side by side on different ports:

1. Express.js API on port 3000
2. NestJS API on port 3001

This allows for gradual migration of clients to the new API while maintaining the existing service.

## Testing Strategy

1. Unit Tests: Test each service and controller in isolation
2. Integration Tests: Test the interaction between modules
3. End-to-End Tests: Test the entire API, using the same endpoints as the original Express.js API

## Next Steps

1. Complete implementation of remaining modules
2. Write comprehensive tests
3. Set up CI/CD pipeline
4. Deploy to staging environment
5. Migrate clients one by one to the new API
6. Decommission the Express.js API once all clients have been migrated