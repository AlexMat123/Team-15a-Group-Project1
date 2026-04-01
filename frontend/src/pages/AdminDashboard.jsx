import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  KeyRound,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'manage', label: 'Manage' },
  { id: 'reports', label: 'Reports' },
  { id: 'training', label: 'AI Training' },
  { id: 'teams', label: 'Teams' },
];

const COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'];

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

const getStatusOutlineClass = (status) => {
  const normalizedStatus = String(status || '').toLowerCase();

  if (normalizedStatus.includes('pending')) {
    return 'border-orange-400 text-orange-700';
  }

  if (normalizedStatus === 'active') {
    return 'border-green-400 text-green-700';
  }

  if (normalizedStatus.includes('inactive')) {
    return 'border-red-400 text-red-700';
  }

  return 'border-gray-300 text-gray-700';
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
  const [reportSearch, setReportSearch] = useState('');
  const [expandedReports, setExpandedReports] = useState({});
  const [openTrainingMenu, setOpenTrainingMenu] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [requestsMessage, setRequestsMessage] = useState('');
  const [requestsError, setRequestsError] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [reportsError, setReportsError] = useState('');
  // Overview filters
  const [filterRange, setFilterRange] = useState('all');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterResult, setFilterResult] = useState('');

  const [dashboardStats, setDashboardStats] = useState({
    totalReports: 0,
    totalErrors: 0,
    timeSaved: 0,
    manualTime: 0,
    aiTime: 0,
    timeSavedPercent: 0,
    errorBreakdown: [
      { name: 'Placeholder', value: 0 },
      { name: 'Consistency', value: 0 },
      { name: 'Compliance', value: 0 },
      { name: 'Formatting', value: 0 },
      { name: 'Missing Data', value: 0 },
    ],
  });

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
  const [leadSuccessMessage, setLeadSuccessMessage] = useState('');
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(false);
  const [showTeamAnalytics, setShowTeamAnalytics] = useState(false);
  const [teamStats, setTeamStats] = useState(null);
  const [teamStatsLoading, setTeamStatsLoading] = useState(false);
  const [teamFilterRange, setTeamFilterRange] = useState('all');
  const [teamFilterUser, setTeamFilterUser] = useState('');
  const [teamFilterResult, setTeamFilterResult] = useState('');

  // --- Training state ---
  const [trainingExamples, setTrainingExamples] = useState([]);
  const [trainingStats, setTrainingStats] = useState({
    totalExamples: 0,
    trainedExamples: 0,
    pendingExamples: 0,
    goodExamples: 0,
    badExamples: 0,
    templates: 0,
  });
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [trainingFile, setTrainingFile] = useState(null);
  const [trainingType, setTrainingType] = useState('good');
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const [trainingMessage, setTrainingMessage] = useState('');
  const [trainingError, setTrainingError] = useState('');
  const [syncingTraining, setSyncingTraining] = useState(false);
  const [deletingExampleId, setDeletingExampleId] = useState('');
  const [dragActive, setDragActive] = useState(false);

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

  const fetchTeams = async () => {
    try {
      const response = await api.get('/admin/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to load teams:', error);
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

  const mapReportStats = (statsData) => {
    const totalReports = statsData?.totalReports || 0;
    const totalErrors = statsData?.totalErrors || 0;
    const timeSaved = Math.round(statsData?.totalTimeSaved || statsData?.timeSaved || 0);
    const manualTime = Number((timeSaved / 0.16).toFixed(1));
    const aiTime = Math.max(0, Math.round(manualTime - timeSaved));
    const timeSavedPercent = manualTime > 0 ? Math.round((timeSaved / manualTime) * 100) : 0;

    return {
      totalReports,
      totalErrors,
      timeSaved,
      manualTime,
      aiTime,
      timeSavedPercent,
      errorBreakdown: [
        { name: 'Placeholder', value: statsData?.placeholderErrors || 0 },
        { name: 'Consistency', value: statsData?.consistencyErrors || 0 },
        { name: 'Compliance', value: statsData?.complianceErrors || 0 },
        { name: 'Formatting', value: statsData?.formattingErrors || 0 },
        { name: 'Missing Data', value: statsData?.missingDataErrors || 0 },
      ],
    };
  };

  const fetchDashboardData = async (range = filterRange, team = filterTeam, userId = filterUser, result = filterResult) => {
    setLoadingReports(true);

    // Build query string from active filters
    const params = new URLSearchParams();
    if (range && range !== 'all') params.append('range', range);
    if (team) params.append('team', team);
    if (userId) params.append('user', userId);
    if (result) params.append('result', result);
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const [statsResponse, reportsResponse] = await Promise.all([
        api.get(`/admin/stats${qs}`),
        api.get('/admin/reports'),
      ]);

      setDashboardStats({
        ...mapReportStats({
          totalReports: statsResponse.data?.totalReports,
          totalErrors: statsResponse.data?.totalErrors,
          timeSaved: statsResponse.data?.timeSaved,
          placeholderErrors: statsResponse.data?.errorBreakdown?.find((e) => e.name === 'Placeholder')?.value || 0,
          consistencyErrors: statsResponse.data?.errorBreakdown?.find((e) => e.name === 'Consistency')?.value || 0,
          complianceErrors: statsResponse.data?.errorBreakdown?.find((e) => e.name === 'Compliance')?.value || 0,
          formattingErrors: statsResponse.data?.errorBreakdown?.find((e) => e.name === 'Formatting')?.value || 0,
          missingDataErrors: statsResponse.data?.errorBreakdown?.find((e) => e.name === 'Missing Data')?.value || 0,
          totalTimeSaved: statsResponse.data?.timeSaved,
        }),
        manualTime: statsResponse.data?.manualTime || 0,
        aiTime: statsResponse.data?.aiTime || 0,
        timeSavedPercent: statsResponse.data?.timeSavedPercent || 0,
        errorBreakdown: statsResponse.data?.errorBreakdown || [],
        qualityBreakdown: statsResponse.data?.qualityBreakdown || null,
      });
      setReports(reportsResponse.data || []);
      setReportsError('');
    } catch (adminError) {
      try {
        const [statsResponse, reportsResponse] = await Promise.all([
          api.get('/reports/stats'),
          api.get('/reports'),
        ]);

        setDashboardStats(mapReportStats(statsResponse.data));
        setReports(reportsResponse.data || []);
        setReportsError('');
      } catch (fallbackError) {
        setReportsError(
          fallbackError.response?.data?.message || 'Failed to load report analytics'
        );
      }
    } finally {
      setLoadingReports(false);
    }
  };

  // Re-fetch stats when any filter changes
  useEffect(() => {
    fetchDashboardData(filterRange, filterTeam, filterUser, filterResult);
  }, [filterRange, filterTeam, filterUser, filterResult]);

  const fetchTrainingData = async () => {
    setLoadingTraining(true);
    try {
      const [examplesRes, statsRes] = await Promise.all([
        api.get('/admin/training/examples'),
        api.get('/admin/training/stats'),
      ]);
      setTrainingExamples(examplesRes.data);
      setTrainingStats(statsRes.data);
      setTrainingError('');
    } catch (error) {
      setTrainingError(error.response?.data?.message || 'Failed to load training data');
    } finally {
      setLoadingTraining(false);
    }
  };

  const handleTrainingUpload = async (e) => {
    e.preventDefault();
    if (!trainingFile) {
      setTrainingError('Please select a PDF file');
      return;
    }

    setUploadingTraining(true);
    setTrainingMessage('');
    setTrainingError('');

    const formData = new FormData();
    formData.append('pdf', trainingFile);
    formData.append('type', trainingType);

    try {
      const response = await api.post('/admin/training/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTrainingMessage(response.data.message || 'Training example uploaded successfully');
      setTrainingFile(null);
      setTrainingType('good');
      await fetchTrainingData();
    } catch (error) {
      setTrainingError(error.response?.data?.message || 'Failed to upload training example');
    } finally {
      setUploadingTraining(false);
    }
  };

  const handleDeleteTrainingExample = async (exampleId) => {
    if (!window.confirm('Are you sure you want to delete this training example?')) return;

    setDeletingExampleId(exampleId);
    setTrainingMessage('');
    setTrainingError('');

    try {
      const response = await api.delete(`/admin/training/examples/${exampleId}`);
      setTrainingMessage(response.data.message || 'Training example deleted');
      await fetchTrainingData();
    } catch (error) {
      setTrainingError(error.response?.data?.message || 'Failed to delete training example');
    } finally {
      setDeletingExampleId('');
    }
  };

  const handleSyncTraining = async () => {
    setSyncingTraining(true);
    setTrainingMessage('');
    setTrainingError('');

    try {
      const response = await api.post('/admin/training/sync');
      setTrainingMessage(response.data.message || 'Training examples synced');
      await fetchTrainingData();
    } catch (error) {
      setTrainingError(error.response?.data?.message || 'Failed to sync training');
    } finally {
      setSyncingTraining(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setTrainingFile(file);
        setTrainingError('');
      } else {
        setTrainingError('Only PDF files are allowed');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setTrainingFile(e.target.files[0]);
      setTrainingError('');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPasswordResetRequest();
    fetchTeams();
    fetchTrainingData();
  }, []);

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Reports Analyzed', value: dashboardStats.totalReports, icon: FileText, color: 'bg-green-500' },
    { label: 'Total Errors Found', value: dashboardStats.totalErrors, icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Time Saved', value: `${dashboardStats.timeSaved}h`, icon: Clock, color: 'bg-amber-500' },
  ];

  const barData = dashboardStats.errorBreakdown.map((entry) => ({
    name: entry.name,
    errors: entry.value,
  }));

  const timeSavingsCards = [
    { label: 'Manual Review Time', value: `${dashboardStats.manualTime}h`, bg: 'bg-purple-100', text: 'text-indigo-600' },
    { label: 'AI Review Time', value: `${dashboardStats.aiTime}h`, bg: 'bg-green-100', text: 'text-green-600' },
    { label: 'Time Saved', value: `${dashboardStats.timeSavedPercent}%`, bg: 'bg-purple-100', text: 'text-purple-600' },
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

  const filteredReports = reports.filter((report) => {
    const query = reportSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      report.filename?.toLowerCase().includes(query) ||
      report.analyzedBy?.name?.toLowerCase().includes(query)
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

  const handleAddToTraining = async (reportId, label) => {
    try {
      await api.patch(`/admin/reports/${reportId}/training`, { trainingLabel: label });
      setReports((prev) =>
        prev.map((entry) =>
          entry._id === reportId
            ? { ...entry, addedToTraining: true, trainingLabel: label }
            : entry
        )
      );
      setOpenTrainingMenu(null);
    } catch (error) {
      setReportsError(error.response?.data?.message || 'Failed to add report to training');
    }
  };

  // --- Team handler functions ---
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setTeamError('');

    if (!newTeamName.trim()) {
      setTeamError('Team name is required');
      return;
    }

    setTeamCreating(true);
    try {
      const res = await api.post('/admin/teams', { name: newTeamName });
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
      const res = await api.patch(`/admin/teams/${manageTeamId}/members`, { memberIds: selectedMemberIds });
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
      const res = await api.delete(`/admin/teams/${manageTeamId}/members/${userId}`);
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
      const res = await api.patch(`/admin/teams/${manageTeamId}/lead`, { userId: confirmLead._id });
      setTeams(prev => prev.map(t => t._id === manageTeamId ? res.data : t));
      setLeadSuccessMessage(`${confirmLead.name} has been successfully assigned as team leader`);
      setTimeout(() => setLeadSuccessMessage(''), 4000);
      setConfirmLead(null);
      setShowAssignLead(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign team lead');
    }
  };

  const fetchTeamStats = async (range = teamFilterRange, userId = teamFilterUser, result = teamFilterResult) => {
    setTeamStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (range && range !== 'all') params.append('range', range);
      if (userId) params.append('user', userId);
      if (result) params.append('result', result);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/teams/${manageTeamId}/stats${qs}`);
      setTeamStats(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load team analytics');
      setShowTeamAnalytics(false);
    } finally {
      setTeamStatsLoading(false);
    }
  };

  const handleOpenTeamAnalytics = async () => {
    setTeamFilterRange('all');
    setTeamFilterUser('');
    setTeamFilterResult('');
    setShowTeamAnalytics(true);
    fetchTeamStats('all', '', '');
  };

  const handleDeleteTeam = async () => {
    try {
      await api.delete(`/admin/teams/${manageTeamId}`);
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

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-700">Filter Analytics</h3>
                {(filterRange !== 'all' || filterTeam || filterUser || filterResult) && (
                  <button
                    onClick={() => { setFilterRange('all'); setFilterTeam(''); setFilterUser(''); setFilterResult(''); }}
                    className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date Range</label>
                  <select
                    value={filterRange}
                    onChange={(e) => setFilterRange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">All Time</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Team</label>
                  <select
                    value={filterTeam}
                    onChange={(e) => { setFilterTeam(e.target.value); setFilterUser(''); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Teams</option>
                    {teams.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">User</label>
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Users</option>
                    {(filterTeam
                      ? users.filter(u => {
                          const selectedTeam = teams.find(t => t._id === filterTeam);
                          return selectedTeam?.members?.some(m => (typeof m === 'object' ? m._id : m) === u._id);
                        })
                      : users
                    ).map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Result</label>
                  <select
                    value={filterResult}
                    onChange={(e) => setFilterResult(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Results</option>
                    <option value="good">Passed</option>
                    <option value="bad">Failed</option>
                    <option value="uncertain">Uncertain</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active filter summary */}
            {(filterRange !== 'all' || filterTeam || filterUser || filterResult) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2 flex-wrap text-sm">
                <span className="text-indigo-700 font-medium">Showing:</span>
                {filterRange !== 'all' && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    Last {filterRange} days
                  </span>
                )}
                {filterTeam && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    Team: {teams.find(t => t._id === filterTeam)?.name || 'Unknown'}
                  </span>
                )}
                {filterUser && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    User: {users.find(u => u._id === filterUser)?.name || 'Unknown'}
                  </span>
                )}
                {filterResult && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    Result: {filterResult === 'good' ? 'Passed' : filterResult === 'bad' ? 'Failed' : 'Uncertain'}
                  </span>
                )}
              </div>
            )}

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

            {/* Quality breakdown */}
            {dashboardStats.qualityBreakdown && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
                  <p className="text-2xl font-bold text-green-600">{dashboardStats.qualityBreakdown.passed}</p>
                  <p className="text-sm text-gray-500">Passed</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                  <p className="text-2xl font-bold text-red-600">{dashboardStats.qualityBreakdown.failed}</p>
                  <p className="text-sm text-gray-500">Failed</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-amber-500">
                  <p className="text-2xl font-bold text-amber-600">{dashboardStats.qualityBreakdown.uncertain}</p>
                  <p className="text-sm text-gray-500">Uncertain</p>
                </div>
              </div>
            )}

            {loadingReports ? (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8 text-sm text-gray-500">
                Loading analytics...
              </div>
            ) : (
              <>
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
                        <Pie data={dashboardStats.errorBreakdown} dataKey="value" nameKey="name" outerRadius={80}>
                          {dashboardStats.errorBreakdown.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Savings Analysis</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {timeSavingsCards.map((item) => (
                      <div key={item.label} className={`${item.bg} rounded-lg p-6 text-center`}>
                        <p className={`text-3xl font-bold ${item.text}`}>{item.value}</p>
                        <p className="text-sm text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {reportsError && <p className="mb-4 text-sm text-red-600">{reportsError}</p>}

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
                            <td className="px-4 py-5">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusOutlineClass(
                                  entry.status
                                )}`}
                              >
                                {entry.status || 'unknown'}
                              </span>
                            </td>
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
                              <td className="px-4 py-5">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusOutlineClass(
                                    request.status
                                  )}`}
                                >
                                  {request.status || 'unknown'}
                                </span>
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

        {activeTab === 'reports' && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Analysed Reports</h2>
              <div className="flex items-center gap-3">
                {filteredReports.some(r => r.errors?.length > 0) && (
                  <button
                    onClick={() => {
                      const allExpanded = filteredReports.every(r => expandedReports[r._id]);
                      const next = {};
                      filteredReports.forEach(r => { next[r._id] = !allExpanded; });
                      setExpandedReports(next);
                    }}
                    className="text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-50"
                  >
                    {filteredReports.every(r => expandedReports[r._id]) ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
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
            </div>

            {reportsError && <p className="mb-4 text-sm text-red-600">{reportsError}</p>}

            {loadingReports ? (
              <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-500">
                Loading reports...
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div key={report._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-400 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-indigo-600 text-lg">📄</span>
                          <p className="font-bold text-gray-900 text-base">{report.filename}</p>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          Analyzed by <span className="font-semibold text-gray-700">{report.analyzedBy?.name ?? 'Unknown'}</span> on{' '}
                          {formatDate(report.analyzedAt || report.createdAt)}
                        </p>
                        <p className="text-sm mb-3">
                          <span className="text-red-500 font-medium">{report.errorCount || 0} errors found</span>
                          <span className="text-gray-400 mx-2">•</span>
                          <span className="text-green-600 font-medium">{report.timeSaved || 0} hours saved</span>
                        </p>

                        {report.errors?.length > 0 && (
                          <div className="border-t border-gray-100 pt-3">
                            <button
                              onClick={() => setExpandedReports(prev => ({ ...prev, [report._id]: !prev[report._id] }))}
                              className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 transition-colors mb-2"
                            >
                              {expandedReports[report._id]
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />
                              }
                              Errors Detected ({report.errors.length})
                            </button>
                            {expandedReports[report._id] && (
                              <div className="space-y-1 ml-5">
                                {report.errors.map((error, index) => (
                                  <div key={error._id || index} className="flex items-center gap-3">
                                    <span className="text-xs px-2 py-0.5 rounded font-medium min-w-[80px] text-center bg-gray-100 text-gray-700">
                                      {error.type}
                                    </span>
                                    <span className="text-sm text-gray-600">{error.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {user?.role === 'admin' && (
                        <div className="relative ml-4">
                          <button
                            onClick={() => setOpenTrainingMenu(openTrainingMenu === report._id ? null : report._id)}
                            className={`text-sm border rounded-lg px-3 py-1.5 whitespace-nowrap ${
                              report.addedToTraining
                                ? 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
                                : 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                            }`}
                          >
                            {report.addedToTraining
                              ? `✓ ${report.trainingLabel === 'good' ? 'Good' : 'Bad'} Example`
                              : '+ Add to Training'}
                          </button>

                          {openTrainingMenu === report._id && (
                            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-52">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Add as training example:</p>
                              <button
                                onClick={() => handleAddToTraining(report._id, 'good')}
                                className="w-full text-left text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded px-3 py-2 mb-1"
                              >
                                ✓ Good Example
                              </button>
                              <button
                                onClick={() => handleAddToTraining(report._id, 'bad')}
                                className="w-full text-left text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded px-3 py-2"
                              >
                                ✗ Bad Example
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'training' && (
          <section>
            {/* Training Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-2xl font-bold text-green-600">{trainingStats.goodExamples}</p>
                <p className="text-sm text-gray-500">Good Examples</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-2xl font-bold text-red-500">{trainingStats.badExamples}</p>
                <p className="text-sm text-gray-500">Bad Examples</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-2xl font-bold text-indigo-600">{trainingStats.trainedExamples}</p>
                <p className="text-sm text-gray-500">Trained</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-2xl font-bold text-amber-500">{trainingStats.pendingExamples}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Training Example</h2>
              <form onSubmit={handleTrainingUpload}>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('training-file-input').click()}
                >
                  <input
                    id="training-file-input"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {trainingFile ? (
                    <div className="text-indigo-600">
                      <FileText className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-medium">{trainingFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(trainingFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                      <p className="font-medium">Drop a PDF here or click to upload</p>
                      <p className="text-sm">Maximum file size: 120MB</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Type:</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trainingType"
                        value="good"
                        checked={trainingType === 'good'}
                        onChange={(e) => setTrainingType(e.target.value)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-green-600 font-medium">Good Example</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="trainingType"
                        value="bad"
                        checked={trainingType === 'bad'}
                        onChange={(e) => setTrainingType(e.target.value)}
                        className="text-red-500 focus:ring-red-500"
                      />
                      <span className="text-sm text-red-500 font-medium">Bad Example</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={!trainingFile || uploadingTraining}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingTraining ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </form>
            </div>

            {/* Messages */}
            {trainingMessage && (
              <div className="mb-4 px-4 py-3 bg-green-100 text-green-800 rounded-lg text-sm">
                {trainingMessage}
              </div>
            )}
            {trainingError && (
              <div className="mb-4 px-4 py-3 bg-red-100 text-red-800 rounded-lg text-sm">
                {trainingError}
              </div>
            )}

            {/* Training Examples List */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Training Examples</h2>
                <button
                  onClick={handleSyncTraining}
                  disabled={syncingTraining}
                  className="text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg px-4 py-2 hover:bg-indigo-50 disabled:opacity-50"
                >
                  {syncingTraining ? 'Syncing...' : 'Sync from Reports'}
                </button>
              </div>

              {loadingTraining ? (
                <p className="text-gray-500 text-sm">Loading training examples...</p>
              ) : trainingExamples.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No training examples yet. Upload PDFs above or label reports in the Reports tab.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-600">
                        <th className="px-4 py-3 font-semibold">Filename</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Uploaded</th>
                        <th className="px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainingExamples.map((example) => (
                        <tr key={example._id} className="border-b border-gray-100 last:border-b-0">
                          <td className="px-4 py-4 text-gray-900">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="truncate max-w-[200px]">{example.filename}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                example.type === 'good'
                                  ? 'bg-green-100 text-green-700'
                                  : example.type === 'bad'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {example.type}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                example.status === 'trained'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : example.status === 'processing'
                                  ? 'bg-amber-100 text-amber-700'
                                  : example.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {example.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {formatDate(example.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleDeleteTrainingExample(example._id)}
                              disabled={deletingExampleId === example._id}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deletingExampleId === example._id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TEAMS TAB ── */}
        {activeTab === 'teams' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            {leadSuccessMessage && (
              <div className="mb-4 px-4 py-3 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                {leadSuccessMessage}
              </div>
            )}
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
                    <button onClick={handleOpenTeamAnalytics} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
                      View Analytics
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

            {/* Team Analytics Overlay */}
            {showTeamAnalytics && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Team Analytics</h3>
                      <p className="text-sm text-gray-500">
                        {teams.find(t => t._id === manageTeamId)?.name}
                        {teamStats?.teamLead && (
                          <span className="ml-2 text-xs text-indigo-600 font-medium">Lead: {teamStats.teamLead.name}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowTeamAnalytics(false); setTeamStats(null); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Team Analytics Filters */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Filter className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-semibold text-gray-700">Filter Analytics</h4>
                      {(teamFilterRange !== 'all' || teamFilterUser || teamFilterResult) && (
                        <button
                          onClick={() => { setTeamFilterRange('all'); setTeamFilterUser(''); setTeamFilterResult(''); fetchTeamStats('all', '', ''); }}
                          className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Date Range</label>
                        <select
                          value={teamFilterRange}
                          onChange={(e) => { setTeamFilterRange(e.target.value); fetchTeamStats(e.target.value, teamFilterUser, teamFilterResult); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="all">All Time</option>
                          <option value="7">Last 7 Days</option>
                          <option value="30">Last 30 Days</option>
                          <option value="90">Last 90 Days</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Member</label>
                        <select
                          value={teamFilterUser}
                          onChange={(e) => { setTeamFilterUser(e.target.value); fetchTeamStats(teamFilterRange, e.target.value, teamFilterResult); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">All Members</option>
                          {(() => {
                            const currentTeam = teams.find(t => t._id === manageTeamId);
                            return (currentTeam?.members || []).map(m => {
                              const member = typeof m === 'object' ? m : null;
                              return member ? (
                                <option key={member._id} value={member._id}>{member.name}</option>
                              ) : null;
                            });
                          })()}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Result</label>
                        <select
                          value={teamFilterResult}
                          onChange={(e) => { setTeamFilterResult(e.target.value); fetchTeamStats(teamFilterRange, teamFilterUser, e.target.value); }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">All Results</option>
                          <option value="good">Passed</option>
                          <option value="bad">Failed</option>
                          <option value="uncertain">Uncertain</option>
                        </select>
                      </div>
                    </div>
                    {/* Active filter pills */}
                    {(teamFilterRange !== 'all' || teamFilterUser || teamFilterResult) && (
                      <div className="flex items-center gap-2 flex-wrap mt-3 text-sm">
                        <span className="text-indigo-700 font-medium text-xs">Showing:</span>
                        {teamFilterRange !== 'all' && (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            Last {teamFilterRange} days
                          </span>
                        )}
                        {teamFilterUser && (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            Member: {(() => {
                              const currentTeam = teams.find(t => t._id === manageTeamId);
                              const member = currentTeam?.members?.find(m => (typeof m === 'object' ? m._id : m) === teamFilterUser);
                              return typeof member === 'object' ? member.name : 'Unknown';
                            })()}
                          </span>
                        )}
                        {teamFilterResult && (
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            Result: {teamFilterResult === 'good' ? 'Passed' : teamFilterResult === 'bad' ? 'Failed' : 'Uncertain'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {teamStatsLoading ? (
                    <p className="text-gray-400 text-sm text-center py-8 animate-pulse">Loading analytics...</p>
                  ) : teamStats ? (
                    <>
                      {/* Stat cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
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
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
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
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
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
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
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

                      {/* Quality Assessment Breakdown */}
                      {teamStats.qualityBreakdown && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{teamStats.qualityBreakdown.passed}</p>
                            <p className="text-xs text-gray-500 mt-1">Passed</p>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">{teamStats.qualityBreakdown.failed}</p>
                            <p className="text-xs text-gray-500 mt-1">Failed</p>
                          </div>
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-amber-600">{teamStats.qualityBreakdown.uncertain}</p>
                            <p className="text-xs text-gray-500 mt-1">Uncertain</p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-gray-600">{teamStats.qualityBreakdown.pending}</p>
                            <p className="text-xs text-gray-500 mt-1">Pending</p>
                          </div>
                        </div>
                      )}

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
                      <div className="border border-gray-200 rounded-xl p-4 mb-6">
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
                      </div>

                      {/* Member Breakdown */}
                      {teamStats.memberBreakdown?.length > 0 && (
                        <div className="border border-gray-200 rounded-xl p-4 mb-6">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Member Breakdown</h4>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 bg-gray-50">
                                <th className="pb-2 pt-2 px-3">Member</th>
                                <th className="pb-2 pt-2 px-3 text-center">Reports</th>
                                <th className="pb-2 pt-2 px-3 text-center">Errors</th>
                                <th className="pb-2 pt-2 px-3 text-center">Passed</th>
                                <th className="pb-2 pt-2 px-3 text-center">Failed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teamStats.memberBreakdown.map(m => (
                                <tr key={m._id} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="py-2.5 px-3">
                                    <p className="font-medium text-gray-900">{m.name}</p>
                                    <p className="text-xs text-gray-400">{m.email}</p>
                                  </td>
                                  <td className="py-2.5 px-3 text-center text-gray-700">{m.reportsCount}</td>
                                  <td className="py-2.5 px-3 text-center text-red-600 font-medium">{m.errorsFound}</td>
                                  <td className="py-2.5 px-3 text-center text-green-600 font-medium">{m.passed}</td>
                                  <td className="py-2.5 px-3 text-center text-red-600 font-medium">{m.failed}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Recent Reports */}
                      {teamStats.recentReports?.length > 0 && (
                        <div className="border border-gray-200 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Reports</h4>
                          <div className="space-y-2">
                            {teamStats.recentReports.map(r => (
                              <div key={r._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{r.filename}</p>
                                  <p className="text-xs text-gray-400">
                                    by {r.analyzedBy} — {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                  <span className="text-xs text-red-500 font-medium">{r.errorCount} errors</span>
                                  {r.result === 'good' && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">Passed</span>
                                  )}
                                  {r.result === 'bad' && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">Failed</span>
                                  )}
                                  {r.result === 'uncertain' && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-700">Uncertain</span>
                                  )}
                                  {!r.result && (
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500">{r.status}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {teamStats.totalReports === 0 && (
                        <div className="bg-gray-50 rounded-xl p-8 text-center">
                          <p className="text-gray-400 text-sm">No reports have been submitted by members of this team yet.</p>
                        </div>
                      )}
                    </>
                  ) : null}

                  <button
                    onClick={() => { setShowTeamAnalytics(false); setTeamStats(null); }}
                    className="mt-4 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

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
