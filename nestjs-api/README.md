# Scheduling API - NestJS Version

This project is a migration of the Express.js based multi-tenant scheduling API to a NestJS framework architecture.

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

## Key Features

- 🏢 Multi-Tenant Architecture with complete tenant isolation
- 🔐 Auth0 Authentication & Authorization
- 📅 Appointment Management
- 👥 Employee Management
- 📍 Location Management
- 🔧 Service Management
- ⏰ Availability Checking
- 🗄️ Supabase Database with RLS

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Supabase account and project
- Auth0 account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scheduling-api/nestjs-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration.

4. Run the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`.

## Available Commands

### NPM Commands

```bash
# Install dependencies
npm install

# Install dependencies with legacy peer deps if you encounter version conflicts
npm install --legacy-peer-deps

# Development
npm run start:dev           # Start the development server with hot reload
npm run start:debug         # Start the development server in debug mode

# Building
npm run build               # Build the project for production
npm run start:prod          # Start the production server

# Testing
npm run test                # Run tests
npm run test:watch          # Run tests in watch mode
npm run test:cov            # Run tests with coverage
npm run test:e2e            # Run end-to-end tests

# Linting and formatting
npm run lint                # Lint the codebase
npm run format              # Format the codebase

# Migration
npm run migrate:express-to-nest  # Set up the migration environment
```

### Docker Commands

```bash
# Build and run the NestJS API container
docker build -t scheduling-api-nest .
docker run -p 3001:3001 scheduling-api-nest

# Run the NestJS API with Docker Compose
docker-compose -f docker-compose.yml up

# Run both Express and NestJS APIs side by side (migration)
docker-compose -f docker-compose.dual.yml up

# Run in detached mode
docker-compose -f docker-compose.dual.yml up -d

# Stop containers
docker-compose -f docker-compose.dual.yml down

# Build containers
docker-compose -f docker-compose.dual.yml build

# View logs
docker-compose -f docker-compose.dual.yml logs -f
```

### Shell Scripts

```bash
# Run both Express and NestJS APIs side by side (migration)
./run-both-apis.sh
```

## Migration from Express.js

To set up the migration environment that allows running both Express.js and NestJS APIs side by side:

```bash
npm run migrate:express-to-nest
```

This will:
1. Copy necessary environment variables and type definitions
2. Create a dual docker-compose.yml file
3. Create a script to run both APIs simultaneously

### Running Both APIs

You can run both APIs side by side to facilitate a gradual migration:

```bash
# Using the script (in the root directory)
./run-both-apis.sh

# Or using Docker Compose
docker-compose -f docker-compose.dual.yml up
```

- Express API will be available at: http://localhost:3000
- NestJS API will be available at: http://localhost:3001

## API Documentation

Once the application is running, you can access the Swagger documentation at:

```
http://localhost:3000/api
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Docker

The project includes Docker configuration for containerization:

```bash
# Build the Docker image
docker build -t scheduling-api-nest .

# Run the container
docker run -p 3001:3001 scheduling-api-nest
```

## Troubleshooting

If you encounter dependency errors during installation, try:

```bash
npm install --legacy-peer-deps
```

If you're experiencing issues with the migration:

1. Make sure both the Express.js and NestJS projects have the correct environment variables
2. Check that the Supabase configuration is properly set up
3. Verify that both APIs are connecting to the same database

## License

This project is licensed under the MIT License.