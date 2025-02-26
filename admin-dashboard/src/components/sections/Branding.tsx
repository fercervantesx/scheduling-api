import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useBranding, BrandingData } from '../../context/BrandingContext';

export default function Branding() {
  const { getAccessTokenSilently } = useAuth0();
  const [brandingData, setBrandingData] = useState<BrandingData>({
    logo: '',
    primaryColor: '#3b82f6', // Default blue
    secondaryColor: '#10b981' // Default green
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasCustomBranding, setHasCustomBranding] = useState(false);

  useEffect(() => {
    const fetchTenantBranding = async () => {
      try {
        setLoading(true);
        const token = await getAccessTokenSilently();
        
        // First, check if the tenant has the customBranding feature
        const featureResponse = await api.get('/tenant/features', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const hasFeature = featureResponse.data.features.includes('customBranding');
        setHasCustomBranding(hasFeature);
        
        if (hasFeature) {
          // Fetch current branding settings
          const brandingResponse = await api.get('/tenant/branding', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (brandingResponse.data) {
            setBrandingData({
              logo: brandingResponse.data.logo || '',
              primaryColor: brandingResponse.data.primaryColor || '#3b82f6',
              secondaryColor: brandingResponse.data.secondaryColor || '#10b981'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching branding data:', error);
        toast.error('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    };

    fetchTenantBranding();
  }, [getAccessTokenSilently]);

  const { updateBranding } = useBranding();
  
  const handleSaveBranding = async () => {
    try {
      setSaving(true);
      const token = await getAccessTokenSilently();
      
      await api.patch('/tenant/branding', brandingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update global branding context
      updateBranding(brandingData as BrandingData);
      
      toast.success('Branding settings saved successfully');
    } catch (error) {
      console.error('Error saving branding data:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBrandingData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!hasCustomBranding) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Custom Branding</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded relative">
          <p className="font-medium">Custom Branding is not available on your current plan.</p>
          <p className="mt-2">Upgrade to BASIC or PRO plan to customize your application's appearance.</p>
          <div className="mt-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6">Custom Branding</h1>
      
      <div className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
            Logo
          </label>
          
          <div className="mt-1 flex items-center">
            <input
              type="file"
              id="logo-upload"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  try {
                    const file = e.target.files[0];
                    const formData = new FormData();
                    formData.append('logo', file);
                    
                    // Show loading state
                    toast.loading('Uploading logo...', { id: 'logo-upload' });
                    
                    const token = await getAccessTokenSilently();
                    const response = await api.post('/tenant/branding/logo', formData, {
                      headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                      }
                    });
                    
                    // Update logo URL in state
                    setBrandingData(prev => ({
                      ...prev,
                      logo: response.data.logo
                    }));
                    
                    toast.success('Logo uploaded successfully', { id: 'logo-upload' });
                  } catch (error) {
                    console.error('Error uploading logo:', error);
                    toast.error('Failed to upload logo', { id: 'logo-upload' });
                  }
                }
              }}
            />
            
            {brandingData.logo ? (
              <div className="flex items-center space-x-4">
                <img 
                  src={brandingData.logo} 
                  alt="Current logo" 
                  className="h-12 w-auto object-contain border border-gray-200 rounded p-1"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9nbyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-600 hover:border-blue-800 rounded"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBrandingData(prev => ({
                        ...prev,
                        logo: ''
                      }));
                    }}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-600 hover:border-red-800 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => document.getElementById('logo-upload')?.click()}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Logo
              </button>
            )}
          </div>
          
          <p className="mt-1 text-sm text-gray-500">
            Upload your company logo. Recommended size: 200x50px. Maximum size: 2MB.
          </p>
          
          {/* Note: In production, migrate to externally hosted images (S3, etc.) for better performance and reliability */}
        </div>
        
        {/* Primary Color */}
        <div>
          <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1">
            Primary Color
          </label>
          <div className="flex items-center">
            <input
              type="color"
              id="primaryColor"
              name="primaryColor"
              value={brandingData.primaryColor || '#3b82f6'}
              onChange={handleInputChange}
              className="h-10 w-10 border border-gray-300 rounded-l-md"
            />
            <input
              type="text"
              value={brandingData.primaryColor || '#3b82f6'}
              onChange={handleInputChange}
              name="primaryColor"
              className="rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Used for buttons, links, and primary actions.
          </p>
          <div 
            className="mt-2 h-12 rounded-md flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: brandingData.primaryColor }}
          >
            Primary Color Preview
          </div>
        </div>
        
        {/* Secondary Color */}
        <div>
          <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-1">
            Secondary Color
          </label>
          <div className="flex items-center">
            <input
              type="color"
              id="secondaryColor"
              name="secondaryColor"
              value={brandingData.secondaryColor || '#10b981'}
              onChange={handleInputChange}
              className="h-10 w-10 border border-gray-300 rounded-l-md"
            />
            <input
              type="text"
              value={brandingData.secondaryColor || '#10b981'}
              onChange={handleInputChange}
              name="secondaryColor"
              className="rounded-r-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pl-3"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Used for accents, highlights, and secondary elements.
          </p>
          <div 
            className="mt-2 h-12 rounded-md flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: brandingData.secondaryColor }}
          >
            Secondary Color Preview
          </div>
        </div>
        
        {/* Preview Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
          
          <div className="border border-gray-200 rounded-lg p-4 shadow-sm">
            {/* Header with logo */}
            <div className="bg-gray-800 text-white p-4 flex items-center justify-between rounded-t-md"
                 style={{ backgroundColor: brandingData.primaryColor }}>
              {brandingData.logo ? (
                <img 
                  src={brandingData.logo} 
                  alt="Company Logo" 
                  className="h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9nbyBQcmV2aWV3PC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
              ) : (
                <span className="font-bold text-lg">Your Company</span>
              )}
              <div className="flex items-center space-x-4">
                <span>Dashboard</span>
                <span>Settings</span>
                <span>Profile</span>
              </div>
            </div>
            
            {/* Content with buttons using both colors */}
            <div className="p-4 bg-white">
              <h3 className="text-lg font-medium mb-4">Dashboard</h3>
              
              <div className="flex space-x-4 mb-6">
                <button 
                  className="px-4 py-2 rounded text-white"
                  style={{ backgroundColor: brandingData.primaryColor }}
                >
                  Primary Button
                </button>
                <button 
                  className="px-4 py-2 rounded text-white"
                  style={{ backgroundColor: brandingData.secondaryColor }}
                >
                  Secondary Button
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-md p-4 mb-4">
                <h4 className="font-medium mb-2">Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-2">
                    <div className="text-2xl font-bold" style={{ color: brandingData.primaryColor }}>245</div>
                    <div className="text-sm text-gray-500">Appointments</div>
                  </div>
                  <div className="text-center p-2">
                    <div className="text-2xl font-bold" style={{ color: brandingData.secondaryColor }}>18</div>
                    <div className="text-sm text-gray-500">Services</div>
                  </div>
                  <div className="text-center p-2">
                    <div className="text-2xl font-bold" style={{ color: brandingData.primaryColor }}>6</div>
                    <div className="text-sm text-gray-500">Employees</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSaveBranding}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            style={{ backgroundColor: saving ? '#9CA3AF' : brandingData.primaryColor }}
          >
            {saving ? 'Saving...' : 'Save Branding Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}