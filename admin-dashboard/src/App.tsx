import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';

const queryClient = new QueryClient();

const baseNavigationItems = [
  { id: 'tenants', label: 'Tenants', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )},
  { id: 'locations', label: 'Locations', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
  { id: 'employees', label: 'Employees', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )},
  { id: 'services', label: 'Services', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )},
  { id: 'schedules', label: 'Schedules', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )},
  { id: 'appointments', label: 'Appointments', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { id: 'availability', label: 'Availability', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { id: 'plan', label: 'My Plan', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )},
] as const;

type NavigationItemId = typeof baseNavigationItems[number]['id'];

function AppContent() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<NavigationItemId>('locations');
  
  // Check if we're on the system admin dashboard
  const isSystemAdmin = useMemo(() => {
    const hostname = window.location.hostname;
    return hostname.startsWith('admin.') || 
           hostname === 'localhost' || 
           hostname === '127.0.0.1';
  }, []);

  // Filter navigation items based on user role
  const navigationItems = useMemo(() => {
    return baseNavigationItems.filter(item => {
      // Only show Tenants tab to system admins
      if (item.id === 'tenants' && !isSystemAdmin) {
        return false;
      }
      // Only show Plan tab to tenant users
      if (item.id === 'plan' && isSystemAdmin) {
        return false;
      }
      return true;
    });
  }, [isSystemAdmin]);

  if (!isAuthenticated) {
    return <Login onLogin={loginWithRedirect} />;
  }

  const handleNavigation = (tabId: NavigationItemId) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-10">
        <div className="h-full px-4 flex items-center">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold ml-4">Scheduling Admin Dashboard</h1>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-16 left-0 bottom-0 w-64 bg-white shadow-sm transform transition-transform duration-200 ease-in-out z-20
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt={user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            
            {/* Tenant Selector */}
            <div className="mt-4">
              <label htmlFor="tenant-selector" className="block text-xs font-medium text-gray-500 mb-1">
                Tenant ID
              </label>
              <select
                id="tenant-selector"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
                value={localStorage.getItem('currentTenantId') || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    localStorage.setItem('currentTenantId', value);
                    window.location.reload(); // Reload the page to apply the new tenant
                  } else {
                    localStorage.removeItem('currentTenantId');
                    window.location.reload();
                  }
                }}
              >
                <option value="">Select Tenant</option>
                <option value="itinaritravel">Itinari Travel</option>
                <option value="demo">Demo Salon</option>
              </select>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`
                  flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out group
                  ${activeTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors duration-150 ease-in-out group"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        pt-16 min-h-screen transition-all duration-200 ease-in-out
        ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}
      `}>
        <div className="p-6">
          <Dashboard activeTab={activeTab} />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
    >
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" />
        <AppContent />
      </QueryClientProvider>
    </Auth0Provider>
  );
}
