import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../utils/api';

export interface BrandingData {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
}

interface BrandingContextType {
  branding: BrandingData;
  isLoading: boolean;
  error: string | null;
  updateBranding: (data: BrandingData) => void;
}

const defaultBranding: BrandingData = {
  logo: '',
  primaryColor: '#3b82f6', // Default blue
  secondaryColor: '#10b981', // Default green
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  isLoading: false,
  error: null,
  updateBranding: () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [branding, setBranding] = useState<BrandingData>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      const token = await getAccessTokenSilently();
      
      // First check if the tenant has custom branding feature
      const featureResponse = await api.get('/tenant/features', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const hasCustomBranding = featureResponse.data.features.includes('customBranding');
      
      if (hasCustomBranding) {
        // Fetch current branding settings
        const brandingResponse = await api.get('/tenant/branding', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (brandingResponse.data) {
          setBranding({
            logo: brandingResponse.data.logo || '',
            primaryColor: brandingResponse.data.primaryColor || defaultBranding.primaryColor,
            secondaryColor: brandingResponse.data.secondaryColor || defaultBranding.secondaryColor
          });
          
          // Apply CSS variables
          document.documentElement.style.setProperty('--primary-color', brandingResponse.data.primaryColor || defaultBranding.primaryColor);
          document.documentElement.style.setProperty('--secondary-color', brandingResponse.data.secondaryColor || defaultBranding.secondaryColor);
        }
      }
    } catch (error) {
      console.error('Error fetching branding data:', error);
      setError('Failed to load branding settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBranding = (data: BrandingData) => {
    setBranding(data);
    
    // Update CSS variables when branding changes
    document.documentElement.style.setProperty('--primary-color', data.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', data.secondaryColor);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBranding();
    }
  }, [isAuthenticated]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, error, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};