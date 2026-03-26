import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'];

const TeamPage = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  // Team lead state
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const isTeamLead = user?.role === 'team_leader';

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get('/api/teams/my-team', { headers });
        setTeam(res.data);

        // Fetch stats if team lead
        if (user?.role === 'team_leader') {
          try {
            const statsRes = await axios.get('/api/teams/my-team/stats', { headers });
            setTeamStats(statsRes.data);
          } catch (e) {
            console.error('Failed to load team stats:', e);
          }
        }
      } catch (err) {
        console.error('Failed to load team:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [user?.role]);

  const handleOpenAddModal = async () => {
    setAddSearch('');
    setShowAddModal(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/teams/available-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableUsers(res.data);
      const existingIds = (team?.members || []).map(m => m._id);
      setSelectedIds(existingIds);
    } catch (err) {
      alert('Failed to load users');
      setShowAddModal(false);
    }
  };

  const toggleSelection = (userId) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    setAdding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch('/api/teams/my-team/members',
        { memberIds: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeam(res.data);
      setShowAddModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add members');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`/api/teams/my-team/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeam(res.data);
      setConfirmRemove(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loading ? (
          <p className="text-gray-400 text-lg text-center animate-pulse">Loading team...</p>
        ) : !team ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            <p className="text-lg font-medium">You are not part of any team.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-600">Team Page</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {showMembers ? 'Hide Members' : 'View Members'}
                  <span className={`transition-transform ${showMembers ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {isTeamLead && (
                  <>
                    <button
                      onClick={handleOpenAddModal}
                      className="text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      + Add Members
                    </button>
                    <button
                      onClick={() => setShowStats(true)}
                      className="text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      View Analytics
                    </button>
                  </>
                )}
              </div>

              {showMembers && (
                <div className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {team.members.map(m => (
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
                      {team.teamLead && (team.teamLead._id === m._id || team.teamLead === m._id) && (
                        <span className="text-xs font-medium bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                          Lead
                        </span>
                      )}
                      {isTeamLead && m._id !== user._id && (
                        <button
                          onClick={() => setConfirmRemove(m)}
                          className="text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Analytics Modal — team lead only */}
            {showStats && teamStats && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Team Analytics</h3>
                  <p className="text-sm text-gray-500 mb-5">{team.name}</p>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center">
                        <div className="bg-blue-500 p-2.5 rounded-lg">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xl font-bold text-gray-900">{teamStats.totalMembers}</p>
                          <p className="text-xs text-gray-500">Members</p>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center">
                        <div className="bg-green-500 p-2.5 rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xl font-bold text-gray-900">{teamStats.totalReports}</p>
                          <p className="text-xs text-gray-500">Reports</p>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center">
                        <div className="bg-red-500 p-2.5 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xl font-bold text-gray-900">{teamStats.totalErrors}</p>
                          <p className="text-xs text-gray-500">Errors Found</p>
                        </div>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center">
                        <div className="bg-amber-500 p-2.5 rounded-lg">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-3">
                          <p className="text-xl font-bold text-gray-900">{teamStats.timeSaved}h</p>
                          <p className="text-xs text-gray-500">Time Saved</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Most Common Errors</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={teamStats.errorBreakdown.map(e => ({ name: e.name, errors: e.value }))}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="errors" fill="#6366f1" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Error Type Distribution</h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={teamStats.errorBreakdown} dataKey="value" nameKey="name" outerRadius={65} label={({ name, value }) => `${name}: ${value}`}>
                            {teamStats.errorBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Time savings */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Time Savings Analysis</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-purple-100 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-indigo-600">{teamStats.manualTime}h</p>
                        <p className="text-xs text-gray-500 mt-1">Manual Review Time</p>
                      </div>
                      <div className="bg-green-100 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{teamStats.aiTime}h</p>
                        <p className="text-xs text-gray-500 mt-1">AI Review Time</p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{teamStats.timeSavedPercent}%</p>
                        <p className="text-xs text-gray-500 mt-1">Time Saved</p>
                      </div>
                    </div>
                    <p className="text-center text-gray-500 mt-4 text-sm">
                      Your team has saved approximately{' '}
                      <span className="text-indigo-600 font-bold">{teamStats.timeSaved} hours</span>{' '}
                      of manual review work.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowStats(false)}
                    className="mt-4 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Add Members Modal */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Add Members</h3>
                  <p className="text-sm text-gray-500 mb-4">{team.name}</p>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    autoFocus
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {availableUsers
                      .filter(u =>
                        u.name?.toLowerCase().includes(addSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(addSearch.toLowerCase())
                      )
                      .map(u => {
                        const isSelected = selectedIds.includes(u._id);
                        return (
                          <label
                            key={u._id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(u._id)}
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
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMembers}
                      disabled={adding}
                      className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {adding ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Remove Modal */}
            {confirmRemove && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Member</h3>
                  <p className="text-sm text-gray-600 mb-5">
                    Are you sure you want to remove <span className="font-semibold">{confirmRemove.name}</span> from the team? This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleRemoveMember(confirmRemove._id)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default TeamPage;
