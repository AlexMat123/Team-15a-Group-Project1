import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Users, FileText, AlertTriangle, Clock, Target, Plus, Trash2, CheckCircle2, ChevronDown, ChevronUp, Megaphone, X } from 'lucide-react';
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
  const [comparisonPrimaryUserId, setComparisonPrimaryUserId] = useState('');
  const [comparisonSecondaryUserId, setComparisonSecondaryUserId] = useState('');
  const [analyticsRange, setAnalyticsRange] = useState('30');
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [teamStatsLoading, setTeamStatsLoading] = useState(false);
  const [teamStatsError, setTeamStatsError] = useState('');

  // Goals state
  const [goals, setGoals] = useState([]);
  const [currentStats, setCurrentStats] = useState(null);
  const [showGoals, setShowGoals] = useState(true);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState('pass_rate');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState('');

  // Announcements state
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [annError, setAnnError] = useState('');

  // Unread announcement overlay state
  const [unreadQueue, setUnreadQueue] = useState([]);
  const [acknowledging, setAcknowledging] = useState(false);

  const isTeamLead = user?.role === 'team_leader';
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const fetchTeamStats = async (range = analyticsRange) => {
    setTeamStatsLoading(true);
    setTeamStatsError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/teams/my-team/stats', {
        headers: { Authorization: `Bearer ${token}` },
        params: { range },
      });
      setTeamStats(res.data);
      return true;
    } catch (e) {
      setTeamStatsError(e.response?.data?.message || 'Failed to load team analytics');
      return false;
    } finally {
      setTeamStatsLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/teams/my-team/goals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoals(res.data.goals || []);
      setCurrentStats(res.data.current || null);
    } catch (e) {
      console.error('Failed to load goals:', e);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/teams/my-team/announcements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const all = res.data || [];
      setAnnouncements(all);
      // Build unread queue (oldest unread first so they read in chronological order)
      const unread = [...all].filter(a => !a.readByMe).reverse();
      setUnreadQueue(unread);
    } catch (e) {
      console.error('Failed to load announcements:', e);
    }
  };

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get('/api/teams/my-team', { headers });
        setTeam(res.data);

        // Fetch stats if team lead
        if (user?.role === 'team_leader') {
          await fetchTeamStats('30');
        }
      } catch (err) {
        console.error('Failed to load team:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
    fetchGoals();
    fetchAnnouncements();
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

  const handleFetchComparison = async () => {
    setComparisonError('');
    setComparisonData(null);

    if (!comparisonPrimaryUserId || !comparisonSecondaryUserId) {
      setComparisonError('Select two team members to compare.');
      return;
    }

    if (comparisonPrimaryUserId === comparisonSecondaryUserId) {
      setComparisonError('Choose two different team members.');
      return;
    }

    setComparisonLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/teams/my-team/comparison', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          primaryUserId: comparisonPrimaryUserId,
          secondaryUserId: comparisonSecondaryUserId,
          range: analyticsRange,
        },
      });
      setComparisonData(res.data);
    } catch (err) {
      setComparisonError(err.response?.data?.message || 'Failed to load comparison analytics');
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleOpenAnnouncements = async () => {
    setShowAnnouncementsModal(true);
    setShowCreateAnnouncement(false);
    setAnnError('');
    setAnnouncementsLoading(true);
    try {
      await fetchAnnouncements();
    } catch (err) {
      setAnnError('Failed to load announcements');
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setAnnError('');
    if (!annTitle.trim() || !annContent.trim()) {
      setAnnError('Title and content are required.');
      return;
    }
    setSavingAnnouncement(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/teams/my-team/announcements',
        { title: annTitle.trim(), content: annContent.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnnouncements(prev => [res.data, ...prev]);
      setAnnTitle('');
      setAnnContent('');
      setShowCreateAnnouncement(false);
    } catch (err) {
      setAnnError(err.response?.data?.message || 'Failed to create announcement');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/teams/my-team/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const formatAnnDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleAcknowledge = async (announcementId) => {
    setAcknowledging(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/teams/my-team/announcements/${announcementId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Mark as read in announcements list too
      setAnnouncements(prev => prev.map(a =>
        a._id === announcementId ? { ...a, readByMe: true } : a
      ));
    } catch (e) {
      console.error('Failed to mark as read:', e);
    } finally {
      // Move to next in queue regardless of API result
      setUnreadQueue(prev => prev.filter(a => a._id !== announcementId));
      setAcknowledging(false);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    setGoalError('');
    if (!goalTitle.trim() || !goalTarget) {
      setGoalError('Please fill in all required fields.');
      return;
    }
    setSavingGoal(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/teams/my-team/goals',
        { title: goalTitle.trim(), type: goalType, target: Number(goalTarget), deadline: goalDeadline || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGoals(prev => [...prev, res.data]);
      setGoalTitle('');
      setGoalType('pass_rate');
      setGoalTarget('');
      setGoalDeadline('');
      setShowAddGoal(false);
    } catch (err) {
      setGoalError(err.response?.data?.message || 'Failed to save goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/teams/my-team/goals/${goalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoals(prev => prev.filter(g => g._id !== goalId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete goal');
    }
  };

  const GOAL_TYPE_LABELS = {
    pass_rate: 'Pass Rate (%)',
    reports_submitted: 'Reports Submitted',
    avg_errors_below: 'Avg. Errors Per Report Below',
  };

  const comparisonMetricRows = [
    { key: 'totalReports', label: 'Reports', suffix: '' },
    { key: 'analyzedReports', label: 'Analysed Reports', suffix: '' },
    { key: 'totalErrors', label: 'Errors Found', suffix: '' },
    { key: 'averageErrorsPerReport', label: 'Avg. Errors / Report', suffix: '' },
    { key: 'passRate', label: 'Pass Rate', suffix: '%' },
    { key: 'totalTimeSaved', label: 'Time Saved', suffix: 'h' },
  ];

  const errorTypeLabelMap = {
    placeholder: 'Placeholder',
    consistency: 'Consistency',
    compliance: 'Compliance',
    formatting: 'Formatting',
    missing_data: 'Missing Data',
  };
  const errorTypeColors = ['#F97316', '#2563EB', '#DC2626', '#9333EA', '#16A34A'];
  const teamPassRateChartData = teamStats?.passFailRateTrends?.map((item, index) => ({
    pointIndex: index,
    periodLabel: item.periodLabel,
    analyzedCount: Number(item.analyzedCount ?? 0),
    passedCount: Number(item.passedCount ?? 0),
    failedCount: Number(item.failedCount ?? 0),
    passRate: Number(item.passRate ?? 0),
  })) || [];
  const teamQualityScoreMaxValue = teamStats?.qualityScoreTrend?.reduce(
    (max, report) => Math.max(max, report.qualityScore || 0),
    0
  ) ?? 0;
  const teamQualityScoreChartData = teamStats?.qualityScoreTrend?.map((report, index) => ({
    pointIndex: index,
    label: report.filename.length > 18 ? `${report.filename.slice(0, 18)}...` : report.filename,
    fullLabel: report.filename,
    score: Number(report.qualityScore ?? 0),
    date: formatDate(report.createdAt),
  })) || [];
  const teamCommonErrorTypeChartData = teamStats?.mostCommonErrorTypes?.map((item, index) => ({
    name: errorTypeLabelMap[item.type] || item.type,
    errors: item.count,
    reportsAffected: item.reportsAffected,
    fill: errorTypeColors[index % errorTypeColors.length],
  })) || [];
  const teamChecklistFailureChartData = teamStats?.checklistFailureBreakdown?.map((item) => ({
    shortLabel: item.message.length > 28 ? `${item.message.slice(0, 28)}...` : item.message,
    fullLabel: item.message,
    count: item.count,
  })) || [];
  const comparisonPrimaryScope = comparisonData?.primaryScope || null;
  const comparisonSecondaryScope = comparisonData?.secondaryScope || null;
  const comparisonColours = {
    primary: '#6366f1',
    secondary: '#10b981',
  };

  const buildMergedPeriodSeries = (primary = [], secondary = [], valueKey) => {
    const merged = new Map();

    primary.forEach((item) => {
      const key = item.periodKey || item.periodLabel || item.period;
      merged.set(key, {
        periodKey: key,
        periodLabel: item.periodLabel || item.period || key,
        primaryValue: Number(item[valueKey] ?? 0),
        secondaryValue: null,
      });
    });

    secondary.forEach((item) => {
      const key = item.periodKey || item.periodLabel || item.period;
      if (!merged.has(key)) {
        merged.set(key, {
          periodKey: key,
          periodLabel: item.periodLabel || item.period || key,
          primaryValue: null,
          secondaryValue: null,
        });
      }
      merged.get(key).secondaryValue = Number(item[valueKey] ?? 0);
    });

    return Array.from(merged.values()).map((item, index) => ({
      ...item,
      pointIndex: index,
    }));
  };

  const buildMergedErrorTypeSeries = (primary = [], secondary = []) => {
    const merged = new Map();

    primary.forEach((item) => {
      merged.set(item.name, {
        name: item.name,
        primaryValue: Number(item.value ?? item.errors ?? 0),
        secondaryValue: 0,
      });
    });

    secondary.forEach((item) => {
      if (!merged.has(item.name)) {
        merged.set(item.name, {
          name: item.name,
          primaryValue: 0,
          secondaryValue: 0,
        });
      }
      merged.get(item.name).secondaryValue = Number(item.value ?? item.errors ?? 0);
    });

    return Array.from(merged.values());
  };

  const buildMergedQualityScoreSeries = (primary = [], secondary = []) => {
    const maxLength = Math.max(primary.length, secondary.length);

    return Array.from({ length: maxLength }, (_, index) => {
      const primaryItem = primary[index];
      const secondaryItem = secondary[index];

      return {
        pointIndex: index,
        pointLabel: `Report ${index + 1}`,
        primaryDate: primaryItem?.createdAt ? formatDate(primaryItem.createdAt) : null,
        secondaryDate: secondaryItem?.createdAt ? formatDate(secondaryItem.createdAt) : null,
        primaryValue: primaryItem ? Number(primaryItem.qualityScore ?? 0) : null,
        secondaryValue: secondaryItem ? Number(secondaryItem.qualityScore ?? 0) : null,
      };
    });
  };

  const comparisonReportsChartData = comparisonData
    ? buildMergedPeriodSeries(comparisonPrimaryScope?.trendData, comparisonSecondaryScope?.trendData, 'reports')
    : [];
  const comparisonPassRateChartData = comparisonData
    ? buildMergedPeriodSeries(comparisonPrimaryScope?.passFailRateTrends, comparisonSecondaryScope?.passFailRateTrends, 'passRate')
    : [];
  const comparisonErrorTypeChartData = comparisonData
    ? buildMergedErrorTypeSeries(comparisonPrimaryScope?.errorBreakdown, comparisonSecondaryScope?.errorBreakdown)
    : [];
  const comparisonQualityScoreChartData = comparisonData
    ? buildMergedQualityScoreSeries(comparisonPrimaryScope?.qualityScoreTrend, comparisonSecondaryScope?.qualityScoreTrend)
    : [];
  const comparisonQualityScoreMaxValue = comparisonQualityScoreChartData.reduce(
    (max, item) => Math.max(max, item.primaryValue ?? 0, item.secondaryValue ?? 0),
    0
  );

  const getGoalProgress = (goal) => {
    if (!currentStats) return { current: 0, pct: 0, met: false };
    const current = currentStats[goal.type] ?? 0;
    let pct;
    if (goal.type === 'avg_errors_below') {
      // Lower is better — goal met when current <= target
      pct = current === 0 ? 100 : Math.min(100, Math.round((goal.target / current) * 100));
      return { current, pct, met: current <= goal.target };
    }
    pct = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0;
    return { current, pct, met: current >= goal.target };
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

                <button
                  onClick={handleOpenAnnouncements}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Megaphone className="w-4 h-4" />
                  View Announcements
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
                      onClick={async () => {
                        setComparisonError('');
                        setComparisonData(null);
                        setComparisonPrimaryUserId('');
                        setComparisonSecondaryUserId('');
                        setAnalyticsRange('30');
                        const loaded = await fetchTeamStats('30');
                        if (loaded || teamStats) {
                          setShowStats(true);
                        }
                      }}
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

            {/* Team Goals Section — visible to all members */}
            <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowGoals(v => !v)}
                  className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-indigo-600"
                >
                  <Target className="w-5 h-5 text-indigo-600" />
                  Team Goals
                  {showGoals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isTeamLead && (
                  <button
                    onClick={() => { setShowAddGoal(true); setGoalError(''); }}
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Goal
                  </button>
                )}
              </div>

              {showGoals && (
                goals.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No goals set yet{isTeamLead ? ' — add one above.' : '.'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {goals.map(goal => {
                      const { current, pct, met } = getGoalProgress(goal);
                      const isErrorGoal = goal.type === 'avg_errors_below';
                      return (
                        <div key={goal._id} className={`border rounded-xl p-4 ${met ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {met && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
                                {met && (
                                  <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    Achieved!
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {GOAL_TYPE_LABELS[goal.type]}
                                {goal.type === 'pass_rate' && ` — Target: ${goal.target}%`}
                                {goal.type === 'reports_submitted' && ` — Target: ${goal.target} reports`}
                                {goal.type === 'avg_errors_below' && ` — Target: below ${goal.target} errors/report`}
                                {goal.deadline && (
                                  <span className="ml-2 text-indigo-500">
                                    · Deadline: {new Date(goal.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </p>
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>
                                    Current: {isErrorGoal
                                      ? `${current} errors/report`
                                      : goal.type === 'pass_rate'
                                        ? `${current}%`
                                        : `${current} reports`}
                                  </span>
                                  <span>{pct}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-500 ${met ? 'bg-green-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            {isTeamLead && (
                              <button
                                onClick={() => handleDeleteGoal(goal._id)}
                                className="text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
                                title="Delete goal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Unread Announcements Overlay — shown on page load */}
            {unreadQueue.length > 0 && (() => {
              const current = unreadQueue[0];
              const total = unreadQueue.length;
              const index = announcements.filter(a => !a.readByMe).length - total;
              return (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                  {/* Full-screen blurred backdrop */}
                  <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" />

                  <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Coloured top bar */}
                    <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-white" />
                        <span className="text-white font-semibold text-sm">New Team Announcement</span>
                      </div>
                      <span className="text-indigo-200 text-xs font-medium">
                        {total} unread {total === 1 ? 'announcement' : 'announcements'}
                      </span>
                    </div>

                    {/* Progress dots */}
                    {total > 1 && (
                      <div className="flex gap-1.5 justify-center pt-4 px-6">
                        {unreadQueue.map((a, i) => (
                          <div
                            key={a._id}
                            className={`h-1.5 rounded-full transition-all ${i === 0 ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200'}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="px-6 py-5">
                      <h2 className="text-xl font-bold text-gray-900 mb-1">{current.title}</h2>
                      <p className="text-xs text-gray-400 mb-4">
                        Posted by {current.createdBy?.name || 'Team Leader'} · {formatAnnDate(current.createdAt)}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {current.content}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        {total > 1 ? `${total - 1} more to go` : 'Last announcement'}
                      </p>
                      <button
                        onClick={() => handleAcknowledge(current._id)}
                        disabled={acknowledging}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {acknowledging ? 'Saving...' : total > 1 ? 'Got it — Next' : 'Got it — Close'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Announcements Modal */}
            {showAnnouncementsModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Team Announcements</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {isTeamLead && !showCreateAnnouncement && (
                        <button
                          onClick={() => { setShowCreateAnnouncement(true); setAnnError(''); }}
                          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <Plus className="w-4 h-4" />
                          New Announcement
                        </button>
                      )}
                      <button
                        onClick={() => { setShowAnnouncementsModal(false); setShowCreateAnnouncement(false); setAnnError(''); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* Create form — team lead only */}
                    {showCreateAnnouncement && (
                      <form onSubmit={handleCreateAnnouncement} className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-indigo-800">New Announcement</h4>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={annTitle}
                            onChange={e => setAnnTitle(e.target.value)}
                            placeholder="e.g. Q2 performance update"
                            maxLength={100}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Content <span className="text-red-500">*</span></label>
                          <textarea
                            value={annContent}
                            onChange={e => setAnnContent(e.target.value)}
                            placeholder="Write your announcement here..."
                            rows={4}
                            maxLength={1000}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          />
                          <p className="text-xs text-gray-400 text-right mt-0.5">{annContent.length}/1000</p>
                        </div>
                        {annError && <p className="text-sm text-red-600">{annError}</p>}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setShowCreateAnnouncement(false); setAnnError(''); setAnnTitle(''); setAnnContent(''); }}
                            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingAnnouncement}
                            className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {savingAnnouncement ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Announcement list */}
                    {announcementsLoading ? (
                      <p className="text-center text-gray-400 text-sm py-8 animate-pulse">Loading announcements...</p>
                    ) : announcements.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No announcements yet{isTeamLead ? ' — create the first one above.' : '.'}</p>
                      </div>
                    ) : (
                      announcements.map(ann => (
                        <div key={ann._id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900">{ann.title}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Posted by {ann.createdBy?.name || 'Team Leader'} · {formatAnnDate(ann.createdAt)}
                              </p>
                              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{ann.content}</p>
                            </div>
                            {isTeamLead && (
                              <button
                                onClick={() => handleDeleteAnnouncement(ann._id)}
                                className="text-red-400 hover:text-red-600 flex-shrink-0"
                                title="Delete announcement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Add Goal Modal — team lead only */}
            {showAddGoal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Add Team Goal</h3>
                  <p className="text-sm text-gray-500 mb-4">Set a measurable target for your team to work towards.</p>
                  <form onSubmit={handleAddGoal} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={goalTitle}
                        onChange={e => setGoalTitle(e.target.value)}
                        placeholder="e.g. Achieve 80% pass rate this month"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Goal Type <span className="text-red-500">*</span></label>
                      <select
                        value={goalType}
                        onChange={e => { setGoalType(e.target.value); setGoalTarget(''); }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pass_rate">Pass Rate (%)</option>
                        <option value="reports_submitted">Reports Submitted (count)</option>
                        <option value="avg_errors_below">Avg. Errors Per Report — Below</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target{goalType === 'pass_rate' ? ' (%)' : goalType === 'reports_submitted' ? ' (number of reports)' : ' (max errors per report)'}
                        <span className="text-red-500"> *</span>
                      </label>
                      <input
                        type="number"
                        value={goalTarget}
                        onChange={e => setGoalTarget(e.target.value)}
                        min={0}
                        max={goalType === 'pass_rate' ? 100 : undefined}
                        step={goalType === 'avg_errors_below' ? 0.1 : 1}
                        placeholder={goalType === 'pass_rate' ? '80' : goalType === 'reports_submitted' ? '50' : '5'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deadline <span className="text-gray-400">(optional)</span></label>
                      <input
                        type="date"
                        value={goalDeadline}
                        onChange={e => setGoalDeadline(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {goalError && <p className="text-sm text-red-600">{goalError}</p>}
                    <div className="flex justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowAddGoal(false); setGoalError(''); }}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingGoal}
                        className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingGoal ? 'Saving...' : 'Save Goal'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Team Analytics Modal — team lead only */}
            {showStats && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Team Analytics</h3>
                      <p className="text-sm text-gray-500">{team.name}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <select
                        value={analyticsRange}
                        onChange={(e) => setAnalyticsRange(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="all">All time</option>
                      </select>
                      <button
                        onClick={() => fetchTeamStats(analyticsRange)}
                        disabled={teamStatsLoading}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {teamStatsLoading ? 'Loading...' : 'Refresh Analytics'}
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl p-4 mb-6">
                    <h4 className="text-sm font-semibold text-gray-900">Compare Team Members</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Select two people from your team and compare their analytics over a date range.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">First team member</label>
                        <select
                          value={comparisonPrimaryUserId}
                          onChange={(e) => setComparisonPrimaryUserId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select a user</option>
                          {team.members.map((member) => (
                            <option key={member._id} value={member._id}>
                              {member.name} ({member.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Second team member</label>
                        <select
                          value={comparisonSecondaryUserId}
                          onChange={(e) => setComparisonSecondaryUserId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select a user</option>
                          {team.members.map((member) => (
                            <option key={member._id} value={member._id}>
                              {member.name} ({member.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <div className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600">
                          Using {analyticsRange === 'all' ? 'all-time' : `last ${analyticsRange} days`} analytics
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-4">
                      <p className="text-xs text-gray-500">
                        Comparison is restricted to members of {team.name}.
                      </p>
                      <button
                        onClick={handleFetchComparison}
                        disabled={comparisonLoading}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {comparisonLoading ? 'Loading...' : 'Compare Members'}
                      </button>
                    </div>

                    {comparisonError && (
                      <p className="mt-3 text-sm text-red-600">{comparisonError}</p>
                    )}

                    {comparisonData && (
                      <>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[comparisonData.primaryScope, comparisonData.secondaryScope].map((scope) => (
                            <div key={scope.scopeDetails.userId} className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/40">
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-gray-900">{scope.scopeDetails.userName}</h5>
                                <p className="text-xs text-gray-500">{scope.scopeDetails.userEmail}</p>
                                <p className="text-xs text-indigo-600 mt-1">
                                  {analyticsRange === 'all' ? 'All time' : `Last ${analyticsRange} days`}
                                </p>
                              </div>

                              <div className="space-y-2">
                                {comparisonMetricRows.map((metric) => (
                                  <div key={metric.key} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">{metric.label}</span>
                                    <span className="font-semibold text-gray-900">
                                      {scope.summary[metric.key]}{metric.suffix}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                          <div className="border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Reports Over Time</h4>
                            {comparisonReportsChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={comparisonReportsChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                  <XAxis type="number" dataKey="pointIndex" domain={['dataMin', 'dataMax']} allowDecimals={false} tick={{ fontSize: 10 }} minTickGap={12} tickFormatter={(value) => comparisonReportsChartData[value]?.periodLabel || ''} />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.periodLabel || label} />
                                  <Legend />
                                  <Line type="linear" dataKey="primaryValue" name={comparisonPrimaryScope?.scopeDetails?.userName || 'Primary'} stroke={comparisonColours.primary} strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                                  <Line type="linear" dataKey="secondaryValue" name={comparisonSecondaryScope?.scopeDetails?.userName || 'Secondary'} stroke={comparisonColours.secondary} strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No report trend data available yet.</div>
                            )}
                          </div>

                          <div className="border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Pass Rate Over Time</h4>
                            {comparisonPassRateChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={comparisonPassRateChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                  <XAxis type="number" dataKey="pointIndex" domain={['dataMin', 'dataMax']} allowDecimals={false} tick={{ fontSize: 10 }} minTickGap={12} tickFormatter={(value) => comparisonPassRateChartData[value]?.periodLabel || ''} />
                                  <YAxis domain={[0, 105]} tick={{ fontSize: 12 }} />
                                  <Tooltip formatter={(value) => [`${value}%`, 'Pass Rate']} labelFormatter={(label, payload) => payload?.[0]?.payload?.periodLabel || label} />
                                  <Legend />
                                  <Line type="linear" dataKey="primaryValue" name={comparisonPrimaryScope?.scopeDetails?.userName || 'Primary'} stroke={comparisonColours.primary} strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                                  <Line type="linear" dataKey="secondaryValue" name={comparisonSecondaryScope?.scopeDetails?.userName || 'Secondary'} stroke={comparisonColours.secondary} strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No pass rate trend available yet.</div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                          <div className="border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Quality Score Trend</h4>
                            {comparisonQualityScoreChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={comparisonQualityScoreChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                  <XAxis type="number" dataKey="pointIndex" domain={['dataMin', 'dataMax']} allowDecimals={false} tick={{ fontSize: 10 }} minTickGap={12} tickFormatter={(value) => comparisonQualityScoreChartData[value]?.pointLabel || ''} />
                                  <YAxis domain={[0, Math.max(comparisonQualityScoreMaxValue, 105)]} tick={{ fontSize: 12 }} />
                                  <Tooltip labelFormatter={(label, payload) => payload?.[0]?.payload?.pointLabel || label} />
                                  <Legend />
                                  <Line type="linear" dataKey="primaryValue" name={comparisonPrimaryScope?.scopeDetails?.userName || 'Primary'} stroke={comparisonColours.primary} strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                                  <Line type="linear" dataKey="secondaryValue" name={comparisonSecondaryScope?.scopeDetails?.userName || 'Secondary'} stroke={comparisonColours.secondary} strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No quality score trend available yet.</div>
                            )}
                          </div>

                          <div className="border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Most Common Error Types</h4>
                            {comparisonErrorTypeChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={comparisonErrorTypeChartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Bar dataKey="primaryValue" name={comparisonPrimaryScope?.scopeDetails?.userName || 'Primary'} fill={comparisonColours.primary} />
                                  <Bar dataKey="secondaryValue" name={comparisonSecondaryScope?.scopeDetails?.userName || 'Secondary'} fill={comparisonColours.secondary} />
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No error type comparison data available yet.</div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                          <div className="border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Common Errors</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-semibold text-indigo-700 mb-3">{comparisonPrimaryScope?.scopeDetails?.userName}</p>
                                {comparisonPrimaryScope?.topErrors?.slice(0, 5).length ? comparisonPrimaryScope.topErrors.slice(0, 5).map((error, idx) => (
                                  <div key={`comparison-primary-error-${idx}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                    <span className="text-sm text-gray-700 truncate max-w-[80%]">{error.message}</span>
                                    <span className="text-sm font-semibold text-indigo-600">{error.count}</span>
                                  </div>
                                )) : <p className="text-sm text-gray-400">No errors found</p>}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-green-700 mb-3">{comparisonSecondaryScope?.scopeDetails?.userName}</p>
                                {comparisonSecondaryScope?.topErrors?.slice(0, 5).length ? comparisonSecondaryScope.topErrors.slice(0, 5).map((error, idx) => (
                                  <div key={`comparison-secondary-error-${idx}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                    <span className="text-sm text-gray-700 truncate max-w-[80%]">{error.message}</span>
                                    <span className="text-sm font-semibold text-green-600">{error.count}</span>
                                  </div>
                                )) : <p className="text-sm text-gray-400">No errors found</p>}
                              </div>
                            </div>
                          </div>

                          <div className="border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Reports</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-semibold text-indigo-700 mb-3">{comparisonPrimaryScope?.scopeDetails?.userName}</p>
                                {comparisonPrimaryScope?.recentReports?.slice(0, 5).length ? comparisonPrimaryScope.recentReports.slice(0, 5).map((report) => (
                                  <div key={`comparison-primary-report-${report._id}`} className="rounded-lg bg-gray-50 px-3 py-2 mb-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">{report.filename}</p>
                                    <p className="text-xs text-gray-500 mt-1">{report.errorCount} errors · {formatDate(report.createdAt)}</p>
                                  </div>
                                )) : <p className="text-sm text-gray-400">No recent reports</p>}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-green-700 mb-3">{comparisonSecondaryScope?.scopeDetails?.userName}</p>
                                {comparisonSecondaryScope?.recentReports?.slice(0, 5).length ? comparisonSecondaryScope.recentReports.slice(0, 5).map((report) => (
                                  <div key={`comparison-secondary-report-${report._id}`} className="rounded-lg bg-gray-50 px-3 py-2 mb-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">{report.filename}</p>
                                    <p className="text-xs text-gray-500 mt-1">{report.errorCount} errors · {formatDate(report.createdAt)}</p>
                                  </div>
                                )) : <p className="text-sm text-gray-400">No recent reports</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {teamStatsError && (
                    <p className="mb-4 text-sm text-red-600">{teamStatsError}</p>
                  )}

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

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">{teamStats.qualityBreakdown?.passed ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Passed</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{teamStats.qualityBreakdown?.failed ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Failed</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">{teamStats.qualityBreakdown?.uncertain ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Uncertain</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-600">{teamStats.summary?.pendingReports ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">Pending</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Reports Over Time</h4>
                      {teamStats.trendData?.length ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={teamStats.trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="reports" fill="#6366f1" />
                            <Bar dataKey="errors" fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No report trend data available yet.</div>}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Pass Rate Over Time</h4>
                      {teamPassRateChartData.length ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={teamPassRateChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" dataKey="pointIndex" domain={['dataMin', 'dataMax']} allowDecimals={false} tick={{ fontSize: 10 }} minTickGap={12} tickFormatter={(value) => teamPassRateChartData[value]?.periodLabel || ''} />
                            <YAxis domain={[0, 105]} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => [`${value}%`, 'Pass Rate']} labelFormatter={(label, payload) => payload?.[0]?.payload?.periodLabel || label} />
                            <Line type="linear" dataKey="passRate" name="Pass Rate" stroke="#10b981" strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No pass rate trend available yet.</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Quality Score Trend</h4>
                      {teamQualityScoreChartData.length ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={teamQualityScoreChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" dataKey="pointIndex" domain={['dataMin', 'dataMax']} allowDecimals={false} tick={{ fontSize: 10 }} minTickGap={12} tickFormatter={(value) => teamQualityScoreChartData[value]?.label || ''} />
                            <YAxis domain={[0, Math.max(teamQualityScoreMaxValue, 105)]} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value) => [`${value}`, 'Quality Score']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label} />
                            <Line type="linear" dataKey="score" name="Quality Score" stroke="#6366f1" strokeWidth={3} isAnimationActive={false} connectNulls dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No quality score trend available yet.</div>}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Most Common Error Types</h4>
                      {teamCommonErrorTypeChartData.length ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={teamCommonErrorTypeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis />
                            <Tooltip formatter={(value) => [`${value}`, 'Errors']} />
                            <Bar dataKey="errors" name="Errors">
                              {teamCommonErrorTypeChartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No common error type data available yet.</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Recurring Checklist Failures</h4>
                      {teamChecklistFailureChartData.length ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={teamChecklistFailureChartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="shortLabel" type="category" tick={{ fontSize: 11 }} width={70} />
                            <Tooltip formatter={(value) => [`${value}`, 'Occurrences']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label} />
                            <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No recurring checklist failures found.</div>}
                    </div>

                    <div className="border border-gray-200 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Common Errors</h4>
                      {teamStats.topErrors?.length ? (
                        <div className="space-y-2">
                          {teamStats.topErrors.slice(0, 5).map((error, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                              <span className="text-sm text-gray-700 truncate max-w-[80%]">{error.message}</span>
                              <span className="text-sm font-semibold text-red-600">{error.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-gray-400">No errors found</p>}
                    </div>
                  </div>

                  {teamStats.recentReports?.length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-4 mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Reports</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-left text-gray-600">
                              <th className="px-4 py-3 font-semibold">Filename</th>
                              <th className="px-4 py-3 font-semibold">Status</th>
                              <th className="px-4 py-3 font-semibold">Errors</th>
                              <th className="px-4 py-3 font-semibold">Result</th>
                              <th className="px-4 py-3 font-semibold">Analyzed By</th>
                              <th className="px-4 py-3 font-semibold">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamStats.recentReports.map((report) => (
                              <tr key={report._id} className="border-b border-gray-100 last:border-0">
                                <td className="px-4 py-3 text-gray-900 truncate max-w-[200px]">{report.filename}</td>
                                <td className="px-4 py-3">{report.status}</td>
                                <td className="px-4 py-3 text-gray-600">{report.errorCount}</td>
                                <td className="px-4 py-3">{report.result || '-'}</td>
                                <td className="px-4 py-3 text-gray-600">{report.analyzedBy}</td>
                                <td className="px-4 py-3 text-gray-500">{formatDate(report.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowStats(false);
                      setComparisonError('');
                      setComparisonData(null);
                      setComparisonPrimaryUserId('');
                      setComparisonSecondaryUserId('');
                      setAnalyticsRange('30');
                    }}
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
