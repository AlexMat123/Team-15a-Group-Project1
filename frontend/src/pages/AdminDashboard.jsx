import { Users, FileText, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const AdminDashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Users', value: '0', icon: Users, color: 'bg-blue-500' },
    { label: 'Reports Analyzed', value: '0', icon: FileText, color: 'bg-green-500' },
    { label: 'Total Errors Found', value: '0', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Time Saved', value: '0h', icon: Clock, color: 'bg-amber-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and monitor system analytics</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700 text-sm">
            <span className="font-semibold">Local AI Processing - Client Data Protected</span>
            <br />
            All AI processing is performed locally on your servers. Your confidential client data never leaves your infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Welcome, {user?.name}!
          </h2>
          <p className="text-gray-600">
            You are logged in as <span className="font-semibold capitalize">{user?.role?.replace('_', ' ')}</span>.
          </p>
          <p className="text-gray-500 mt-2">
            Full admin dashboard features will be implemented in Phase 5.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
