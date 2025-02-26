import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface ServiceFormData {
  name: string;
  duration: number;
  price?: number;
}

export default function Services() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    duration: 30,
    price: undefined,
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/services', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const createService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const token = await getAccessTokenSilently();
      const response = await api.post('/services', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsModalOpen(false);
      setFormData({ name: '', duration: 30, price: undefined });
      toast.success('Service created successfully');
    },
    onError: () => {
      toast.error('Failed to create service');
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently();
      const response = await api.delete(`/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete service');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.duration) {
      toast.error('Please fill in all fields');
      return;
    }
    createService.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Services</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Service
        </button>
      </div>

      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (minutes)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.map((service: any) => (
              <tr key={service.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.duration} minutes</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {service.price ? `$${service.price.toFixed(2)}` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => {
                      if (window.confirm('Are you sure? This will affect availability calculations.')) {
                        deleteService.mutate(service.id);
                      }
                    }}
                  >
                    Delete
                  </button>
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    min="1"
                    max="480"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">Estimated time for this service (max 8 hours)</p>
                </div>

                <div className="mb-4">
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <input
                    type="number"
                    id="price"
                    step="0.01"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.price !== undefined ? formData.price : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ 
                        ...formData, 
                        price: value === '' ? undefined : parseFloat(value) 
                      });
                    }}
                  />
                  <p className="mt-1 text-sm text-gray-500">Leave empty if the service has no fixed price</p>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    disabled={createService.isPending}
                  >
                    {createService.isPending ? 'Creating...' : 'Create'}
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