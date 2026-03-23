import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [openTrainingMenu, setOpenTrainingMenu] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');

  // --- API state ---
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Teams state ---
  const [newTeamName, setNewTeamName] = useState('');
  const [teamError, setTeamError] = useState('');
  const [teamCreating, setTeamCreating] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [manageTeamId, setManageTeamId] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [showViewMembers, setShowViewMembers] = useState(false);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
  const [showAssignLead, setShowAssignLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [confirmLead, setConfirmLead] = useState(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);

  // --- Fetch all admin data on mount ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get('/api/admin/stats', { headers }),
      axios.get('/api/admin/users', { headers }),
      axios.get('/api/admin/reports', { headers }),
      axios.get('/api/admin/teams', { headers }),
    ])
      .then(([statsRes, usersRes, reportsRes, teamsRes]) => {
        setStats(statsRes.data);
        setUsers(usersRes.data);
        setReports(reportsRes.data);
        setTeams(teamsRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Admin fetch error:', err);
        setError('Failed to load dashboard data.');
        setLoading(false);
      });
  }, []);

  // --- Show loading spinner while fetching ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-lg animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  // --- Show error if fetch failed ---
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // --- Stat cards built from real API data ---
  const statCards = [
    { label: 'Total Users',        value: stats.totalUsers,         icon: Users,         color: 'bg-blue-500' },
    { label: 'Reports Analyzed',   value: stats.totalReports,       icon: FileText,      color: 'bg-green-500' },
    { label: 'Total Errors Found', value: stats.totalErrors,        icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Time Saved',         value: `${stats.timeSaved}h`,    icon: Clock,         color: 'bg-amber-500' },
  ];

  // --- Chart data from real API errorBreakdown array ---
  // BarChart needs { name, errors }, PieChart needs { name, value }
  const barData = stats.errorBreakdown.map(e => ({ name: e.name, errors: e.value }));
  const pieData = stats.errorBreakdown; // already { name, value }

  // --- Time savings panel from real API data ---
  const timeSavingsCards = [
    { label: 'Manual Review Time', value: `${stats.manualTime}h`,       bg: 'bg-purple-100', text: 'text-indigo-600' },
    { label: 'AI Review Time',     value: `${stats.aiTime}h`,           bg: 'bg-green-100',  text: 'text-green-600' },
    { label: 'Time Saved',         value: `${stats.timeSavedPercent}%`, bg: 'bg-purple-100', text: 'text-purple-600' },
  ];

  const handleAddToTraining = async (reportId, label) => {
  try {
    const token = localStorage.getItem('token');
    await axios.patch(`/api/admin/reports/${reportId}/training`,
      { trainingLabel: label },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setReports(prev =>
      prev.map(r => r._id === reportId
        ? { ...r, addedToTraining: true, trainingLabel: label }
        : r
      )
    );
    setOpenTrainingMenu(null);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to add to training');
  }
};

  const handleDeleteUser = async (userId) => {
  if (!confirm('Are you sure you want to delete this user?')) return;
  const token = localStorage.getItem('token');
  await axios.delete(`/api/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  setUsers(prev => prev.filter(u => u._id !== userId));
};

const handleToggleStatus = async (userId, currentStatus) => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.patch(`/api/admin/users/${userId}/status`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Update local state with new status returned from API
    setUsers(prev =>
      prev.map(u => u._id === userId ? { ...u, status: res.data.status } : u)
    );
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to update status');
  }
};

const handleCreateTeam = async (e) => {
  e.preventDefault();
  setTeamError('');

  if (!newTeamName.trim()) {
    setTeamError('Team name is required');
    return;
  }

  setTeamCreating(true);
  try {
    const token = localStorage.getItem('token');
    const res = await axios.post('/api/admin/teams', { name: newTeamName }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTeams(prev => [res.data, ...prev]);
    setNewTeamName('');
    setShowCreateTeamModal(false);
  } catch (err) {
    setTeamError(err.response?.data?.message || 'Failed to create team');
  } finally {
    setTeamCreating(false);
  }
};

const handleOpenAddMembers = () => {
  const team = teams.find(t => t._id === manageTeamId);
  const existingIds = (team?.members || []).map(m => m._id || m);
  setSelectedMemberIds(existingIds);
  setAddMemberSearch('');
  setShowAddMembers(true);
};

const toggleMemberSelection = (userId) => {
  setSelectedMemberIds(prev =>
    prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
  );
};

const handleAddMembers = async () => {
  setAddingMembers(true);
  try {
    const token = localStorage.getItem('token');
    const res = await axios.patch(`/api/admin/teams/${manageTeamId}/members`,
      { memberIds: selectedMemberIds },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTeams(prev => prev.map(t => t._id === manageTeamId ? res.data : t));
    setShowAddMembers(false);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to add members');
  } finally {
    setAddingMembers(false);
  }
};

const handleRemoveMember = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.delete(`/api/admin/teams/${manageTeamId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTeams(prev => prev.map(t => t._id === manageTeamId ? res.data : t));
    setConfirmRemoveMember(null);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to remove member');
  }
};

const handleOpenAssignLead = () => {
  const team = teams.find(t => t._id === manageTeamId);
  setSelectedLeadId(team?.teamLead?._id || null);
  setConfirmLead(null);
  setShowAssignLead(true);
};

const handleConfirmAssignLead = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await axios.patch(`/api/admin/teams/${manageTeamId}/lead`,
      { userId: confirmLead._id },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setTeams(prev => prev.map(t => t._id === manageTeamId ? res.data : t));
    setConfirmLead(null);
    setShowAssignLead(false);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to assign team lead');
  }
};

const handleDeleteTeam = async () => {
  try {
    const token = localStorage.getItem('token');
    await axios.delete(`/api/admin/teams/${manageTeamId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTeams(prev => prev.filter(t => t._id !== manageTeamId));
    setConfirmDeleteTeam(false);
    setManageTeamId(null);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to delete team');
  }
};

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and monitor system analytics</p>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          {['Overview', 'Users', 'Reports', 'AI Training', 'Teams'].map(tab => (
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

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'Overview' && (
          <>
            {/* Privacy notice banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 text-sm">
                <span className="font-semibold">Local AI Processing - Client Data Protected</span>
                <br />
                All AI processing is performed locally on your servers. Your confidential client data never leaves your infrastructure.
              </p>
            </div>

            {/* Stat cards — real data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat) => (
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

            {/* Charts — real errorBreakdown data */}
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
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Time savings — real data */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Savings Analysis</h2>
              <div className="grid grid-cols-3 gap-4">
                {timeSavingsCards.map(item => (
                  <div key={item.label} className={`${item.bg} rounded-lg p-6 text-center`}>
                    <p className={`text-3xl font-bold ${item.text}`}>{item.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-gray-500 mt-4 text-sm">
                Our AI has saved approximately{' '}
                <span className="text-indigo-600 font-bold">{stats.timeSaved} hours</span>{' '}
                of manual review work across all reports.
              </p>
            </div>
          </>
        )}

        {/* ── USERS TAB ── */}
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
                {users
                  .filter(u =>
                    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                    u.email?.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map(u => (
                    <tr key={u._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-4 px-2 text-gray-900">{u.name}</td>
                      <td className="py-4 px-2 text-gray-500">{u.email}</td>
                      {/* reportsCount comes from virtual or populated field on User model */}
                      <td className="py-4 px-2 text-gray-700">{u.reportsCount ?? 0}</td>
                      {/* Format createdAt date from MongoDB */}
                      <td className="py-4 px-2 text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-2">
                        {u.status === 'active'
                          ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">active</span>
                          : <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">inactive</span>
                        }
                      </td>
                      
                      <td className="py-4 px-2 flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(u._id, u.status)}
                          className={`text-xs px-2 py-1 rounded border ${
                            u.status === 'active'
                              ? 'text-orange-500 border-orange-200 hover:bg-orange-50'
                              : 'text-green-600 border-green-200 hover:bg-green-50'
                          }`}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteUser(u._id)} className="text-red-400 hover:text-red-600">🗑</button>
                      </td>

                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── REPORTS TAB ── */}
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
              {reports
                .filter(r =>
                  r.filename?.toLowerCase().includes(reportSearch.toLowerCase()) ||
                  r.analyzedBy?.name?.toLowerCase().includes(reportSearch.toLowerCase())
                )
                .map(r => (
                  <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-400 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-indigo-600 text-lg">📄</span>
                          <p className="font-bold text-gray-900 text-base">{r.filename}</p>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          {/* analyzedBy is populated with name + email from adminRoutes */}
                          Analyzed by <span className="font-semibold text-gray-700">{r.analyzedBy?.name ?? 'Unknown'}</span> on{' '}
                          {new Date(r.analyzedAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm mb-3">
                          <span className="text-red-500 font-medium">{r.errorCount} errors found</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-green-600 font-medium">{r.timeSaved} hours saved</span>
                        </p>

                        {/* Error tags — r.errors is array of { tag, message } from Report model */}
                        {r.errors?.length > 0 && (
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Errors Detected:</p>
                            <div className="space-y-1">
                              {r.errors.map((e, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium min-w-[80px] text-center
                                    ${e.type === 'placeholder'   ? 'bg-red-100 text-red-500'       : ''}
                                    ${e.type === 'consistency'   ? 'bg-orange-100 text-orange-500' : ''}
                                    ${e.type === 'compliance'    ? 'bg-purple-100 text-purple-600' : ''}
                                    ${e.type === 'formatting'    ? 'bg-blue-100 text-blue-500'     : ''}
                                    ${e.type === 'missing_data'  ? 'bg-yellow-100 text-yellow-600' : ''}
                                  `}>{e.type}</span>
                                  <span className="text-sm text-gray-600">{e.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Add to Training dropdown */}
                      <div className="relative ml-4">
                        
                        <button
                          onClick={() => setOpenTrainingMenu(openTrainingMenu === r._id ? null : r._id)}
                          className={`text-sm border rounded-lg px-3 py-1.5 whitespace-nowrap ${
                            r.addedToTraining
                              ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
                              : 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                          }`}
                        >
                          {r.addedToTraining
                            ? `✓ ${r.trainingLabel === 'good' ? 'Good' : 'Bad'} Example`
                            : '+ Add to Training'}
                        </button>

                        {openTrainingMenu === r._id && (
                          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-52">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Add as training example:</p>
                            <button
                              onClick={() => handleAddToTraining(r._id, 'good')}
                              className="w-full text-left text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded px-3 py-2 mb-1"
                            >
                              ✓ Good Example (Error-free)
                            </button>
                            <button
                              onClick={() => handleAddToTraining(r._id, 'bad')}
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

        {/* ── AI TRAINING TAB ── */}
        {activeTab === 'AI Training' && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            <p className="text-lg font-medium">AI Training</p>
            <p className="text-sm mt-2">Coming soon</p>
          </div>
        )}

        {/* ── TEAMS TAB ── */}
        {activeTab === 'Teams' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Teams</h2>
              <button
                onClick={() => { setTeamError(''); setNewTeamName(''); setShowCreateTeamModal(true); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                + Create Team
              </button>
            </div>

            {teams.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No teams created yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 bg-gray-50">
                    <th className="pb-3 pt-3 px-2">TEAM NAME</th>
                    <th className="pb-3 pt-3 px-2">CREATED</th>
                    <th className="pb-3 pt-3 px-2">WARNING</th>
                    <th className="pb-3 pt-3 px-2">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t._id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-4 px-2 text-gray-900 font-medium">{t.name}</td>
                      <td className="py-4 px-2 text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-2">
                        {!t.teamLead && (
                          <span className="text-xs text-red-500 font-medium">No team lead assigned</span>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        <button
                          onClick={() => setManageTeamId(manageTeamId === t._id ? null : t._id)}
                          className="text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50"
                        >
                          Manage Team
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Manage Team Modal */}
            {manageTeamId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {teams.find(t => t._id === manageTeamId)?.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-5">Choose an action for this team</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleOpenAddMembers} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                      Add Members
                    </button>
                    <button onClick={() => setShowViewMembers(true)} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                      View Members
                    </button>
                    <button onClick={handleOpenAssignLead} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                      Assign Team Lead
                    </button>
                    <button onClick={() => setConfirmDeleteTeam(true)} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                      Delete Team
                    </button>
                  </div>
                  <button
                    onClick={() => setManageTeamId(null)}
                    className="mt-4 w-full text-sm text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>

                {/* Confirm Delete Team */}
                {confirmDeleteTeam && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Team</h3>
                      <p className="text-sm text-gray-600 mb-5">
                        Are you sure you want to delete <span className="font-semibold">{teams.find(t => t._id === manageTeamId)?.name}</span>? This will remove the team and all its member associations. This action cannot be undone.
                      </p>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setConfirmDeleteTeam(false)}
                          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteTeam}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add Members Overlay */}
            {showAddMembers && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Add Members</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {teams.find(t => t._id === manageTeamId)?.name}
                  </p>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={addMemberSearch}
                    onChange={(e) => setAddMemberSearch(e.target.value)}
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {users
                      .filter(u =>
                        u.name?.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(addMemberSearch.toLowerCase())
                      )
                      .map(u => {
                        const isSelected = selectedMemberIds.includes(u._id);
                        return (
                          <label
                            key={u._id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMemberSelection(u._id)}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{u.name}</p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() => setShowAddMembers(false)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleAddMembers}
                      disabled={addingMembers}
                      className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {addingMembers ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View Members Overlay */}
            {showViewMembers && manageTeamId && (() => {
              const team = teams.find(t => t._id === manageTeamId);
              const members = team?.members || [];
              return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                  <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Team Members</h3>
                    <p className="text-sm text-gray-500 mb-4">{team?.name}</p>
                    {members.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">No members in this team yet.</p>
                    ) : (
                      <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {members.map(m => (
                          <div key={m._id} className="flex items-center gap-3 px-4 py-3">
                            <div className="bg-indigo-100 text-indigo-600 rounded-full h-8 w-8 flex items-center justify-center text-sm font-semibold">
                              {m.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{m.name}</p>
                              <p className="text-xs text-gray-500">{m.email}</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              m.role === 'team_leader'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {m.role === 'team_leader' ? 'Team Leader' : 'User'}
                            </span>
                            <button
                              onClick={() => setConfirmRemoveMember(m)}
                              className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { setShowViewMembers(false); setConfirmRemoveMember(null); }}
                      className="mt-4 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                  </div>

                  {/* Confirm Remove Member */}
                  {confirmRemoveMember && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
                      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Member</h3>
                        <p className="text-sm text-gray-600 mb-5">
                          Are you sure you want to remove <span className="font-semibold">{confirmRemoveMember.name}</span> from this team? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setConfirmRemoveMember(null)}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRemoveMember(confirmRemoveMember._id)}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Assign Team Lead Overlay */}
            {showAssignLead && manageTeamId && (() => {
              const team = teams.find(t => t._id === manageTeamId);
              const members = team?.members || [];
              return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                  <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Assign Team Lead</h3>
                    <p className="text-sm text-gray-500 mb-4">{team?.name}</p>
                    {members.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">No members in this team. Add members first.</p>
                    ) : (
                      <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {members.map(m => {
                          const isSelected = selectedLeadId === m._id;
                          const isCurrentLead = team?.teamLead?._id === m._id;
                          return (
                            <label
                              key={m._id}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}
                            >
                              <input
                                type="radio"
                                name="teamLead"
                                checked={isSelected}
                                onChange={() => setSelectedLeadId(m._id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="bg-indigo-100 text-indigo-600 rounded-full h-8 w-8 flex items-center justify-center text-sm font-semibold">
                                {m.name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{m.name}</p>
                                <p className="text-xs text-gray-500">{m.email}</p>
                              </div>
                              {isCurrentLead && (
                                <span className="text-xs text-indigo-600 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">Current Lead</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-4">
                      <button
                        onClick={() => setShowAssignLead(false)}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      {members.length > 0 && (
                        <button
                          onClick={() => {
                            const member = members.find(m => m._id === selectedLeadId);
                            if (!member) return alert('Please select a member');
                            setConfirmLead(member);
                          }}
                          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Confirm Assign Lead */}
                  {confirmLead && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
                      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Team Lead</h3>
                        <p className="text-sm text-gray-600 mb-5">
                          Are you sure you want to assign <span className="font-semibold">{confirmLead.name}</span> as the team lead for <span className="font-semibold">{team?.name}</span>?
                        </p>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setConfirmLead(null)}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleConfirmAssignLead}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Create Team Modal */}
            {showCreateTeamModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create a New Team</h3>
                  <form onSubmit={handleCreateTeam}>
                    <input
                      type="text"
                      placeholder="Enter team name..."
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      autoFocus
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {teamError && (
                      <p className="text-red-500 text-sm mb-3">{teamError}</p>
                    )}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateTeamModal(false)}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={teamCreating}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {teamCreating ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
