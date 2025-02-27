import Locations from './sections/Locations';
import Appointments from './sections/Appointments';
import Availability from './sections/Availability';
import Employees from './sections/Employees';
import Services from './sections/Services';
import Schedules from './sections/Schedules';
import Tenants from './sections/Tenants';
import MyPlan from './sections/MyPlan';
import Branding from './sections/Branding';
import Analytics from './sections/Analytics';
import PastDueAppointments from './sections/PastDueAppointments';

type TabType = 'tenants' | 'pastDueAppointments' | 'locations' | 'employees' | 'services' | 'schedules' | 'appointments' | 'availability' | 'analytics' | 'plan' | 'branding';

interface DashboardProps {
  activeTab: TabType;
}

export default function Dashboard({ activeTab }: DashboardProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'tenants':
        return <Tenants />;
      case 'pastDueAppointments':
        return <PastDueAppointments />;
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
      case 'analytics':
        return <Analytics />;
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