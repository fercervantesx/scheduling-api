import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth0 } from '@auth0/auth0-react';

interface TenantPlan {
  plan: 'FREE' | 'BASIC' | 'PRO';
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  trialEndsAt?: string;
  features: string[];
}

export default function MyPlan() {
  const [tenantPlan, setTenantPlan] = useState<TenantPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchTenantPlan = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await api.get('/tenant/plan', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setTenantPlan(response.data);
      } catch (err) {
        setError('Failed to load tenant plan information');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantPlan();
  }, [getAccessTokenSilently]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative mb-4">
        {error}
      </div>
    );
  }

  // If no plan information is available, show placeholder
  if (!tenantPlan) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">My Plan</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative mb-4">
            Plan information is currently unavailable. Please contact support if this issue persists.
          </div>
        </div>
      </div>
    );
  }

  // Format trial end date if available
  const trialEndsAtFormatted = tenantPlan.trialEndsAt 
    ? new Date(tenantPlan.trialEndsAt).toLocaleDateString() 
    : null;

  // Determine days left in trial
  const daysLeftInTrial = tenantPlan.trialEndsAt 
    ? Math.ceil((new Date(tenantPlan.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Plan</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Plan Header */}
        <div className="bg-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{tenantPlan.plan} Plan</h2>
              <p className="text-blue-100">
                Status: <span className="font-medium">{tenantPlan.status}</span>
              </p>
            </div>
            <div className="text-right">
              {tenantPlan.status === 'TRIAL' && (
                <div className="bg-yellow-400 text-blue-800 rounded-full px-3 py-1 text-sm font-bold">
                  Trial: {daysLeftInTrial} days left
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Trial Message */}
        {tenantPlan.status === 'TRIAL' && (
          <div className="bg-yellow-50 p-4 border-b border-yellow-100">
            <p className="text-yellow-800">
              <span className="font-bold">Trial Period:</span> Your trial will end on {trialEndsAtFormatted}. 
              Upgrade to continue using all features after your trial expires.
            </p>
          </div>
        )}
        
        {/* Plan Features */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Included Features</h3>
          <ul className="space-y-2">
            {tenantPlan.features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Upgrade Section */}
        <div className="bg-gray-50 p-6 border-t border-gray-100">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <p className="text-gray-700 mb-4 md:mb-0">
              {tenantPlan.plan !== 'PRO' ? 
                "Need more features? Upgrade your plan for additional capabilities." :
                "You're on our top-tier plan with access to all premium features."}
            </p>
            {tenantPlan.plan !== 'PRO' && (
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors">
                Upgrade Plan
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Plan Comparison */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Plan Comparison</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FREE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BASIC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Locations</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Unlimited</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Employees</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">5</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">25</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Unlimited</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Custom Branding</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">API Access</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Webhooks</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Advanced Analytics</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Basic</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Advanced</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}