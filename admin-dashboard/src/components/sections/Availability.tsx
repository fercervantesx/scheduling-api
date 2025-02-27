import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface AvailabilityFormData {
  locationId: string;
  employeeId: string;
  serviceId: string;
  date: Date | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
  employeeId: string;
  employeeName: string;
}

interface AvailabilityResponse {
  date: string;
  timeSlots: TimeSlot[];
}

/* 
  This type represents time slots returned from the API.
  We're using a type annotation on the map function parameters 
  to avoid TypeScript errors without using this explicitly.
*/

export default function Availability() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AvailabilityFormData>({
    locationId: '',
    employeeId: '',
    serviceId: '',
    date: new Date(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/services', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const { data: availabilityData = { date: '', timeSlots: [] }, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['availability', formData],
    queryFn: async () => {
      if (!formData.locationId || !formData.employeeId || !formData.serviceId || !formData.date) {
        return { date: '', timeSlots: [] } as AvailabilityResponse;
      }

      const token = await getAccessTokenSilently();
      const response = await api.get('/availability', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          locationId: formData.locationId,
          employeeId: formData.employeeId,
          serviceId: formData.serviceId,
          date: formData.date.toISOString().split('T')[0],
        },
      });
      return response.data as AvailabilityResponse;
    },
    enabled: !!(formData.locationId && formData.employeeId && formData.serviceId && formData.date),
  });
  
  // Extract slots from the response
  const availableSlots = availabilityData.timeSlots || [];

  const createAppointment = useMutation({
    mutationFn: async ({ startTime }: { startTime: string }) => {
      const token = await getAccessTokenSilently();
      const response = await api.post(
        '/appointments',
        {
          serviceId: formData.serviceId,
          locationId: formData.locationId,
          employeeId: formData.employeeId,
          startTime: `${formData.date?.toISOString().split('T')[0]}T${startTime}:00`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', formData] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked successfully', {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });
    },
    onError: (_error) => {
      toast.error('Failed to book appointment', {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
    },
  });

  const handleBookSlot = (time: string) => {
    if (!formData.serviceId || !formData.locationId || !formData.employeeId) {
      toast.error('Please select all required fields', {
        duration: 3000,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
      return;
    }
    createAppointment.mutate({ startTime: time });
  };

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Check Availability</h2>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
          >
            <option value="">Select location</option>
            {locations.map((loc: any) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Employee
          </label>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          >
            <option value="">Select employee</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service
          </label>
          <select
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={formData.serviceId}
            onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
          >
            <option value="">Select service</option>
            {services.map((service: any) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={formData.date ? formData.date.toISOString().split('T')[0] : ''}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setFormData({ ...formData, date: e.target.value ? new Date(e.target.value) : null })}
          />
        </div>
      </div>

      {isLoadingSlots ? (
        <p className="text-gray-600">Loading available slots...</p>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Available Time Slots</h3>
          {availableSlots.length === 0 ? (
            <p className="text-gray-500">No available slots for the selected criteria</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {availableSlots.map((slot: TimeSlot, index: number) => (
                <button
                  key={index}
                  onClick={() => handleBookSlot(slot.time)}
                  disabled={createAppointment.isPending || !slot.available}
                  className={`
                    p-4 rounded-lg text-center transition-colors duration-200
                    ${createAppointment.isPending
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : !slot.available
                      ? 'bg-red-50 text-red-700 cursor-not-allowed'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }
                  `}
                >
                  <div className="font-medium">
                    {formatTimeSlot(slot.time)}
                  </div>
                  <div className="text-sm opacity-75">
                    {slot.employeeName}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 