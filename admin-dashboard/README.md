# Scheduling Admin Dashboard

A modern React-based admin dashboard for managing appointments, schedules, and business operations.

## Features

- 🔐 Secure Authentication
  - Auth0 integration
  - JWT token management
  - Role-based access control
- 📊 Dashboard Overview
  - Clean, modern interface
  - Responsive design
  - Real-time updates
- 📍 Location Management
  - Create and manage locations
  - View location details
  - Track location-specific data
- 👥 Employee Management
  - Add and manage employees
  - Assign to multiple locations
  - View employee schedules
- 🔧 Service Management
  - Configure service offerings
  - Set service durations
  - Track service usage
- 📅 Schedule Management
  - Set working hours
  - Configure breaks and time off
  - Weekly schedule templates
- 🎯 Appointment Management
  - View all appointments
  - Filter by date, location, employee
  - Update appointment status
- ⏰ Availability Checking
  - Real-time slot calculation
  - Multi-criteria filtering
  - Timezone support
- 🎨 Modern UI/UX
  - Tailwind CSS styling
  - Responsive design
  - Toast notifications
  - Modal dialogs
- 🔄 State Management
  - React Query for server state
  - Optimistic updates
  - Real-time data synchronization

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Query
- Auth0
- Axios
- React Hot Toast

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Auth0 account
- Running instance of the Scheduling API

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy `.env.example` to `.env` and fill in your Auth0 credentials:
```env
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=your-auth0-audience
VITE_API_URL=http://localhost:3000/api
```

3. Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## Auth0 Configuration

1. Create a new Single Page Application in Auth0
2. Add the following URLs to your Auth0 application settings:
   - Allowed Callback URLs: `http://localhost:5173`
   - Allowed Logout URLs: `http://localhost:5173`
   - Allowed Web Origins: `http://localhost:5173`
3. Copy the Domain and Client ID to your `.env` file
4. Configure the API audience in your `.env` file

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
  ├── components/           # React components
  │   ├── sections/        # Main section components
  │   │   ├── Appointments.tsx
  │   │   ├── Availability.tsx
  │   │   ├── Employees.tsx
  │   │   ├── Locations.tsx
  │   │   ├── Schedules.tsx
  │   │   └── Services.tsx
  │   └── ...             # Other components
  ├── utils/              # Utility functions
  │   └── api.ts         # API client configuration
  ├── types/             # TypeScript type definitions
  └── App.tsx            # Main application component
```

## Features in Detail

### Locations
- View all locations in a table format
- Add new locations with name and address
- Delete locations (with confirmation)
- View location details

### Employees
- Manage employee information
- Assign employees to multiple locations
- View employee schedules
- Delete employees (with related data cleanup)

### Services
- Configure available services
- Set service duration
- Delete services (with appointment handling)

### Schedules
- Set weekly working hours
- Configure breaks and time off
- Manage multiple schedules per employee
- Delete schedules

### Appointments
- View all appointments
- Filter by various criteria
- Update appointment status
- Cancel appointments

### Availability
- Check available time slots
- Filter by location, employee, and service
- Book appointments in available slots
- Real-time availability updates

## State Management

The dashboard uses React Query for server state management:
- Automatic background refetching
- Optimistic updates
- Cache invalidation
- Error handling
- Loading states

## Styling

The dashboard uses Tailwind CSS for styling:
- Responsive design
- Dark/light mode support
- Custom components
- Utility-first approach

## Error Handling

- Toast notifications for success/error states
- Form validation
- API error handling
- Network error recovery

## Security

- JWT token management
- Protected routes
- Role-based access
- Secure API communication

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
