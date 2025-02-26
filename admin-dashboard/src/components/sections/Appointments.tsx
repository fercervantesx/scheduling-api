import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface AppointmentFormData {
  serviceId: string;
  locationId: string;
  employeeId: string;
  date: Date | null;
  selectedSlot: Date | null;
}

interface CreateAppointmentData {
  serviceId: string;
  locationId: string;
  employeeId: string;
  startTime: Date;
}

// Sorting and filtering types
type SortField = 'service' | 'location' | 'employee' | 'date' | 'status' | 'customer';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  serviceId: string;
  locationId: string;
  employeeId: string;
  status: string;
  customer: string;
  dateRange: {
    start: string;
    end: string;
  };
}

// API response types
interface Location {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: string;
  name: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  name: string;
  locations: Array<{
    locationId: string;
    location: Location;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Appointment {
  id: string;
  serviceId: string;
  locationId: string;
  employeeId: string;
  startTime: string;
  status: string;
  bookedBy: string;
  bookedByName: string;
  service: Service;
  location: Location;
  employee: Employee;
  fulfillmentDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface AvailabilitySlot {
  startTime: string;
  endTime: string;
}

interface AvailabilityResponse {
  slots: AvailabilitySlot[];
}

export default function Appointments() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    serviceId: '',
    locationId: '',
    employeeId: '',
    date: new Date(),
    selectedSlot: null,
  });
  
