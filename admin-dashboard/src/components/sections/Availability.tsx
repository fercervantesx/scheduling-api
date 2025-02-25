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
  startTime: string;
  endTime: string;
  displayTime?: string;
  localStartTime?: string;
  localEndTime?: string;
}

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

  const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery<TimeSlot[]>({
    queryKey: ['availability', formData],
    queryFn: async () => {
      if (!formData.locationId || !formData.employeeId || !formData.serviceId || !formData.date) {
        return [];
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
      return response.data;
    },
    enabled: !!(formData.locationId && formData.employeeId && formData.serviceId && formData.date),
  });

  const createAppointment = useMutation({
    mutationFn: async ({ startTime }: { startTime: string }) => {
      const token = await getAccessTokenSilently();
      const response = await api.post(
        '/appointments',
        {
          serviceId: formData.serviceId,
          locationId: formData.locationId,
          employeeId: formData.employeeId,
          startTime,
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

  const handleBookSlot = (startTime: string) => {
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
    createAppointment.mutate({ startTime });
  };

  const formatTimeSlot = (isoString: string) => {
    const date = new Date(isoString);
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
              {availableSlots.map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleBookSlot(slot.startTime)}
                  disabled={createAppointment.isPending}
                  className={`
                    p-4 rounded-lg text-center transition-colors duration-200
                    ${createAppointment.isPending
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }
                  `}
                >
                  <div className="font-medium">
                    {slot.localStartTime || formatTimeSlot(slot.startTime)}
                  </div>
                  <div className="text-sm opacity-75">
                    to {slot.localEndTime || formatTimeSlot(slot.endTime)}
                  </div>
                  {slot.displayTime && (
                    <div className="text-xs text-gray-500 mt-1">
                      {slot.displayTime}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 