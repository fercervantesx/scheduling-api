import { useState } from 'react';
import Locations from './sections/Locations';
import Appointments from './sections/Appointments';
import Availability from './sections/Availability';
import Employees from './sections/Employees';
import Services from './sections/Services';
import Schedules from './sections/Schedules';

type TabType = 'locations' | 'employees' | 'services' | 'schedules' | 'appointments' | 'availability';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('locations');

  const tabs: { value: TabType; label: string }[] = [
    { value: 'locations', label: 'Locations' },
    { value: 'employees', label: 'Employees' },
    { value: 'services', label: 'Services' },
    { value: 'schedules', label: 'Schedules' },
    { value: 'appointments', label: 'Appointments' },
    { value: 'availability', label: 'Availability' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'locations' && <Locations />}
        {activeTab === 'employees' && <Employees />}
        {activeTab === 'services' && <Services />}
        {activeTab === 'schedules' && <Schedules />}
        {activeTab === 'appointments' && <Appointments />}
        {activeTab === 'availability' && <Availability />}
      </div>
    </div>
  );
} 