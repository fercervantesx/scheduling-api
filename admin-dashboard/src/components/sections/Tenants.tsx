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
  plan: PlanId;
  features: Record<FeatureKey, boolean>;
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
    plan: 'FREE',
    features: {
      customBranding: false,
      apiAccess: false,
      webhooks: false,
      multipleLocations: false,
      analytics: false,
    },
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const token = await getAccessTokenSilently();
      const response = await api.get('/admin/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
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
        plan: 'FREE',
        features: {
          customBranding: false,
          apiAccess: false,
          webhooks: false,
          multipleLocations: false,
          analytics: false,
        },
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
      const response = await api.patch(`/admin/tenants/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant status updated');
    },
    onError: () => {
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
      features: {
        customBranding: FEATURES.customBranding.plans.includes(plan as any),
        apiAccess: FEATURES.apiAccess.plans.includes(plan as any),
        webhooks: FEATURES.webhooks.plans.includes(plan as any),
        multipleLocations: FEATURES.multipleLocations.plans.includes(plan as any),
        analytics: FEATURES.analytics.plans.includes(plan as any),
      },
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
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
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {tenant.plan}
                  </span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                  <div className="space-y-2">
                    {Object.entries(FEATURES).map(([key, feature]) => (
                      <div key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          id={key}
                          checked={formData.features[key as keyof typeof formData.features]}
                          disabled={!feature.plans.includes(formData.plan)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            features: {
                              ...prev.features,
                              [key]: e.target.checked
                            }
                          }))}
                        />
                        <label htmlFor={key} className="ml-2 block text-sm text-gray-900">
                          {feature.label}
                          {!feature.plans.includes(formData.plan) && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Available in {feature.plans.join(' & ')})
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
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