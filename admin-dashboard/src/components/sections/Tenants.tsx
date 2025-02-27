import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

type PlanId = 'FREE' | 'BASIC' | 'PRO';
type FeatureKey = 'customBranding' | 'apiAccess' | 'webhooks' | 'multipleLocations' | 'analytics';

interface TenantFormData {
  name: string;
  subdomain: string;
  customDomain?: string;
  email?: string;
  plan: PlanId;
}

const PLANS = [
  { id: 'FREE' as const, name: 'Free', price: 0 },
  { id: 'BASIC' as const, name: 'Basic', price: 29 },
  { id: 'PRO' as const, name: 'Professional', price: 99 },
] as const;

const FEATURES: Record<FeatureKey, { label: string; plans: readonly PlanId[] }> = {
  customBranding: { label: 'Custom Branding', plans: ['BASIC', 'PRO'] as const },
  apiAccess: { label: 'API Access', plans: ['PRO'] as const },
  webhooks: { label: 'Webhooks', plans: ['PRO'] as const },
  multipleLocations: { label: 'Multiple Locations', plans: ['BASIC', 'PRO'] as const },
  analytics: { label: 'Advanced Analytics', plans: ['PRO'] as const },
} as const;

export default function Tenants() {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    subdomain: '',
    email: '',
    plan: 'FREE',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        console.log('Got token for /admin/tenants request');
        const response = await api.get('/admin/tenants', {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching tenants:', error);
        throw error;
      }
    },
  });
  
  const tenants = data?.tenants || [];
  
  // Using underscore prefix for unused variables to avoid TypeScript warnings
  const { /* data: tenantDetails, */ isLoading: _isDetailLoading } = useQuery({
    queryKey: ['tenant-details'],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        // Get the first tenant for detailed stats (in a real app, this would be selected by the user)
        if (tenants && tenants.length > 0) {
          console.log('Fetching details for tenant:', tenants[0].id);
          const response = await api.get(`/admin/tenants/${tenants[0].id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return response.data;
        }
        return null;
      } catch (error) {
        console.error('Error fetching tenant details:', error);
        return null;
      }
    },
    enabled: tenants && tenants.length > 0,
  });

  const createTenant = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const token = await getAccessTokenSilently();
      const response = await api.post('/admin/tenants', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        subdomain: '',
        email: '',
        plan: 'FREE',
      });
      toast.success('Tenant created successfully');
    },
    onError: () => {
      toast.error('Failed to create tenant');
    },
  });

  const updateTenantStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = await getAccessTokenSilently();
      const response = await api.patch(`/admin/tenants/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant status updated');
    },
    onError: (error) => {
      console.error('Error updating tenant status:', error);
      toast.error('Failed to update tenant status');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTenant.mutate(formData);
  };

  const handlePlanChange = (plan: PlanId) => {
    setFormData(prev => ({
      ...prev,
      plan,
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tenants</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{tenants.length}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Tenants</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {tenants.filter((t: any) => t.status === 'ACTIVE').length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Trial Tenants</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {tenants.filter((t: any) => t.status === 'TRIAL').length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Tenants</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Tenant
          </button>
        </div>

        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subdomain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant: any) => (
                <tr key={tenant.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tenant.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <a
                      href={`https://${tenant.subdomain}.${window.location.host}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {tenant.subdomain}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {tenant.plan}
                      </span>
                      <div className="relative inline-block text-left">
                        <button 
                          type="button"
                          className="text-blue-600 hover:text-blue-900 text-xs"
                          onClick={() => {
                            const selectEl = document.getElementById(`plan-select-${tenant.id}`);
                            if (selectEl) selectEl.classList.toggle('hidden');
                          }}
                        >
                          Change
                        </button>
                        <div id={`plan-select-${tenant.id}`} className="hidden origin-top-right absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1" role="menu">
                            {PLANS.map(plan => (
                              <button
                                key={plan.id}
                                className={`block w-full text-left px-4 py-2 text-sm ${tenant.plan === plan.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} hover:bg-gray-100`}
                                onClick={async () => {
                                  try {
                                    const token = await getAccessTokenSilently();
                                    await api.patch(`/admin/tenants/${tenant.id}/plan`, 
                                      { plan: plan.id },
                                      { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                    queryClient.invalidateQueries({ queryKey: ['tenants'] });
                                    document.getElementById(`plan-select-${tenant.id}`)?.classList.add('hidden');
                                    toast.success(`Plan updated to ${plan.name}`);
                                  } catch (error) {
                                    toast.error('Failed to update plan');
                                    console.error(error);
                                  }
                                }}
                              >
                                {plan.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'TRIAL' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      {tenant.status !== 'ACTIVE' && (
                        <button
                          onClick={() => updateTenantStatus.mutate({ id: tenant.id, status: 'ACTIVE' })}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activate
                        </button>
                      )}
                      {tenant.status !== 'SUSPENDED' && (
                        <button
                          onClick={() => updateTenantStatus.mutate({ id: tenant.id, status: 'SUSPENDED' })}
                          className="text-red-600 hover:text-red-900"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                    Company Name
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
                  <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700">
                    Subdomain
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="subdomain"
                      className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase() })}
                      required
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                      .{window.location.host}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700">
                    Custom Domain (Optional)
                  </label>
                  <input
                    type="text"
                    id="customDomain"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.customDomain || ''}
                    onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                    placeholder="app.example.com"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Admin Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@example.com"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Email address for the tenant administrator</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Plan</label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    {PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handlePlanChange(plan.id)}
                        className={`
                          relative px-4 py-3 border rounded-md shadow-sm text-sm font-medium
                          ${formData.plan === plan.id
                            ? 'border-blue-500 ring-2 ring-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                          }
                        `}
                      >
                        <div className="text-lg font-semibold">{plan.name}</div>
                        <div className="mt-1">${plan.price}/mo</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Features Included</label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-3">{PLANS.find(p => p.id === formData.plan)?.name} Plan Includes:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(FEATURES).map(([key, feature]) => {
                        const isIncluded = feature.plans.includes(formData.plan);
                        return (
                          <div key={key} className={`flex items-center p-2 rounded ${isIncluded ? 'bg-blue-50' : 'opacity-60'}`}>
                            {isIncluded ? (
                              <svg className="h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5 text-gray-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className={`${isIncluded ? 'font-medium' : 'text-gray-500'}`}>
                              {feature.label}
                              {!isIncluded && (
                                <span className="ml-1 text-xs text-gray-500">
                                  (Available in {feature.plans.join(' & ')})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                    disabled={createTenant.isPending}
                  >
                    {createTenant.isPending ? 'Creating...' : 'Create'}
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