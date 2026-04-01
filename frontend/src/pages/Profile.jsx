import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [expandedReports, setExpandedReports] = useState({});

  useEffect(() => {
    const fetchProfileAnalytics = async () => {
      try {
        const response = await api.get('/reports/profile-analytics');
        setAnalytics(response.data);
      } catch (error) {
        setAnalyticsError(
          error.response?.data?.message || 'Failed to load profile analytics'
        );
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchProfileAnalytics();
  }, []);

  const handleRequestPasswordReset = async () => {
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await api.post('/password-reset-requests');
      setSuccessMessage(response.data.message);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || 'Failed to submit password reset request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const summaryCards = analytics
    ? [
        {
          label: 'Total Reports',
          value: analytics.summary?.totalReports ?? 0,
          icon: FileText,
        },
        {
          label: 'Analyzed Reports',
          value: analytics.summary?.analyzedReports ?? 0,
          icon: CheckCircle,
        },
        {
          label: 'Total Errors',
          value: analytics.summary?.totalErrors ?? 0,
          icon: AlertCircle,
        },
        {
          label: 'Average Errors',
          value: analytics.summary?.averageErrorsPerReport ?? 0,
          icon: BarChart3,
        },
        {
          label: 'Time Saved',
          value: `${analytics.summary?.totalTimeSaved ?? 0} min`,
          icon: Clock,
        },
      ]
    : [];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      analyzed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          badges[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  const getQualityBadge = (report) => {
    if (report.status !== 'analyzed') {
      return <span className="text-sm text-gray-400">Pending</span>;
    }

    const badges = {
      good: { text: 'Passed', color: 'bg-green-100 text-green-800' },
      bad: { text: 'Failed', color: 'bg-red-100 text-red-800' },
      uncertain: { text: 'Uncertain', color: 'bg-amber-100 text-amber-800' },
    };

    const badge = badges[report.qualityLabel] || {
      text: 'Uncertain',
      color: 'bg-gray-100 text-gray-700',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const toggleReport = (reportId) => {
    setExpandedReports((current) => ({
      ...current,
      [reportId]: !current[reportId],
    }));
  };

  const errorSummaryCards = [
    {
      key: 'placeholder',
      label: 'Placeholder',
      valueClass: 'text-orange-600',
      cardClass: 'bg-orange-50',
    },
    {
      key: 'consistency',
      label: 'Consistency',
      valueClass: 'text-blue-600',
      cardClass: 'bg-blue-50',
    },
    {
      key: 'compliance',
      label: 'Compliance',
      valueClass: 'text-red-600',
      cardClass: 'bg-red-50',
    },
    {
      key: 'formatting',
      label: 'Formatting',
      valueClass: 'text-purple-600',
      cardClass: 'bg-purple-50',
    },
    {
      key: 'missing_data',
      label: 'Missing Data',
      valueClass: 'text-green-600',
      cardClass: 'bg-green-50',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your account settings and review analytics from your uploaded reports.
          </p>

          <div className="mt-6 space-y-2 text-sm text-gray-700">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role}</p>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={handleRequestPasswordReset}
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Request Password Reset'}
            </button>
          </div>

          {successMessage && <p className="mt-4 text-sm text-green-600">{successMessage}</p>}
          {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-6 mt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Report Analytics</h2>
              <p className="text-gray-600 mt-1">
                A summary of your previously uploaded reports.
              </p>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="py-10 flex items-center justify-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-3 text-indigo-600" />
              Loading analytics...
            </div>
          ) : analyticsError ? (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {analyticsError}
            </div>
          ) : analytics?.summary?.totalReports === 0 ? (
            <div className="mt-6 border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No analytics yet</h3>
              <p className="text-gray-600 mt-2">
                Upload your first report to start building analytics on this page.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {summaryCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div key={card.label} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">{card.label}</p>
                        <Icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-3">{card.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Failed Reports</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">
                    {analytics.summary?.failedReports ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Passed Reviews</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">
                    {analytics.qualityBreakdown?.good ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
                    <p className="text-sm text-gray-500">
                      Your most recently uploaded reports.
                    </p>
                  </div>
                  <Link
                    to="/dashboard"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View all
                  </Link>
                </div>

                {analytics.recentReports?.length ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Report
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Errors
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Result
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analytics.recentReports.map((report) => {
                          const isExpanded = expandedReports[report._id] ?? false;

                          return (
                            <Fragment key={report._id}>
                              <tr className="hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                  <button
                                    type="button"
                                    onClick={() => toggleReport(report._id)}
                                    className="inline-flex items-center text-left hover:text-indigo-700"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 mr-2 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 mr-2 text-gray-500" />
                                    )}
                                    <span>{report.filename}</span>
                                  </button>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {getStatusBadge(report.status)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  {report.status === 'analyzed' ? (
                                    <span
                                      className={`font-medium ${
                                        report.errorCount > 0 ? 'text-red-600' : 'text-green-600'
                                      }`}
                                    >
                                      {report.errorCount} {report.errorCount === 1 ? 'error' : 'errors'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {getQualityBadge(report)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDate(report.createdAt)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <Link
                                    to={`/report/${report._id}`}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    View
                                  </Link>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-gray-50">
                                  <td colSpan="6" className="px-4 py-5">
                                    <div className="rounded-xl bg-white border border-gray-200 p-4">
                                      <h4 className="text-lg font-semibold text-gray-900">
                                        Error Summary
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">
                                        {errorSummaryCards.map((card) => (
                                          <div
                                            key={card.key}
                                            className={`rounded-xl px-4 py-4 text-center ${card.cardClass}`}
                                          >
                                            <p className={`text-2xl font-bold ${card.valueClass}`}>
                                              {report.errorSummary?.[card.key] ?? 0}
                                            </p>
                                            <p className="text-sm text-gray-700 mt-1">{card.label}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                    No recent reports to display.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
