import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  serviceId: string;
  locationId: string;
  employeeId: string;
  startTime: string;
  status: string;
  bookedBy: string;
  bookedByName: string;
  createdAt: string;
  updatedAt: string;
  service: {
    id: string;
    name: string;
    duration: number;
  };
  location: {
    id: string;
    name: string;
  };
  employee: {
    id: string;
    name: string;
  };
  isPastDue: boolean;
}

export default function PastDueAppointments() {
  const queryClient = useQueryClient();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Fetch past due appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['pastDueAppointments'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/appointments', {
        headers: { Authorization: `Bearer ${token}` },
        params: { pastDue: 'true' },
      });
      return response.data;
    },
  });

  // Mutations for handling appointments
  const fulfillAppointment = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently();
      const response = await api.patch(
        `/appointments/${id}`,
        { status: 'FULFILLED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastDueAppointments'] });
      toast.success('Appointment marked as fulfilled');
    },
    onError: () => {
      toast.error('Failed to update appointment status');
    },
  });

  const cancelAppointment = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const token = await getAccessTokenSilently();
      const response = await api.delete(`/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { cancel_reason: reason },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastDueAppointments'] });
      setSelectedAppointment(null);
      toast.success('Appointment cancelled successfully');
    },
    onError: () => {
      toast.error('Failed to cancel appointment');
    },
  });

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      // Sort by date (oldest first)
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [appointments]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!appointments.length) return { count: 0, oldestDays: 0, revenue: 0 };
    
    const now = new Date();
    const oldest = Math.min(...appointments.map(a => new Date(a.startTime).getTime()));
    const oldestDays = Math.floor((now.getTime() - oldest) / (1000 * 60 * 60 * 24));
    
    // Assuming each appointment has a price, otherwise default to 0
    const revenue = appointments.reduce((sum, app) => sum + (app.service?.price || 0), 0);
    
    return {
      count: appointments.length,
      oldestDays,
      revenue
    };
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Past Due Appointments</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage appointments that are past their scheduled time but haven't been fulfilled or cancelled.
        </p>
      </div>
      
      {/* Stats section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div className="bg-yellow-50 overflow-hidden shadow rounded-lg border border-yellow-200">
          <div className="px-4 py-5 sm:p-6">
            <dl>
              <dt className="text-sm font-medium text-yellow-800 truncate">Past Due Count</dt>
              <dd className="mt-1 text-3xl font-semibold text-yellow-900">{stats.count}</dd>
            </dl>
          </div>
        </div>
        <div className="bg-red-50 overflow-hidden shadow rounded-lg border border-red-200">
          <div className="px-4 py-5 sm:p-6">
            <dl>
              <dt className="text-sm font-medium text-red-800 truncate">Oldest Appointment</dt>
              <dd className="mt-1 text-3xl font-semibold text-red-900">{stats.oldestDays} days</dd>
            </dl>
          </div>
        </div>
        <div className="bg-blue-50 overflow-hidden shadow rounded-lg border border-blue-200">
          <div className="px-4 py-5 sm:p-6">
            <dl>
              <dt className="text-sm font-medium text-blue-800 truncate">Potential Revenue</dt>
              <dd className="mt-1 text-3xl font-semibold text-blue-900">${stats.revenue}</dd>
            </dl>
          </div>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No past due appointments</h3>
          <p className="mt-1 text-sm text-gray-500">All appointments have been properly handled. Great job!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAppointments.map((appointment) => (
                <tr key={appointment.id} className="bg-red-50 hover:bg-red-100">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{appointment.bookedByName}</div>
                    <div className="text-sm text-gray-500">{appointment.bookedBy}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{appointment.service?.name}</div>
                    <div className="text-sm text-gray-500">{appointment.service?.duration} min</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-red-700 font-medium">
                      {format(new Date(appointment.startTime), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-red-600">
                      {format(new Date(appointment.startTime), 'h:mm a')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.employee?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {appointment.location?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-green-600 hover:text-green-900 mr-3"
                      onClick={() => fulfillAppointment.mutate(appointment.id)}
                    >
                      Mark Fulfilled
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancellation modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          <div className="relative bg-white rounded-lg max-w-md w-full mx-auto p-6 shadow-xl">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Cancel Past Due Appointment</h3>
                <div className="mt-4">
                  <div className="text-sm text-gray-500 mb-4">
                    Please provide a reason for cancelling this appointment.
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-sm"
                    rows={3}
                    placeholder="Cancellation reason"
                    id="cancelReason"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  const reason = (document.getElementById('cancelReason') as HTMLTextAreaElement).value;
                  cancelAppointment.mutate({ id: selectedAppointment.id, reason });
                }}
              >
                Cancel Appointment
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:w-auto sm:text-sm"
                onClick={() => setSelectedAppointment(null)}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}