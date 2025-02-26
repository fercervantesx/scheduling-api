import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface WeekdaySchedule {
  weekday: string;
  startTime: string;
  endTime: string;
}

interface ScheduleFormData {
  employeeId: string;
  locationId: string;
  schedules: WeekdaySchedule[];
  blockType: 'WORKING_HOURS' | 'BREAK' | 'VACATION';
}

const WEEKDAYS = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

type SortField = 'employee' | 'location' | 'weekday' | 'startTime' | 'endTime' | 'blockType';
type SortDirection = 'asc' | 'desc';

export default function Schedules() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ScheduleFormData>({
    employeeId: '',
    locationId: '',
    schedules: [],
    blockType: 'WORKING_HOURS',
  });
  
  // Add sorting and filtering state
  const [sortField, setSortField] = useState<SortField>('employee');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');

  const { data: schedules = [], isLoading: isLoadingSchedules, error: _schedulesError } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await api.get('/schedules', {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      } catch (error: any) {
        console.error('Schedules fetch error:', error.response?.data || error);
        throw error;
      }
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

  const createSchedule = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const token = await getAccessTokenSilently();
      
      // Create schedules sequentially instead of in parallel
      const results = [];
      for (const schedule of data.schedules) {
        const scheduleData = {
          employeeId: data.employeeId,
          locationId: data.locationId,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          weekday: schedule.weekday,
          blockType: data.blockType,
        };
        
        try {
          const response = await api.post('/schedules', scheduleData, {
            headers: { Authorization: `Bearer ${token}` },
          });
          results.push(response.data);
        } catch (error: any) {
          console.error('Schedule creation error:', {
            error: error.response?.data || error,
            scheduleData,
          });
          throw error;
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setIsModalOpen(false);
      setFormData({
        employeeId: '',
        locationId: '',
        schedules: [],
        blockType: 'WORKING_HOURS',
      });
      toast.success('Schedule(s) created successfully');
    },
    onError: (error: any) => {
      console.error('Schedule creation error:', {
        error: error.response?.data || error,
        formData,
      });
      toast.error(error.response?.data?.error || 'Failed to create schedule');
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const token = await getAccessTokenSilently();
      const response = await api.delete(`/schedules/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Schedule deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete schedule');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.locationId || formData.schedules.length === 0) {
      toast.error('Please fill in all fields and select at least one weekday');
      return;
    }
    createSchedule.mutate(formData);
  };

  const handleWeekdayToggle = (weekday: string) => {
    setFormData(prev => {
      const exists = prev.schedules.find(s => s.weekday === weekday);
      if (exists) {
        return {
          ...prev,
          schedules: prev.schedules.filter(s => s.weekday !== weekday),
        };
      }
      return {
        ...prev,
        schedules: [
          ...prev.schedules,
          { weekday, startTime: '09:00', endTime: '17:00' },
        ],
      };
    });
  };

  const handleTimeChange = (weekday: string, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.map(schedule =>
        schedule.weekday === weekday
          ? { ...schedule, [field]: value }
          : schedule
      ),
    }));
  };

  const filteredEmployees = formData.locationId
    ? employees.filter((emp: any) =>
        emp.locations.some((loc: any) => loc.locationId === formData.locationId)
      )
    : employees;

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

  // Get all unique employees for the filter
  const uniqueEmployees: Array<{id: string, name: string}> = Array.from(new Set(schedules.map((s: any) => s.employeeId)))
    .map((employeeId) => {
      const schedule = schedules.find((s: any) => s.employeeId === employeeId);
      return {
        id: employeeId as string,
        name: schedule?.employee?.name || 'Unknown Employee'
      };
    });

  // Filtering function
  const filteredSchedules = schedules.filter((schedule: any) => {
    if (!employeeFilter) return true;
    return schedule.employeeId === employeeFilter;
  });

  // Sorting function
  const sortedSchedules = [...filteredSchedules].sort((a: any, b: any) => {
    let compareA, compareB;
    
    // Extract the right field for comparison
    switch (sortField) {
      case 'employee':
        compareA = a.employee.name;
        compareB = b.employee.name;
        break;
      case 'location':
        compareA = a.location.name;
        compareB = b.location.name;
        break;
      case 'weekday':
        // Custom order for weekdays
        const weekdayOrder: Record<string, number> = { 
          'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 
          'FRIDAY': 5, 'SATURDAY': 6, 'SUNDAY': 7 
        };
        compareA = weekdayOrder[a.weekday as string] || 0;
        compareB = weekdayOrder[b.weekday as string] || 0;
        break;
      case 'startTime':
        compareA = a.startTime;
        compareB = b.startTime;
        break;
      case 'endTime':
        compareA = a.endTime;
        compareB = b.endTime;
        break;
      case 'blockType':
        compareA = a.blockType;
        compareB = b.blockType;
        break;
      default:
        compareA = a.employee.name;
        compareB = b.employee.name;
    }
    
    if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  if (isLoadingSchedules) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Schedules</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Schedule
        </button>
      </div>
      
      {/* Filter Controls */}
      <div className="px-4 py-3 bg-gray-50 border-t border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label htmlFor="employeeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Employee
            </label>
            <select
              id="employeeFilter"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Employees</option>
              {uniqueEmployees.map((employee: {id: string, name: string}) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="ml-auto">
            <p className="text-sm text-gray-500">
              {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                onClick={() => handleSort('location')}
              >
                Location
                {sortField === 'location' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('weekday')}
              >
                Weekday
                {sortField === 'weekday' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('startTime')}
              >
                Start Time
                {sortField === 'startTime' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('endTime')}
              >
                End Time
                {sortField === 'endTime' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('blockType')}
              >
                Type
                {sortField === 'blockType' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSchedules.map((schedule: any) => (
              <tr key={schedule.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.employee.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.location.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.weekday}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.startTime}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.endTime}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.blockType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => {
                      if (window.confirm('Are you sure? This will affect availability calculations.')) {
                        deleteSchedule.mutate(schedule.id);
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
                    {filteredEmployees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Working Days and Hours
                  </label>
                  <div className="space-y-4">
                    {WEEKDAYS.map(day => {
                      const schedule = formData.schedules.find(s => s.weekday === day.value);
                      return (
                        <div key={day.value} className="flex items-start space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-2"
                              checked={!!schedule}
                              onChange={() => handleWeekdayToggle(day.value)}
                            />
                            <span className="text-sm text-gray-900 w-24 mt-2">{day.label}</span>
                          </label>
                          {schedule && (
                            <div className="flex space-x-2 flex-1">
                              <input
                                type="time"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={schedule.startTime}
                                onChange={(e) => handleTimeChange(day.value, 'startTime', e.target.value)}
                                required
                              />
                              <input
                                type="time"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                value={schedule.endTime}
                                onChange={(e) => handleTimeChange(day.value, 'endTime', e.target.value)}
                                required
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="blockType" className="block text-sm font-medium text-gray-700">
                    Schedule Type
                  </label>
                  <select
                    id="blockType"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.blockType}
                    onChange={(e) => setFormData({ ...formData, blockType: e.target.value as any })}
                    required
                  >
                    <option value="WORKING_HOURS">Working Hours</option>
                    <option value="BREAK">Break</option>
                    <option value="VACATION">Vacation</option>
                  </select>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    disabled={createSchedule.isPending}
                  >
                    {createSchedule.isPending ? 'Creating...' : 'Create'}
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