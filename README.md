# Scheduling API

A Node.js + TypeScript + Express API for managing appointments and schedules, with Auth0 authentication and PostgreSQL database using Prisma ORM.

## Features

- 🔐 Auth0 Authentication & Authorization
  - JWT token validation
  - Role-based access control
  - User information tracking
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
- 🎯 TypeScript Support
  - Full type safety
  - Interface definitions
- 🗄️ PostgreSQL Database with Prisma
  - Robust data modeling
  - Efficient querying
  - Migration support

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn
- Auth0 account

## Setup

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

## API Endpoints

### Authentication
All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-token>
```

### Locations
- `GET /api/locations` - List all locations
- `POST /api/locations` - Create a new location (requires admin role)
- `GET /api/locations/:id` - Get location details

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create a new employee
- `GET /api/employees/:id` - Get employee details
- `PATCH /api/employees/:id/locations` - Update employee locations
- `DELETE /api/employees/:id` - Delete an employee

### Services
- `GET /api/services` - List all services
- `POST /api/services` - Create a new service
- `GET /api/services/:id` - Get service details
- `DELETE /api/services/:id` - Delete a service

### Schedules
- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create a new schedule
- `DELETE /api/schedules/:id` - Delete a schedule

### Appointments
- `GET /api/appointments` - List appointments (with filtering)
- `POST /api/appointments` - Book a new appointment
- `PATCH /api/appointments/:id` - Update appointment status
- `DELETE /api/appointments/:id` - Delete an appointment

### Availability
- `GET /api/availability` - Get available time slots
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

## Data Models

### Location
- id: UUID
- name: string
- address: string
- employees: EmployeeLocation[]
- schedules: Schedule[]
- appointments: Appointment[]

### Employee
- id: UUID
- name: string
- locations: EmployeeLocation[]
- schedules: Schedule[]
- appointments: Appointment[]

### Service
- id: UUID
- name: string
- duration: number (minutes)
- appointments: Appointment[]

### Schedule
- id: UUID
- employeeId: UUID
- locationId: UUID
- startTime: string (HH:mm)
- endTime: string (HH:mm)
- weekday: string
- blockType: string

### Appointment
- id: UUID
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

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 