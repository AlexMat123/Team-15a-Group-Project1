import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  FileText,
  KeyRound,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'manage', label: 'Manage' },
];

const formatDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const AdminDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [manageView, setManageView] = useState('users');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [requestsMessage, setRequestsMessage] = useState('');
  const [requestsError, setRequestsError] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);


  const fetchUsers = async () => {
    setLoadingUsers(true);

    try {
      const response = await api.get('/users');
      setUsers(response.data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${userName}?`)

    if (!confirmed){
      return;
    }

    setDeletingUserId(userId);
    setRequestsMessage('');
    setRequestsError('');

    try{
      const response = await api.delete(`/users/${userId}`);
      setRequestsMessage(response.data.message || 'User deleted successfully');
      await fetchUsers();
    } catch(error) {
      setRequestsError(error.response?.data?.message || 'Failed to delete this user');
    } finally {
      setDeletingUserId('')
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPasswordResetRequest();
  }, []);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Reports Analyzed', value: '0', icon: FileText, color: 'bg-green-500' },
    { label: 'Total Errors Found', value: '0', icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Time Saved', value: '0h', icon: Clock, color: 'bg-amber-500' },
  ];

  const filteredUsers = users.filter((entry) => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      entry.name?.toLowerCase().includes(query) ||
      entry.email?.toLowerCase().includes(query) ||
      entry.role?.toLowerCase().includes(query)
    );
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await api.post('/users', { name, email, role });

      setSuccessMessage(response.data.message);
      setRequestsMessage('');
      setName('');
      setEmail('');
      setRole('user');
      setShowCreateUserModal(false);
      await fetchUsers();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (userId) => {
    setResettingUserId(userId);
    setRequestsMessage('');
    setRequestsError('');

    try {
      const response = await api.put(`/users/${userId}/reset-password`);
      setRequestsMessage(response.data.message || 'Password reset successfully');
    } catch (error) {
      setRequestsError(
        error.response?.data?.message || 'Failed to reset this user password'
      );
    } finally {
      setResettingUserId('');
    }
  };

  const openCreateUserModal = () => {
    setSuccessMessage('');
    setErrorMessage('');
    setShowCreateUserModal(true);
  };

  const closeCreateUserModal = () => {
    if (submitting) {
      return;
    }

    setShowCreateUserModal(false);
    setName('');
    setEmail('');
    setRole('user');
    setErrorMessage('');
  };

  const fetchPasswordResetRequest = async () =>{
    setLoadingRequests(true);

    try {
      const response = await api.get('/password-reset-requests?status=pending');
      setPasswordResetRequests(response.data);
      setRequestsError('');
    } catch (error) {
      setRequestsError(
        error.response?.data?.message || 'Failed to load password requests'
      );
    } finally {
      setLoadingRequests(false)
    }
  };

  const handleCompleteRequest = async (requestId) => {
    setRequestsMessage('');
    setRequestsError('');

    try{
      const response = await api.put(`/password-reset-requests/${requestId}/complete`);
      setRequestsMessage(response.data.message);
      await fetchPasswordResetRequest();
    } catch (error) {
      setRequestsError(error.response?.data?.message || 'Failed to complete password reset request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    setRequestsMessage('');
    setRequestsError('');

    try {
      const response = await api.put(`/password-reset-requests/${requestId}/reject`, {
        notes: 'Rejected by Admin',
      });
      setRequestsMessage(response.data.message);
      await fetchPasswordResetRequest();
    } catch(error) {
      setRequestsError(error.response?.data?.message || 'Failed to reject password request');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users and monitor system analytics</p>
          </div>

          {activeTab === 'users' && (
            <button
              type="button"
              onClick={openCreateUserModal}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create User
            </button>
          )}
        </div>

        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 pb-4 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 text-sm">
                <span className="font-semibold">Local AI Processing - Client Data Protected</span>
                <br />
                All AI processing is performed locally on your servers. Your confidential client
                data never leaves your infrastructure.
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

            {successMessage && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Welcome, {user?.name}!
                </h2>
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'users' && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Search your existing users and review their roles and account status.
                </p>
              </div>

              <label className="relative block w-full md:max-w-xs">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>

            {errorMessage && <p className="mb-4 text-sm text-red-600">{errorMessage}</p>}
            {successMessage && <p className="mb-4 text-sm text-green-600">{successMessage}</p>}

            {loadingUsers ? (
              <p className="text-sm text-gray-500">Loading users...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-600">
                      <th className="px-4 py-4 font-semibold">User</th>
                      <th className="px-4 py-4 font-semibold">Email</th>
                      <th className="px-4 py-4 font-semibold">Role</th>
                      <th className="px-4 py-4 font-semibold">Joined</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((entry) => (
                      <tr key={entry._id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-4 py-5 text-gray-900">{entry.name}</td>
                        <td className="px-4 py-5 text-gray-600">{entry.email}</td>
                        <td className="px-4 py-5 capitalize text-gray-600">
                          {entry.role?.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-5 text-gray-600">{formatDate(entry.createdAt)}</td>
                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              entry.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!filteredUsers.length && (
                  <p className="px-4 py-6 text-sm text-gray-500">No users match your search.</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'manage' && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Manage Users</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Handle account support actions such as password resets and deletions from one place.
                </p>
              </div>

              <label className="relative block w-full md:max-w-xs">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>

            <div className="mb-6 flex gap-3 border-b border-gray-200 pb-4">
              <button
                type="button"
                onClick={() => setManageView('users')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  manageView === 'users'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                User Actions
              </button>
              <button
                type="button"
                onClick={() => setManageView('requests')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  manageView === 'requests'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                Password Reset Requests
              </button>
            </div>

            {requestsMessage && <p className="mb-4 text-sm text-green-600">{requestsMessage}</p>}
            {requestsError && <p className="mb-4 text-sm text-red-600">{requestsError}</p>}

            {manageView === 'users' && loadingUsers ? (
              <p className="text-sm text-gray-500">Loading users...</p>
            ) : manageView === 'requests' && loadingRequests ? (
              <p className="text-sm text-gray-500">Loading password reset requests...</p>
            ) : (
              <div className="overflow-x-auto">
                {manageView === 'users' ? (
                  <>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-600">
                          <th className="px-4 py-4 font-semibold">User</th>
                          <th className="px-4 py-4 font-semibold">Email</th>
                          <th className="px-4 py-4 font-semibold">Role</th>
                          <th className="px-4 py-4 font-semibold">Status</th>
                          <th className="px-4 py-4 font-semibold">Reset Password</th>
                          <th className="px-4 py-4 font-semibold">Delete User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((entry) => (
                          <tr key={entry._id} className="border-b border-gray-100 last:border-b-0">
                            <td className="px-4 py-5 text-gray-900">{entry.name}</td>
                            <td className="px-4 py-5 text-gray-600">{entry.email}</td>
                            <td className="px-4 py-5 capitalize text-gray-600">
                              {entry.role?.replace('_', ' ')}
                            </td>
                            <td className="px-4 py-5 text-gray-600">{entry.status}</td>
                            <td className="px-4 py-5">
                              <button
                                type="button"
                                onClick={() => handleResetPassword(entry._id)}
                                disabled={resettingUserId === entry._id || deletingUserId === entry._id}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2 text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <KeyRound className="h-4 w-4" />
                                {resettingUserId === entry._id ? 'Resetting...' : 'Reset Password'}
                              </button>
                            </td>

                            <td className="px-4 py-5">
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(entry._id, entry.name)}
                                disabled={deletingUserId === entry._id || resettingUserId === entry._id}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingUserId === entry._id ? 'Deleting...' : 'Delete User'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {!filteredUsers.length && (
                      <p className="px-4 py-6 text-sm text-gray-500">
                        No users match your search.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-600">
                          <th className="px-4 py-4 font-semibold">User</th>
                          <th className="px-4 py-4 font-semibold">Email</th>
                          <th className="px-4 py-4 font-semibold">Role</th>
                          <th className="px-4 py-4 font-semibold">Requested At</th>
                          <th className="px-4 py-4 font-semibold">Status</th>
                          <th className="px-4 py-4 font-semibold">Reset Password</th>
                          <th className="px-4 py-4 font-semibold">Reject</th>
                        </tr>
                      </thead>
                      <tbody>
                        {passwordResetRequests
                          .filter((request) => {
                            const query = searchTerm.trim().toLowerCase();

                            if (!query) {
                              return true;
                            }

                            return (
                              request.user?.name?.toLowerCase().includes(query) ||
                              request.user?.email?.toLowerCase().includes(query) ||
                              request.user?.role?.toLowerCase().includes(query) ||
                              request.status?.toLowerCase().includes(query)
                            );
                          })
                          .map((request) => (
                            <tr key={request._id} className="border-b border-gray-100 last:border-b-0">
                              <td className="px-4 py-5 text-gray-900">{request.user?.name}</td>
                              <td className="px-4 py-5 text-gray-600">{request.user?.email}</td>
                              <td className="px-4 py-5 capitalize text-gray-600">
                                {request.user?.role?.replace('_', ' ')}
                              </td>
                              <td className="px-4 py-5 text-gray-600">
                                {formatDate(request.requestedAt)}
                              </td>
                              <td className="px-4 py-5 capitalize text-gray-600">
                                {request.status}
                              </td>
                              <td className="px-4 py-5">
                                <button
                                  type="button"
                                  onClick={() => handleCompleteRequest(request._id)}
                                  disabled={resettingUserId === request.user?._id}
                                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2 text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <KeyRound className="h-4 w-4" />
                                  {resettingUserId === request.user?._id ? 'Resetting...' : 'Reset Password'}
                                </button>
                              </td>
                              <td className="px-4 py-5">
                                <button
                                  type="button"
                                  onClick={() => handleRejectRequest(request._id)}
                                  className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50"
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>

                    {!passwordResetRequests.length && (
                      <p className="px-4 py-6 text-sm text-gray-500">
                        No password reset requests found.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Add the user details below and assign their role.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateUserModal}
                disabled={submitting}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close create user modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                >
                  <option value="user">User</option>
                  <option value="team_leader">Team Leader</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateUserModal}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;
