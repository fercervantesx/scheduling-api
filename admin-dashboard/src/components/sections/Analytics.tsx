import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Chart components
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';
type Section = 'overview' | 'payments' | 'customers';

export default function Analytics() {
  const { getAccessTokenSilently } = useAuth0();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [period, setPeriod] = useState<Period>('month');

  // Main dashboard analytics
  const dashboardAnalytics = useQuery({
    queryKey: ['analytics', 'dashboard', period],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await api.get(`/analytics/dashboard?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast.error('Failed to fetch analytics data');
        throw error;
      }
    }
  });

  // Payment analytics
  const paymentAnalytics = useQuery({
    queryKey: ['analytics', 'payments', period],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await api.get(`/analytics/payments?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching payment analytics:', error);
        toast.error('Failed to fetch payment data');
        throw error;
      }
    },
    enabled: activeSection === 'payments'
  });

  // Customer analytics
  const customerAnalytics = useQuery({
    queryKey: ['analytics', 'customers', period],
    queryFn: async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await api.get(`/analytics/customers?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching customer analytics:', error);
        toast.error('Failed to fetch customer data');
        throw error;
      }
    },
    enabled: activeSection === 'customers'
  });

  // Helper function to format date ranges for display
  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  // CHART COLORS
  const COLORS = {
    SCHEDULED: '#3b82f6', // blue
    FULFILLED: '#10b981', // green
    CANCELLED: '#ef4444', // red
    PENDING: '#f59e0b',   // amber
    PAID: '#10b981',      // green
    UNPAID: '#f59e0b',    // amber
    REFUNDED: '#6b7280',  // gray
    DEFAULT: '#6b7280',   // gray
  };

  const getStatusColor = (status: string) => {
    return (COLORS as any)[status] || COLORS.DEFAULT;
  };

  // Format data for charts
  const prepareAppointmentChartData = (data: any) => {
    if (!data?.chartData) return [];
    
    // Group data by date
    const groupedByDate = data.chartData.reduce((acc: any, item: any) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { date };
      }
      acc[date][item.status] = Number(item.count);
      return acc;
    }, {});
    
    // Convert to array
    return Object.values(groupedByDate);
  };

  const preparePaymentChartData = (data: any) => {
    if (!data?.chartData) return [];
    
    // Group data by date
    const groupedByDate = data.chartData.reduce((acc: any, item: any) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { date };
      }
      acc[date][`${item.paymentStatus}_count`] = Number(item.count);
      acc[date][`${item.paymentStatus}_amount`] = Number(item.amount);
      return acc;
    }, {});
    
    // Convert to array
    return Object.values(groupedByDate);
  };

  // Prepare data for pie charts
  const prepareStatusPieData = (data: any) => {
    if (!data?.appointmentCounts?.byStatus) return [];
    
    return Object.entries(data.appointmentCounts.byStatus).map(([status, count]) => ({
      name: status,
      value: count as number
    }));
  };

  const preparePaymentStatusPieData = (data: any) => {
    if (!data?.paymentStats?.byStatus) return [];
    
    return Object.entries(data.paymentStats.byStatus).map(([status, details]) => ({
      name: status,
      value: (details as any).amount as number
    }));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewSection();
      case 'payments':
        return renderPaymentsSection();
      case 'customers':
        return renderCustomersSection();
      default:
        return renderOverviewSection();
    }
  };

  const renderOverviewSection = () => {
    const isLoading = dashboardAnalytics.isLoading;
    const data = dashboardAnalytics.data;
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative mb-4">
          Failed to load analytics data. Please try again.
        </div>
      );
    }

    const chartData = prepareAppointmentChartData(data);
    const pieData = prepareStatusPieData(data);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Appointments</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{data.appointmentCounts.total}</p>
            <div className="mt-2 text-xs text-gray-500">{formatDateRange(data.dateRange?.start, data.dateRange?.end)}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Fulfilled Appointments</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{data.appointmentCounts.byStatus?.FULFILLED || 0}</p>
            <div className="mt-2 text-xs text-gray-500">
              {((data.appointmentCounts.byStatus?.FULFILLED || 0) / data.appointmentCounts.total * 100).toFixed(1)}% fulfillment rate
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(data.revenue.total)}</p>
            <div className="mt-2 text-xs text-gray-500">From fulfilled appointments</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appointments Over Time</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="SCHEDULED" stackId="1" stroke={COLORS.SCHEDULED} fill={COLORS.SCHEDULED} />
                  <Area type="monotone" dataKey="FULFILLED" stackId="1" stroke={COLORS.FULFILLED} fill={COLORS.FULFILLED} />
                  <Area type="monotone" dataKey="CANCELLED" stackId="1" stroke={COLORS.CANCELLED} fill={COLORS.CANCELLED} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Appointment Status Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} appointments`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Popular Services & Busiest Employees */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Most Popular Services</h3>
            {data.popularServices && data.popularServices.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.popularServices}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="serviceName" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" name="Appointments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500">No service data available for this period</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Busiest Employees</h3>
            {data.busiestEmployees && data.busiestEmployees.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.busiestEmployees}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="employeeName" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" name="Appointments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500">No employee data available for this period</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentsSection = () => {
    const isLoading = paymentAnalytics.isLoading;
    const data = paymentAnalytics.data;
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative mb-4">
          Failed to load payment analytics data. Please try again.
        </div>
      );
    }

    const chartData = preparePaymentChartData(data);
    const pieData = preparePaymentStatusPieData(data);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(data.paymentStats.total)}</p>
            <div className="mt-2 text-xs text-gray-500">{formatDateRange(data.dateRange?.start, data.dateRange?.end)}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Paid Appointments</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{data.paymentStats.byStatus?.PAID?.count || 0}</p>
            <div className="mt-2 text-xs text-gray-500">
              {formatCurrency(data.paymentStats.byStatus?.PAID?.amount || 0)} total revenue
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Unpaid Appointments</h3>
            <p className="text-3xl font-bold text-amber-600 mt-2">{data.paymentStats.byStatus?.UNPAID?.count || 0}</p>
            <div className="mt-2 text-xs text-gray-500">
              Potential revenue: {formatCurrency(data.paymentStats.byStatus?.UNPAID?.amount || 0)}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value, name) => {
                    const nameStr = String(name);
                    if (nameStr.includes('amount')) {
                      return [formatCurrency(value as number), nameStr.split('_')[0]];
                    }
                    return [value, nameStr.split('_')[0]];
                  }} />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="PAID_amount" 
                    stroke={COLORS.PAID} 
                    name="Revenue" 
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="PAID_count" 
                    stroke="#94a3b8" 
                    name="Appointments" 
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Services by Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Services by Revenue</h3>
          {data.serviceRevenue && data.serviceRevenue.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.serviceRevenue}
                  margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="serviceName" angle={-45} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'totalAmount') {
                      return [formatCurrency(value as number), 'Revenue'];
                    }
                    return [value, name];
                  }} />
                  <Legend />
                  <Bar dataKey="totalAmount" fill="#3b82f6" name="Revenue" />
                  <Bar dataKey="count" fill="#10b981" name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No service revenue data available for this period</p>
          )}
        </div>
      </div>
    );
  };

  const renderCustomersSection = () => {
    const isLoading = customerAnalytics.isLoading;
    const data = customerAnalytics.data;
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative mb-4">
          Failed to load customer analytics data. Please try again.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{data.uniqueCustomers}</p>
            <div className="mt-2 text-xs text-gray-500">{formatDateRange(data.dateRange?.start, data.dateRange?.end)}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Repeat Customers</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{data.retention.repeatCustomers}</p>
            <div className="mt-2 text-xs text-gray-500">
              {data.retention.repeatRate.toFixed(1)}% retention rate
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Appointments per Customer</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{(data.totalAppointments / data.uniqueCustomers).toFixed(1)}</p>
            <div className="mt-2 text-xs text-gray-500">
              {data.totalAppointments} total appointments
            </div>
          </div>
        </div>

        {/* Top Customers Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers by Appointments</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointments
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topCustomersByCount.map((customer: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.appointmentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Customers by Revenue</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Spend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topCustomersByRevenue.map((customer: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.appointmentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(customer.totalSpend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Analyze your business performance with detailed metrics and reports.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
        {/* Section Tabs */}
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setActiveSection('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
              activeSection === 'overview'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('payments')}
            className={`px-4 py-2 text-sm font-medium ${
              activeSection === 'payments'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Payments
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('customers')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
              activeSection === 'customers'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Customers
          </button>
        </div>

        {/* Time Period Selection */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Main Content */}
      {renderSection()}
    </div>
  );
}