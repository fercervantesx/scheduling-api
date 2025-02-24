# Scheduling Admin Dashboard

A React-based admin dashboard for managing appointments, locations, and availability.

## Features

- 🔐 Auth0 Authentication
- 📅 Appointment Management
- 📍 Location Management
- ⏰ Availability Checking
- 🎯 TypeScript Support
- 🎨 Modern UI with Tailwind CSS
- 🔄 Real-time Updates with React Query

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
```
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

## Auth0 Setup

1. Create a new Single Page Application in Auth0
2. Add `http://localhost:5173` to the Allowed Callback URLs
3. Add `http://localhost:5173` to the Allowed Logout URLs
4. Add `http://localhost:5173` to the Allowed Web Origins
5. Copy the Domain, Client ID, and API Audience to your `.env` file

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
src/
  ├── components/        # React components
  │   ├── sections/     # Main section components
  │   └── ...          # Other components
  ├── utils/           # Utility functions
  └── App.tsx          # Main application component
```

## Features

### Locations
- View all locations
- Add new locations
- Edit existing locations
- Delete locations

### Appointments
- View all appointments
- Create new appointments
- Update appointment status
- Filter appointments by date and location

### Availability
- Check available time slots
- Select location, employee, and service
- View available slots for a specific date

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License.
