import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface Location {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

interface LocationFormData {
  name: string;
  address: string;
}

enum ModalMode {
  CREATE,
  EDIT
}

// Sorting types
type SortField = 'name' | 'address' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function Locations() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(ModalMode.CREATE);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
  });
  
  // Add sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/locations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const createLocation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const token = await getAccessTokenSilently();
      const response = await api.post('/locations', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsModalOpen(false);
      setFormData({ name: '', address: '' });
      toast.success('Location created successfully');
    },
    onError: () => {
      toast.error('Failed to create location');
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LocationFormData }) => {
      const token = await getAccessTokenSilently();
      const response = await api.put(`/locations/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsModalOpen(false);
      setCurrentLocationId(null);
      setFormData({ name: '', address: '' });
      toast.success('Location updated successfully');
    },
    onError: () => {
      toast.error('Failed to update location');
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently();
      const response = await api.delete(`/locations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted successfully');
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      
      // Check if it's a conflict error with relationships
      if (error.response?.status === 409) {
        const details = error.response?.data?.details || {};
        const { employeeCount, scheduleCount, appointmentCount } = details;
        
        let errorMessage = 'Cannot delete location with existing relationships: ';
        if (employeeCount > 0) errorMessage += `${employeeCount} employees, `;
        if (scheduleCount > 0) errorMessage += `${scheduleCount} schedules, `;
        if (appointmentCount > 0) errorMessage += `${appointmentCount} appointments, `;
        
        // Remove trailing comma and space
        errorMessage = errorMessage.replace(/, $/, '');
        
        toast.error(errorMessage);
      } else {
        toast.error('Failed to delete location');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (modalMode === ModalMode.CREATE) {
      createLocation.mutate(formData);
    } else if (modalMode === ModalMode.EDIT && currentLocationId) {
      updateLocation.mutate({ id: currentLocationId, data: formData });
    }
  };
  
  const handleEditClick = (location: Location) => {
    setModalMode(ModalMode.EDIT);
    setCurrentLocationId(location.id);
    setFormData({
      name: location.name,
      address: location.address,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Are you sure? This will permanently delete the location and cannot be undone.')) {
      deleteLocation.mutate(id);
    }
  };

  const handleAddLocation = () => {
    setModalMode(ModalMode.CREATE);
    setCurrentLocationId(null);
    setFormData({ name: '', address: '' });
    setIsModalOpen(true);
  };
  
  // Sorting and filtering functions
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
  
  // Filter locations by search query
  const filteredLocations = locations.filter((location: Location) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      location.name.toLowerCase().includes(query) ||
      location.address.toLowerCase().includes(query)
    );
  });

  // Sort locations
  const sortedLocations = [...filteredLocations].sort((a: Location, b: Location) => {
    let compareA, compareB;
    
    // Extract the right field for comparison
    switch (sortField) {
      case 'name':
        compareA = a.name;
        compareB = b.name;
        break;
      case 'address':
        compareA = a.address;
        compareB = b.address;
        break;
      case 'createdAt':
        compareA = new Date(a.createdAt).getTime();
        compareB = new Date(b.createdAt).getTime();
        break;
      default:
        compareA = a.name;
        compareB = b.name;
    }
    
    if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Locations</h2>
        <button
          onClick={handleAddLocation}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Location
        </button>
      </div>
      
      {/* Search Controls */}
      <div className="px-4 py-3 bg-gray-50 border-t border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="w-1/3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations..."
              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Name
                {sortField === 'name' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('address')}
              >
                Address
                {sortField === 'address' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                Created At
                {sortField === 'createdAt' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLocations.map((location: Location) => (
              <tr key={location.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(location.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={() => handleEditClick(location)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => handleDeleteClick(location.id)}
                    >
                      Delete
                    </button>
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {modalMode === ModalMode.CREATE ? 'Add New Location' : 'Edit Location'}
                </h3>
                
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
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    disabled={createLocation.isPending || updateLocation.isPending}
                  >
                    {modalMode === ModalMode.CREATE 
                      ? (createLocation.isPending ? 'Creating...' : 'Create') 
                      : (updateLocation.isPending ? 'Updating...' : 'Update')
                    }
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