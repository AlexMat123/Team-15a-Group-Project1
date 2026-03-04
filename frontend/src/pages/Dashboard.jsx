import { Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">QC Report Analyzer</h1>
          <p className="text-gray-600">Upload a PDF report to detect errors automatically</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload QC Report
            </h3>
            <p className="text-gray-500 mb-4">
              Select a PDF file to analyze
            </p>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
              Choose File
            </button>
            <p className="text-xs text-gray-400 mt-4">
              PDF files only, max 10MB
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
          <p className="font-semibold">Welcome, {user?.name}!</p>
          <p>Upload functionality will be implemented in Phase 2.</p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
