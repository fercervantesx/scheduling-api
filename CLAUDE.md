# CLAUDE.md - Scheduling API Guide

## Build Commands
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run all tests
- `npm test -- -t "test name"` - Run specific test
- `npm run test:watch` - Run tests in watch mode
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations

## Docker Development

### Running with source mounted (for development):
```
docker-compose up --build
```

### Running without source mount (for production-like testing):
```
# Create a test compose file with no volume mounts 
docker-compose -f docker-compose.test.yml up --build
```

## Style Guidelines
- **Imports**: Group by external packages first, then internal modules
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Types**: Use TypeScript interfaces, Zod for validation schema, avoid `any`
- **Error Handling**: Try/catch in route handlers, standardized error responses
- **API Routes**: Use middleware arrays, explicit status codes (200, 201, 400, 404, 500)
- **Validation**: Use Zod schemas with middleware validation
- **Testing**: Jest with supertest, mock Prisma client, use descriptive test names
- **Auth**: JWT with Auth0, tenant isolation throughout codebase
- **Comments**: Document routes with single-line comments above definitions