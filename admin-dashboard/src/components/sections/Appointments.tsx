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

  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/appointments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
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
    queryKey: ['employees', formData.locationId],
    queryFn: async () => {
      if (!formData.locationId) return [];
      const token = await getAccessTokenSilently();
      const response = await api.get('/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.filter((employee: any) =>
        employee.locations.some((loc: any) => loc.locationId === formData.locationId)
      );
    },
    enabled: !!formData.locationId,
  });

  const { data: availableSlots = [], isLoading: _isLoadingSlots } = useQuery({
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
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete appointment');
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

      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appointments.map((appointment: any) => (
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
                    ${appointment.status === 'SCHEDULED' ? 'bg-green-100 text-green-800' : ''}
                    ${appointment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : ''}
                    ${appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : ''}
                  `}>
                    {appointment.status}
                  </span>
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
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => updateAppointmentStatus.mutate({
                          id: appointment.id,
                          status: 'CANCELLED',
                        })}
                      >
                        Cancel
                      </button>
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
                    {locations.map((loc: any) => (
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
                    {services.map((service: any) => (
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
                    {employees.map((emp: any) => (
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
                      {availableSlots.map((slot: any, index: number) => (
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