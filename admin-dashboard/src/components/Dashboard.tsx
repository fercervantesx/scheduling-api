import { useState } from 'react';
import Locations from './sections/Locations';
import Appointments from './sections/Appointments';
import Availability from './sections/Availability';
import Employees from './sections/Employees';
import Services from './sections/Services';
import Schedules from './sections/Schedules';

type TabType = 'locations' | 'employees' | 'services' | 'schedules' | 'appointments' | 'availability';

interface DashboardProps {
  activeTab: TabType;
}

export default function Dashboard({ activeTab }: DashboardProps) {
  const renderContent = () => {
    switch (activeTab) {
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
        return <Locations />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {renderContent()}
    </div>
  );
} 