  // Add sorting and filtering state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({
    serviceId: '',
    locationId: '',
    employeeId: '',
    status: '',
    customer: '',
    dateRange: {
      start: '',
      end: '',
    },
  });
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<Appointment[]>({
    queryKey: ['appointments'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/services', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', formData.locationId],
    queryFn: async () => {
      if (!formData.locationId) return [];
      const token = await getAccessTokenSilently();
      const response = await api.get<Employee[]>('/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.filter((employee) =>
        employee.locations.some((loc) => loc.locationId === formData.locationId)
      );
    },
    enabled: !!formData.locationId,
  });

  // Get all employees for filtering
  const { data: allEmployees = [] } = useQuery<Employee[]>({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get<Employee[]>('/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const { data: availabilityData = { slots: [] as AvailabilitySlot[] }, isLoading: _isLoadingSlots } = useQuery<AvailabilityResponse>({
    queryKey: ['availability', formData],
    queryFn: async () => {
      if (!formData.locationId || !formData.employeeId || !formData.serviceId || !formData.date) {
        return { slots: [] };
      }

      const token = await getAccessTokenSilently();
      const response = await api.get<AvailabilityResponse>('/availability', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          locationId: formData.locationId,
          employeeId: formData.employeeId,
          serviceId: formData.serviceId,
          date: formData.date.toISOString().split('T')[0],
        },
      });
      return response.data;
    },
    enabled: !!(formData.locationId && formData.employeeId && formData.serviceId && formData.date),
  });
  
  // Extract slots from the response
  const availableSlots = availabilityData.slots || [];

  const createAppointment = useMutation({
    mutationFn: async (data: CreateAppointmentData) => {
      const token = await getAccessTokenSilently();
      const response = await api.post('/appointments', {
        ...data,
        startTime: data.startTime.toISOString(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsModalOpen(false);
      setFormData({
        serviceId: '',
        locationId: '',
        employeeId: '',
        date: null,
        selectedSlot: null,
      });
      toast.success('Appointment created successfully');
    },
    onError: () => {
      toast.error('Failed to create appointment');
    },
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = await getAccessTokenSilently();
      const response = await api.patch(
        `/appointments/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment status updated');
    },
    onError: () => {
      toast.error('Failed to update appointment status');
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently();
      const response = await api.delete(`/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment deleted successfully');
    },
    onError: (error: Error | unknown) => {
      const errorResponse = error as { response?: { data?: { error?: string } } };
      toast.error(errorResponse.response?.data?.error || 'Failed to delete appointment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceId || !formData.locationId || !formData.employeeId || !formData.selectedSlot) {
      toast.error('Please fill in all fields');
      return;
    }
    createAppointment.mutate({
      serviceId: formData.serviceId,
      locationId: formData.locationId,
      employeeId: formData.employeeId,
      startTime: formData.selectedSlot,
    });
  };

  // Filtering functions
  const resetFilters = () => {
    setFilters({
      serviceId: '',
      locationId: '',
      employeeId: '',
      status: '',
      customer: '',
      dateRange: {
        start: '',
        end: '',
      },
    });
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((appointment) => {
    // Filter by service
    if (filters.serviceId && appointment.serviceId !== filters.serviceId) {
      return false;
    }
    
    // Filter by location
    if (filters.locationId && appointment.locationId !== filters.locationId) {
      return false;
    }
    
    // Filter by employee
    if (filters.employeeId && appointment.employeeId !== filters.employeeId) {
      return false;
    }
    
    // Filter by status
    if (filters.status && appointment.status !== filters.status) {
      return false;
    }
    
    // Filter by customer (bookedBy or bookedByName)
    if (filters.customer) {
      const customerSearch = filters.customer.toLowerCase();
      const matchesEmail = appointment.bookedBy.toLowerCase().includes(customerSearch);
      const matchesName = appointment.bookedByName.toLowerCase().includes(customerSearch);
      if (!matchesEmail && !matchesName) {
        return false;
      }
    }
    
    // Filter by date range
    if (filters.dateRange.start) {
      const appointmentDate = new Date(appointment.startTime);
      const startDate = new Date(filters.dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      if (appointmentDate < startDate) {
        return false;
      }
    }
    
    if (filters.dateRange.end) {
      const appointmentDate = new Date(appointment.startTime);
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      if (appointmentDate > endDate) {
        return false;
      }
    }
    
    return true;
  });

  // Sorting function
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sorted appointments
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    let compareA: string | number, compareB: string | number;
    
    // Extract the right field for comparison
    switch (sortField) {
      case 'service':
        compareA = a.service.name;
        compareB = b.service.name;
        break;
      case 'location':
        compareA = a.location.name;
        compareB = b.location.name;
        break;
      case 'employee':
        compareA = a.employee.name;
        compareB = b.employee.name;
        break;
      case 'date':
        compareA = new Date(a.startTime).getTime();
        compareB = new Date(b.startTime).getTime();
        break;
      case 'status':
        compareA = a.status;
        compareB = b.status;
        break;
      case 'customer':
        compareA = a.bookedByName;
        compareB = b.bookedByName;
        break;
      default:
        compareA = new Date(a.startTime).getTime();
        compareB = new Date(b.startTime).getTime();
    }
    
    if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoadingAppointments) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Appointments</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          New Appointment
        </button>
      </div>
      
      {/* Filter Controls */}
      <div className="px-4 py-3 bg-gray-50 border-t border-b border-gray-200">
        <div className="flex justify-between mb-2">
          <button 
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
          >
            {isFilterExpanded ? 'Hide Filters' : 'Show Filters'} 
            <svg className={`ml-1 h-5 w-5 transform ${isFilterExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className="text-sm text-gray-500">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} found
          </div>
        </div>
        
        {isFilterExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div>
              <label htmlFor="serviceFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                id="serviceFilter"
                value={filters.serviceId}
                onChange={(e) => setFilters({...filters, serviceId: e.target.value})}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Services</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="locationFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                id="locationFilter"
                value={filters.locationId}
                onChange={(e) => setFilters({...filters, locationId: e.target.value})}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="employeeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                id="employeeFilter"
                value={filters.employeeId}
                onChange={(e) => setFilters({...filters, employeeId: e.target.value})}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Employees</option>
                {allEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="statusFilter"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="FULFILLED">Fulfilled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="customerFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Customer
              </label>
              <input
                type="text"
                id="customerFilter"
                value={filters.customer}
                onChange={(e) => setFilters({...filters, customer: e.target.value})}
                placeholder="Search by name or email"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              />
            </div>
            
            <div className="flex space-x-2">
              <div className="w-1/2">
                <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  id="startDateFilter"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters({
                    ...filters, 
                    dateRange: {...filters.dateRange, start: e.target.value}
                  })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
              <div className="w-1/2">
                <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  id="endDateFilter"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters({
                    ...filters, 
                    dateRange: {...filters.dateRange, end: e.target.value}
                  })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                />
              </div>
            </div>
            
            <div className="md:col-span-3 flex justify-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('service')}
              >
                Service
                {sortField === 'service' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('location')}
              >
                Location
                {sortField === 'location' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('employee')}
              >
                Employee
                {sortField === 'employee' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                Date & Time
                {sortField === 'date' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status
                {sortField === 'status' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('customer')}
              >
                Booked By
                {sortField === 'customer' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedAppointments.map((appointment) => (
              <tr key={appointment.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {appointment.service.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {appointment.location.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {appointment.employee.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(appointment.startTime).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${appointment.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' : ''}
                    ${appointment.status === 'FULFILLED' ? 'bg-green-100 text-green-800' : ''}
                    ${appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {appointment.status}
                  </span>
                  {appointment.fulfillmentDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Fulfilled: {new Date(appointment.fulfillmentDate).toLocaleDateString()}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div>{appointment.bookedByName}</div>
                    <div className="text-xs text-gray-500">{appointment.bookedBy}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    {appointment.status === 'SCHEDULED' && (
                      <>
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => {
                            if (window.confirm('Mark this appointment as fulfilled? This indicates the service was completed and payment was received.')) {
                              updateAppointmentStatus.mutate({
                                id: appointment.id,
                                status: 'FULFILLED',
                              });
                            }
                          }}
                        >
                          Fulfill
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => updateAppointmentStatus.mutate({
                            id: appointment.id,
                            status: 'CANCELLED',
                          })}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {(appointment.status === 'CANCELLED' || new Date(appointment.startTime) < new Date()) && (
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this appointment?')) {
                            deleteAppointment.mutate(appointment.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <select
                    id="location"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.locationId}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        locationId: e.target.value,
                        employeeId: '',
                      });
                    }}
                    required
                  >
                    <option value="">Select location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700">
                    Service
                  </label>
                  <select
                    id="service"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    required
                  >
                    <option value="">Select service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} ({service.duration} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label htmlFor="employee" className="block text-sm font-medium text-gray-700">
                    Employee
                  </label>
                  <select
                    id="employee"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    disabled={!formData.locationId}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.date ? formData.date.toISOString().split('T')[0] : ''}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        date: e.target.value ? new Date(e.target.value) : null,
                        selectedSlot: null,
                      });
                    }}
                    required
                  />
                </div>

                {formData.date && availableSlots.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Time Slots
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`p-2 text-sm rounded-md ${
                            formData.selectedSlot?.getTime() === new Date(slot.startTime).getTime()
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          }`}
                          onClick={() => setFormData({
                            ...formData,
                            selectedSlot: new Date(slot.startTime),
                          })}
                        >
                          {new Date(slot.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'UTC'
                          })}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.date && availableSlots.length === 0 && (
                  <p className="text-sm text-gray-500 mb-4">
                    No available slots for the selected date
                  </p>
                )}

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    disabled={createAppointment.isPending}
                  >
                    {createAppointment.isPending ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 