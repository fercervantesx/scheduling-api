import Locations from './sections/Locations';
import Appointments from './sections/Appointments';
import Availability from './sections/Availability';
import Employees from './sections/Employees';
import Services from './sections/Services';
import Schedules from './sections/Schedules';
import Tenants from './sections/Tenants';

type TabType = 'tenants' | 'locations' | 'employees' | 'services' | 'schedules' | 'appointments' | 'availability';

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
      default:
        return <Tenants />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {renderContent()}
    </div>
  );
} 