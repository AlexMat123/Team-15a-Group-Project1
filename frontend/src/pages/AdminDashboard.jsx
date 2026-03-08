import { BarChart, Bar, XAxis, YAxis, PieChart, 
  Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import { Users, FileText, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';



const barData = [
  { name: 'Placeholder', errors: 24 },
  { name: 'Consistency', errors: 31 },
  { name: 'Compliance', errors: 16 },
  { name: 'Formatting', errors: 8 },
  { name: 'Missing Data', errors: 14 },
];

const pieData = [
  { name: 'Placeholder', value: 24 },
  { name: 'Consistency', value: 31 },
  { name: 'Compliance', value: 16 },
  { name: 'Formatting', value: 8 },
  { name: 'Missing Data', value: 14 },
];

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'];




const AdminDashboard = () => {

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [openTrainingMenu, setOpenTrainingMenu] = useState(null);
  
  const [userSearch, setUserSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');


  const stats = [
    { label: 'Total Users', value: '7', icon: Users, color: 'bg-blue-500' },
    { label: 'Reports Analyzed', value: '7', icon: FileText, color: 'bg-green-500' },
    { label: 'Total Errors Found', value: '56', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Time Saved', value: '21h', icon: Clock, color: 'bg-amber-500' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and monitor system analytics</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {['Overview', 'Users', 'Reports', 'AI Training'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 mr-2 ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'Overview' && (
          <>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Common Errors</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="errors" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Type Distribution</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Savings Analysis</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                      { label: 'Manual Review Time', value: '25h', bg: 'bg-purple-100', text: 'text-indigo-600' },
                      { label: 'AI Review Time', value: '4h', bg: 'bg-green-100', text: 'text-green-600' },
                      { label: 'Time Saved', value: '84%', bg: 'bg-purple-100', text: 'text-purple-600' },
                    ].map(item => (
                      <div key={item.label} className={`${item.bg} rounded-lg p-6 text-center`}>
                        <p className={`text-3xl font-bold ${item.text}`}>{item.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
              </div>
              <p className="text-center text-gray-500 mt-4 text-sm">
                Our AI has saved approximately <span className="text-indigo-600 font-bold">21 hours</span> of manual review work across all reports.
              </p>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'Users' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50">
                  <th className="pb-3 pt-3 px-2">USER</th>
                  <th className="pb-3 pt-3 px-2">EMAIL</th>
                  <th className="pb-3 pt-3 px-2">REPORTS</th>
                  <th className="pb-3 pt-3 px-2">JOINED</th>
                  <th className="pb-3 pt-3 px-2">STATUS</th>
                  <th className="pb-3 pt-3 px-2">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'John Smith', email: 'user@example.com', reports: 12, joined: 'Jan 15, 2026', active: true },
                  { name: 'Sarah Johnson', email: 'sarah.j@construction.com', reports: 8, joined: 'Jan 20, 2026', active: true },
                  { name: 'Michael Chen', email: 'mchen@builders.com', reports: 15, joined: 'Dec 10, 2025', active: true },
                  { name: 'Emily Rodriguez', email: 'e.rodriguez@qc.com', reports: 23, joined: 'Nov 5, 2025', active: true },
                  { name: 'David Park', email: 'dpark@engineering.com', reports: 6, joined: 'Feb 1, 2026', active: true },
                  { name: 'Lisa Anderson', email: 'l.anderson@contractors.com', reports: 19, joined: 'Oct 22, 2025', active: true },
                  { name: 'James Wilson', email: 'jwilson@inspect.com', reports: 4, joined: 'Feb 5, 2026', active: false },
                ]
                  .filter(u =>
                    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map(u => (
                    <tr key={u.email} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-4 px-2 text-gray-900">{u.name}</td>
                      <td className="py-4 px-2 text-gray-500">{u.email}</td>
                      <td className="py-4 px-2 text-gray-700">{u.reports}</td>
                      <td className="py-4 px-2 text-gray-500">{u.joined}</td>
                      <td className="py-4 px-2">
                        {u.active
                          ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">active</span>
                          : <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">inactive</span>
                        }
                      </td>
                      <td className="py-4 px-2">
                        <button className="text-red-400 hover:text-red-600">🗑</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}


        {/* Reports Tab */}
                  {activeTab === 'Reports' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Analyzed Reports</h2>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input
                          type="text"
                          placeholder="Search reports..."
                          value={reportSearch}
                          onChange={(e) => setReportSearch(e.target.value)}
                          className="border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                        />

                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    id: '1', fileName: 'Building_A_QC_Report_2026.pdf', userName: 'John Smith', date: 'Feb 10, 2026',
                    errorCount: 8, timeSaved: 2.5,
                    errors: [
                      { tag: 'placeholder', desc: 'Unremoved placeholder in Section 1.2' },
                      { tag: 'consistency', desc: 'Building height mismatch (3 vs 4 stories)' },
                      { tag: 'placeholder', desc: 'Missing date in Timeline section' },
                    ]
                  },
                  {
                    id: '2', fileName: 'Commercial_Complex_QC.pdf', userName: 'Sarah Johnson', date: 'Feb 9, 2026',
                    errorCount: 5, timeSaved: 1.8,
                    errors: [
                      { tag: 'consistency', desc: 'Square footage discrepancy' },
                      { tag: 'compliance', desc: 'Missing ADA compliance statement' },
                    ]
                  },
                  {
                    id: '3', fileName: 'Residential_Tower_Report.pdf', userName: 'Michael Chen', date: 'Feb 8, 2026',
                    errorCount: 12, timeSaved: 3.2,
                    errors: [
                      { tag: 'placeholder', desc: 'Multiple unremoved placeholders' },
                      { tag: 'consistency', desc: 'Unit count inconsistencies' },
                      { tag: 'compliance', desc: 'Fire safety documentation missing' },
                    ]
                  },
                  {
                    id: '4', fileName: 'Office_Building_QC_Jan2026.pdf', userName: 'Emily Rodriguez', date: 'Feb 7, 2026',
                    errorCount: 3, timeSaved: 1.2,
                    errors: [
                      { tag: 'placeholder', desc: 'Contractor name placeholder' },
                      { tag: 'consistency', desc: 'Date format inconsistency' },
                    ]
                  },
                  {
                    id: '5', fileName: 'Hospital_Wing_Extension.pdf', userName: 'Michael Chen', date: 'Feb 5, 2026',
                    errorCount: 7, timeSaved: 2.3,
                    errors: [
                      { tag: 'compliance', desc: 'Healthcare facility code references missing' },
                      { tag: 'consistency', desc: 'Room count mismatch' },
                    ]
                  },
                  {
                    id: '6', fileName: 'Shopping_Mall_QC_Report.pdf', userName: 'Lisa Anderson', date: 'Feb 6, 2026',
                    errorCount: 15, timeSaved: 4.1,
                    errors: [
                      { tag: 'consistency', desc: 'Multiple measurement unit inconsistencies' },
                      { tag: 'compliance', desc: 'Missing environmental compliance docs' },
                      { tag: 'placeholder', desc: 'Several TBD entries found' },
                    ]
                  },
                  {
                    id: '7', fileName: 'Warehouse_Facility_QC.pdf', userName: 'David Park', date: 'Feb 4, 2026',
                    errorCount: 6, timeSaved: 1.9,
                    errors: [
                      { tag: 'placeholder', desc: 'Equipment specifications TBD' },
                      { tag: 'consistency', desc: 'Loading dock dimensions inconsistent' },
                    ]
                  },
                ].filter(r =>
                    r.fileName.toLowerCase().includes(reportSearch.toLowerCase()) ||
                    r.userName.toLowerCase().includes(reportSearch.toLowerCase())
                  ).map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-400 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-indigo-600 text-lg">📄</span>
                          <p className="font-bold text-gray-900 text-base">{r.fileName}</p>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          Analyzed by <span className="font-semibold text-gray-700">{r.userName}</span> on {r.date}
                        </p>
                        <p className="text-sm mb-3">
                          <span className="text-red-500 font-medium">{r.errorCount} errors found</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-green-600 font-medium">{r.timeSaved} hours saved</span>
                        </p>
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Errors Detected:</p>
                          <div className="space-y-1">
                            {r.errors.map((e, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium min-w-[80px] text-center
                                  ${e.tag === 'placeholder' ? 'bg-red-100 text-red-500' : ''}
                                  ${e.tag === 'consistency' ? 'bg-orange-100 text-orange-500' : ''}
                                  ${e.tag === 'compliance' ? 'bg-purple-100 text-purple-600' : ''}
                                  ${e.tag === 'formatting' ? 'bg-blue-100 text-blue-500' : ''}
                                  ${e.tag === 'missing data' ? 'bg-yellow-100 text-yellow-600' : ''}
                                `}>{e.tag}</span>
                                <span className="text-sm text-gray-600">{e.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="relative ml-4">
                        <button
                          onClick={() => setOpenTrainingMenu(openTrainingMenu === r.id ? null : r.id)}
                          className="text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-1.5 hover:bg-indigo-100 whitespace-nowrap"
                        >
                          + Add to Training
                        </button>
                        {openTrainingMenu === r.id && (
                          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-52">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Add as training example:</p>
                            <button
                              onClick={() => setOpenTrainingMenu(null)}
                              className="w-full text-left text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded px-3 py-2 mb-1"
                            >
                              ✓ Good Example (Error-free)
                            </button>
                            <button
                              onClick={() => setOpenTrainingMenu(null)}
                              className="w-full text-left text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded px-3 py-2"
                            >
                              ✗ Bad Example (Has errors)
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


        {/* AI Training Tab */}
        {activeTab === 'AI Training' && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            <p className="text-lg font-medium">AI Training</p>
            <p className="text-sm mt-2">Coming soon</p>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
