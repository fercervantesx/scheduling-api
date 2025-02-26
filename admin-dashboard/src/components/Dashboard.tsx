import Locations from './sections/Locations';
import Appointments from './sections/Appointments';
import Availability from './sections/Availability';
import Employees from './sections/Employees';
import Services from './sections/Services';
import Schedules from './sections/Schedules';
import Tenants from './sections/Tenants';
import MyPlan from './sections/MyPlan';
import Branding from './sections/Branding';

type TabType = 'tenants' | 'locations' | 'employees' | 'services' | 'schedules' | 'appointments' | 'availability' | 'plan' | 'branding';

interface DashboardProps {
  activeTab: TabType;
}

export default function Dashboard({ activeTab }: DashboardProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'tenants':
        return <Tenants />;
      case 'locations':
        return <Locations />;
      case 'employees':
        return <Employees />;
      case 'services':
        return <Services />;
      case 'schedules':
        return <Schedules />;
      case 'appointments':
        return <Appointments />;
      case 'availability':
        return <Availability />;
      case 'plan':
        return <MyPlan />;
      case 'branding':
        return <Branding />;
      default:
        return <Locations />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {renderContent()}
    </div>
  );
} 