# Scheduling API

A Node.js + TypeScript + Express API for managing appointments and schedules, with Auth0 authentication and PostgreSQL database using Prisma ORM.

## Features

- 🔐 Auth0 Authentication
- 📅 Appointment Scheduling
- 👥 Employee Management
- 📍 Location Management
- ⏰ Availability Checking
- 🔄 Concurrency Handling
- 🎯 TypeScript Support
- 🗄️ PostgreSQL Database with Prisma

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
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Locations
- `GET /api/locations` - List all locations
- `POST /api/locations` - Create a new location (requires admin role)
- `GET /api/locations/:id` - Get location details

### Appointments
- `GET /api/appointments` - List appointments (with filtering)
- `POST /api/appointments` - Book a new appointment
- `PATCH /api/appointments/:id` - Update appointment status

### Availability
- `GET /api/availability` - Get available time slots
  - Query parameters: serviceId, locationId, employeeId, date

## Authentication

This API uses Auth0 for authentication. All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations

### Database Migrations

To create a new migration:

```bash
npm run prisma:migrate -- --name your_migration_name
```

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

## Security

- All sensitive routes are protected with Auth0 JWT verification
- Role-based access control available
- Environment variables for sensitive configuration
- CORS enabled
- Request body validation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 