# Scheduling API

A multi-tenant Node.js + TypeScript + Express API for managing appointments and schedules, with Auth0 authentication and PostgreSQL database using Prisma ORM.

## Features

- 🏢 Multi-Tenant Architecture
  - Complete tenant isolation
  - Subdomain and custom domain support
  - Per-tenant feature flags and settings
  - Multiple subscription plans (Free, Basic, Pro)
  - Trial period management

- 🔐 Auth0 Authentication & Authorization
  - JWT token validation
  - Role-based access control
  - User information tracking
  - Development mode bypass for testing

- 📅 Appointment Management
  - Create, read, update, and delete appointments
  - Conflict detection
  - Timezone-aware scheduling
  - Automatic status management

- 👥 Employee Management
  - Multi-location support
  - Schedule management
  - Availability tracking

- 📍 Location Management
  - Multiple locations support
  - Location-specific scheduling

- 🔧 Service Management
  - Configurable service duration
  - Service-based availability

- ⏰ Availability Checking
  - Real-time availability calculation
  - Schedule-based availability
  - Timezone-aware slots

- 🔄 Concurrency Handling
  - Transaction support
  - Race condition prevention
  - Rate limiting and quota enforcement

- 🎯 TypeScript Support
  - Full type safety
  - Interface definitions
  - Zod schema validation

- 🗄️ PostgreSQL Database with Prisma
  - Robust data modeling
  - Efficient querying
  - Migration support

- 📊 Admin Dashboard
  - React-based admin UI
  - Tenant management
  - System monitoring

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL
- Redis
- npm or yarn
- Auth0 account
- Docker & Docker Compose (optional, for containerized setup)

## Setup

### Standard Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd scheduling-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration:
- Set your PostgreSQL database URL
- Configure your Redis connection
- Configure your Auth0 domain and audience
- Adjust other settings as needed

4. Set up the database:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000` (or your configured PORT).

### Docker Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd scheduling-api
```

2. Start with Docker Compose:
```bash
docker-compose up
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379
- API server on port 3005
- Admin dashboard on port 3001

For development, you might want to run the services separately:
```bash
# Start just the database and Redis
docker-compose up db redis

# Run the API locally
npm run dev
```

## API Endpoints

### Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

### Health Check
- `GET /health` - Check API status

### Admin Endpoints
- `GET /api/admin/tenants` - List all tenants (requires admin role)
- `GET /api/admin/tenants/:id` - Get tenant details (requires admin role)
- `POST /api/admin/tenants` - Create a new tenant (requires admin role)
- `PATCH /api/admin/tenants/:id/status` - Update tenant status (requires admin role)
- `PATCH /api/admin/tenants/:id/settings` - Update tenant settings (requires admin role)

### Tenant Resources
All tenant resources are automatically filtered by the current tenant context, determined by the subdomain or custom domain.

### Locations
- `GET /api/locations` - List all locations for the current tenant
- `POST /api/locations` - Create a new location
- `GET /api/locations/:id` - Get location details

### Employees
- `GET /api/employees` - List all employees for the current tenant
- `POST /api/employees` - Create a new employee
- `GET /api/employees/:id` - Get employee details
- `PATCH /api/employees/:id/locations` - Update employee locations
- `DELETE /api/employees/:id` - Delete an employee

### Services
- `GET /api/services` - List all services for the current tenant
- `POST /api/services` - Create a new service
- `GET /api/services/:id` - Get service details
- `DELETE /api/services/:id` - Delete a service

### Schedules
- `GET /api/schedules` - List all schedules for the current tenant
- `POST /api/schedules` - Create a new schedule
- `DELETE /api/schedules/:id` - Delete a schedule

### Appointments
- `GET /api/appointments` - List appointments for the current tenant (with filtering)
- `POST /api/appointments` - Book a new appointment
- `PATCH /api/appointments/:id` - Update appointment status
- `DELETE /api/appointments/:id` - Delete an appointment

### Availability
- `GET /api/availability` - Get available time slots for the current tenant
  - Query parameters:
    - serviceId: string
    - locationId: string
    - employeeId: string
    - date: string (YYYY-MM-DD)

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed the database
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

### Admin Dashboard Scripts

- `cd admin-dashboard && npm run dev` - Run admin dashboard in development mode
- `cd admin-dashboard && npm run build` - Build admin dashboard for production

### Database Migrations

To create a new migration:
```bash
npm run prisma:migrate -- --name your_migration_name
```

### Testing

The project includes comprehensive tests using Jest:
- Unit tests for routes
- Integration tests
- Auth middleware tests
- Database operation tests

## Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Security Features

- JWT token validation
- Role-based access control
- Environment variable protection
- CORS configuration
- Request validation
- SQL injection prevention (via Prisma)
- Rate limiting (via Auth0)

## Multi-Tenant Data Models

### Tenant
- id: UUID
- name: string
- email: string?
- subdomain: string (unique)
- customDomain: string? (unique)
- status: string ('ACTIVE', 'SUSPENDED', 'TRIAL')
- plan: string ('FREE', 'BASIC', 'PRO')
- trialEndsAt: DateTime?
- settings: JSON?
- branding: JSON?
- features: JSON
- apiKey: string?
- webhookUrl: string?
- createdAt: DateTime
- updatedAt: DateTime

### User
- id: UUID
- email: string
- name: string?
- role: string ('ADMIN', 'STAFF', 'CLIENT')
- tenantId: UUID
- createdAt: DateTime
- updatedAt: DateTime

### ApiKey
- id: UUID
- key: string (unique)
- name: string
- tenantId: UUID
- expiresAt: DateTime?
- createdAt: DateTime
- updatedAt: DateTime

### Webhook
- id: UUID
- url: string
- events: string[]
- tenantId: UUID
- isActive: boolean
- createdAt: DateTime
- updatedAt: DateTime

### Resource Models (All tenant-scoped)

### Location
- id: UUID
- tenantId: UUID
- name: string
- address: string
- employees: EmployeeLocation[]
- schedules: Schedule[]
- appointments: Appointment[]
- createdAt: DateTime
- updatedAt: DateTime

### Employee
- id: UUID
- tenantId: UUID
- name: string
- locations: EmployeeLocation[]
- schedules: Schedule[]
- appointments: Appointment[]
- createdAt: DateTime
- updatedAt: DateTime

### Service
- id: UUID
- tenantId: UUID
- name: string
- duration: number (minutes)
- appointments: Appointment[]
- createdAt: DateTime
- updatedAt: DateTime

### Schedule
- id: UUID
- tenantId: UUID
- employeeId: UUID
- locationId: UUID
- startTime: string (HH:mm)
- endTime: string (HH:mm)
- weekday: string
- blockType: string
- createdAt: DateTime
- updatedAt: DateTime

### Appointment
- id: UUID
- tenantId: UUID
- serviceId: UUID
- locationId: UUID
- employeeId: UUID
- startTime: DateTime
- status: string
- canceledBy: string?
- cancelReason: string?
- bookedBy: string
- bookedByName: string
- userId: string
- createdAt: DateTime
- updatedAt: DateTime

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 