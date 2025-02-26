# Next.js Migration Plan: Admin Dashboard Implementation

## 1. Dashboard Layout

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { TRPCProvider } from '@/utils/trpc';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import Loading from '@/components/ui/Loading';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get session on the server
  const session = await getServerSession(authOptions);
  
  // If not authenticated, redirect to login
  if (!session) {
    redirect('/login');
  }
  
  return (
    <TRPCProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            <Suspense fallback={<Loading />}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </TRPCProvider>
  );
}
```

## 2. Navigation and Sidebar

Create `src/components/dashboard/Sidebar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { trpc } from '@/utils/trpc';
import { useBranding } from '@/hooks/use-branding';
import { 
  IconLocation, 
  IconEmployees, 
  IconServices, 
  IconSchedule, 
  IconAppointments, 
  IconAvailability,
  IconTenants,
  IconBranding,
  IconPlan,
  IconLogout
} from '@/components/ui/icons';

const navigationItems = [
  { path: '/dashboard/locations', label: 'Locations', icon: IconLocation },
  { path: '/dashboard/employees', label: 'Employees', icon: IconEmployees },
  { path: '/dashboard/services', label: 'Services', icon: IconServices },
  { path: '/dashboard/schedules', label: 'Schedules', icon: IconSchedule },
  { path: '/dashboard/appointments', label: 'Appointments', icon: IconAppointments },
  { path: '/dashboard/availability', label: 'Availability', icon: IconAvailability },
  { path: '/dashboard/branding', label: 'Branding', icon: IconBranding },
  { path: '/dashboard/my-plan', label: 'My Plan', icon: IconPlan },
  { path: '/dashboard/tenants', label: 'Tenants', icon: IconTenants, admin: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { branding } = useBranding();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Check if we're on the system admin dashboard
  const isSystemAdmin = window.location.hostname.startsWith('admin.') || 
                        window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
  
  // Filter navigation items based on role
  const filteredNavItems = navigationItems.filter(item => {
    // Only show Tenants tab to system admins
    if (item.admin && !isSystemAdmin) {
      return false;
    }
    // Only show Plan tab to tenant users
    if (item.path === '/dashboard/my-plan' && isSystemAdmin) {
      return false;
    }
    return true;
  });
  
  return (
    <aside className={`bg-white border-r transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!isCollapsed && <span className="font-semibold text-lg">Scheduling App</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="p-1 rounded hover:bg-gray-100"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      
      {/* User info */}
      {!isCollapsed && session?.user && (
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            {session.user.image && (
              <img 
                src={session.user.image} 
                alt={session.user.name || ''} 
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-sm">{session.user.name}</p>
              <p className="text-xs text-gray-500">{session.user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="p-2">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`
                    flex items-center p-2 rounded-md transition-colors
                    ${isActive 
                      ? 'bg-primary bg-opacity-10 text-primary' 
                      : 'text-gray-700 hover:bg-gray-100'}
                  `}
                  style={isActive ? { color: branding.primaryColor } : {}}
                >
                  <item.icon className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Logout button */}
      <div className="absolute bottom-0 w-full p-4 border-t">
        <button
          onClick={() => signOut()}
          className="flex items-center w-full p-2 text-red-600 rounded-md hover:bg-red-50"
        >
          <IconLogout className={`w-5 h-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
```

## 3. Branding Context

Create `src/hooks/use-branding.tsx`:

```tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trpc } from '@/utils/trpc';

export interface BrandingData {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
}

interface BrandingContextType {
  branding: BrandingData;
  isLoading: boolean;
  error: string | null;
  updateBranding: (data: BrandingData) => void;
}

const defaultBranding: BrandingData = {
  logo: '',
  primaryColor: '#3b82f6', // Default blue
  secondaryColor: '#10b981', // Default green
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  isLoading: false,
  error: null,
  updateBranding: () => {},
});

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<BrandingData>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { data: featuresData } = trpc.tenant.getFeatures.useQuery(undefined, {
    enabled: !hasInitialized,
    retry: false,
    onError: () => {
      setIsLoading(false);
      // Continue with default branding on error - might be system admin or no features yet
    }
  });
  
  const { data: brandingData } = trpc.tenant.getBranding.useQuery(undefined, {
    enabled: featuresData?.features.includes('customBranding') && !hasInitialized,
    retry: false,
    onError: (err) => {
      console.error('Failed to load branding:', err);
      setError('Failed to load branding settings');
      setIsLoading(false);
    },
    onSuccess: (data) => {
      if (data) {
        const newBranding = {
          logo: data.logo || '',
          primaryColor: data.primaryColor || defaultBranding.primaryColor,
          secondaryColor: data.secondaryColor || defaultBranding.secondaryColor,
        };
        
        setBranding(newBranding);
        applyBrandingToCss(newBranding);
      }
      setIsLoading(false);
      setHasInitialized(true);
    }
  });
  
  function applyBrandingToCss(brandingData: BrandingData) {
    document.documentElement.style.setProperty('--primary-color', brandingData.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', brandingData.secondaryColor);
  }
  
  // Also initialize on client-side
  useEffect(() => {
    applyBrandingToCss(branding);
  }, []);
  
  const updateBranding = (data: BrandingData) => {
    setBranding(data);
    applyBrandingToCss(data);
  };
  
  return (
    <BrandingContext.Provider value={{ branding, isLoading, error, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
```

## 4. Page Layouts for Admin

Create `src/app/(dashboard)/dashboard/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to locations page for the main dashboard view
  redirect('/dashboard/locations');
}
```

Example of a dashboard page - `src/app/(dashboard)/dashboard/locations/page.tsx`:

```tsx
import { Suspense } from 'react';
import LocationsList from '@/components/locations/LocationsList';
import CreateLocationForm from '@/components/locations/CreateLocationForm';
import Loading from '@/components/ui/Loading';
import { PageHeader } from '@/components/ui/PageHeader';

export default function LocationsPage() {
  return (
    <div>
      <PageHeader
        title="Locations"
        description="Manage your business locations"
      />
      
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<Loading />}>
            <LocationsList />
          </Suspense>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Add New Location</h2>
          <CreateLocationForm />
        </div>
      </div>
    </div>
  );
}
```

## 5. Admin Components

Location list component - `src/components/locations/LocationsList.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { LocationForm } from '@/components/locations/LocationForm';
import { toast } from 'react-hot-toast';

export default function LocationsList() {
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);
  
  const utils = trpc.useUtils();
  const { data: locations, isLoading } = trpc.locations.getAll.useQuery();
  
  const { mutate: deleteLocation, isLoading: isDeleting } = trpc.locations.delete.useMutation({
    onSuccess: () => {
      toast.success('Location deleted successfully');
      utils.locations.getAll.invalidate();
      setIsConfirmOpen(false);
      setLocationToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete location');
    }
  });
  
  const handleDelete = (id: string) => {
    setLocationToDelete(id);
    setIsConfirmOpen(true);
  };
  
  const confirmDelete = () => {
    if (locationToDelete) {
      deleteLocation({ id: locationToDelete });
    }
  };
  
  if (isLoading) {
    return <div className="animate-pulse">Loading locations...</div>;
  }
  
  if (!locations?.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No locations found. Add your first location to get started.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {locations.map((location) => (
        <Card key={location.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{location.name}</h3>
              <p className="text-gray-500 text-sm">{location.address}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingLocation(location.id)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                color="danger"
                onClick={() => handleDelete(location.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      {/* Edit dialog */}
      {editingLocation && (
        <Dialog
          isOpen={!!editingLocation}
          onClose={() => setEditingLocation(null)}
          title="Edit Location"
        >
          <LocationForm
            locationId={editingLocation}
            onSuccess={() => {
              utils.locations.getAll.invalidate();
              setEditingLocation(null);
            }}
          />
        </Dialog>
      )}
      
      {/* Delete confirmation */}
      <Dialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Deletion"
      >
        <div className="p-4">
          <p>Are you sure you want to delete this location? This action cannot be undone.</p>
          <p className="text-sm text-gray-500 mt-2">
            Note: All appointments at this location will be automatically cancelled.
          </p>
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={confirmDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
```

Location form - `src/components/locations/LocationForm.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { locationSchema } from '@/lib/validations';
import { trpc } from '@/utils/trpc';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { z } from 'zod';

type LocationFormValues = z.infer<typeof locationSchema>;

interface LocationFormProps {
  locationId?: string;
  onSuccess?: () => void;
}

export function LocationForm({ locationId, onSuccess }: LocationFormProps) {
  // Get location data if editing
  const { data: location, isLoading: isLoadingLocation } = trpc.locations.getById.useQuery(
    { id: locationId! },
    { enabled: !!locationId }
  );
  
  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      address: '',
    },
  });
  
  // Update form with location data when available
  useEffect(() => {
    if (location) {
      reset({
        name: location.name,
        address: location.address,
      });
    }
  }, [location, reset]);
  
  // Mutations
  const utils = trpc.useUtils();
  const createLocation = trpc.locations.create.useMutation({
    onSuccess: () => {
      toast.success('Location created successfully');
      reset();
      utils.locations.getAll.invalidate();
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create location');
    },
  });
  
  const updateLocation = trpc.locations.update.useMutation({
    onSuccess: () => {
      toast.success('Location updated successfully');
      utils.locations.getAll.invalidate();
      if (locationId) utils.locations.getById.invalidate({ id: locationId });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update location');
    },
  });
  
  // Form submission
  const onSubmit = async (data: LocationFormValues) => {
    if (locationId) {
      // Update existing location
      updateLocation.mutate({ id: locationId, data });
    } else {
      // Create new location
      createLocation.mutate(data);
    }
  };
  
  if (locationId && isLoadingLocation) {
    return <div className="animate-pulse">Loading location data...</div>;
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <Input
          id="name"
          placeholder="Location name"
          {...register('name')}
          error={errors.name?.message}
        />
      </div>
      
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <TextArea
          id="address"
          placeholder="Full address"
          rows={3}
          {...register('address')}
          error={errors.address?.message}
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={createLocation.isPending || updateLocation.isPending}
        >
          {locationId ? 'Update Location' : 'Create Location'}
        </Button>
      </div>
    </form>
  );
}
```

## 6. UI Components

Button - `src/components/ui/Button.tsx`:

```tsx
'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useBranding } from '@/hooks/use-branding';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-700",
        ghost: "hover:bg-gray-100 text-gray-700",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
      color: {
        default: "",
        secondary: "bg-secondary text-white hover:bg-secondary/90",
        danger: "bg-red-600 text-white hover:bg-red-700",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      color: "default",
    },
  }
);

export interface ButtonProps 
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, color, isLoading, children, style, ...props }, ref) => {
    const { branding } = useBranding();
    
    // Custom style for branding colors
    let customStyle = { ...style };
    if (variant === 'default' && color === 'default') {
      customStyle.backgroundColor = branding.primaryColor;
    } else if (color === 'secondary') {
      customStyle.backgroundColor = branding.secondaryColor;
    }
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, color, className }))}
        ref={ref}
        disabled={isLoading || props.disabled}
        style={customStyle}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

## 7. Admin Root Layout

Finally, update `src/app/layout.tsx`:

```tsx
import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { BrandingProvider } from '@/hooks/use-branding';
import { AuthProvider } from '@/providers/auth-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Scheduling Dashboard',
  description: 'Manage your appointments, employees, and more',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen')}>
        <AuthProvider>
          <BrandingProvider>
            <Toaster position="top-right" />
            {children}
          </BrandingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

Auth provider - `src/providers/auth-provider.tsx`:

```tsx
'use client';

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```