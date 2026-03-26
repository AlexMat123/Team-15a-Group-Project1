import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  AlertTriangle,
  FileWarning,
  Type,
  Database,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTypes, setExpandedTypes] = useState({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [id]);

  useEffect(() => {
    setExpandedTypes({});
  }, [report?._id]);

  const fetchReport = async () => {
    try {
      const response = await api.get(`/reports/${id}`);
      setReport(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/reports/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const sanitised = report.filename.replace(/\.pdf$/i, '');
      link.setAttribute('download', `QC_Report_${sanitised}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Loader2, text: 'Processing' },
      analyzed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Analyzed' },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Failed' },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className={`w-4 h-4 mr-2 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {badge.text}
      </span>
    );
  };

  const getErrorIcon = (type) => {
    const icons = {
      placeholder: Type,
      consistency: AlertTriangle,
      compliance: FileWarning,
      formatting: FileText,
      missing_data: Database,
    };
    return icons[type] || AlertCircle;
  };

  const getErrorColor = (type) => {
    const colors = {
      placeholder: 'bg-orange-50 text-orange-800 border-orange-200',
      consistency: 'bg-blue-50 text-blue-800 border-blue-200',
      compliance: 'bg-red-50 text-red-800 border-red-200',
      formatting: 'bg-purple-50 text-purple-800 border-purple-200',
      missing_data: 'bg-green-50 text-green-800 border-green-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-800 border-gray-200';
  };

  const getSortedErrorsByType = (errors = []) => {
    const typeOrder = {
      placeholder: 0,
      consistency: 1,
      compliance: 2,
      formatting: 3,
      missing_data: 4,
    };

    return [...errors].sort((a, b) => {
      const orderA = typeOrder[a.type] ?? 99;
      const orderB = typeOrder[b.type] ?? 99;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return (a.message || '').localeCompare(b.message || '');
    });
  };

  const getErrorTypeLabel = (type) => {
    const labels = {
      placeholder: 'Placeholder',
      consistency: 'Consistency',
      compliance: 'Compliance',
      formatting: 'Formatting',
      missing_data: 'Missing Data',
    };

    return labels[type] || type?.replace('_', ' ') || 'Other';
  };

  const getGroupedErrorsByType = (errors = []) => {
    const grouped = {};

    getSortedErrorsByType(errors).forEach((err) => {
      const key = err?.type || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(err);
    });

    return grouped;
  };

  const toggleType = (type) => {
    setExpandedTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const setAllTypesExpanded = (errors = [], expanded = false) => {
    const nextState = {};
    Object.keys(getGroupedErrorsByType(errors)).forEach((type) => {
      nextState[type] = expanded;
    });
    setExpandedTypes(nextState);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Report</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <FileText className="w-12 h-12 text-red-500 mr-4" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{report.filename}</h1>
                <p className="text-gray-500">Uploaded on {formatDate(report.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(report.status)}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Report
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-lg font-semibold capitalize">{report.status}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Errors Found</p>
              <p className="text-lg font-semibold">{report.errorCount || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Pages</p>
              <p className="text-lg font-semibold">{report.metadata?.pageCount || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Time Saved</p>
              <p className="text-lg font-semibold">{report.timeSaved || 0} min</p>
            </div>
          </div>
        </div>

        {report.status === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-3" />
              <div>
                <h3 className="font-semibold text-blue-900">Analysis in Progress</h3>
                <p className="text-blue-700">Your report is being analyzed. This may take a moment.</p>
              </div>
            </div>
          </div>
        )}

        {report.status === 'analyzed' && (!report.errors || report.errors.length === 0) && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <h3 className="font-semibold text-green-900">No Errors Found</h3>
                <p className="text-green-700">Your document passed all checks successfully.</p>
              </div>
            </div>
          </div>
        )}

        {report.errorSummary && report.errorCount > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 my-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{report.errorSummary.placeholder || 0}</p>
                <p className="text-sm text-gray-600">Placeholder</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{report.errorSummary.consistency || 0}</p>
                <p className="text-sm text-gray-600">Consistency</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{report.errorSummary.compliance || 0}</p>
                <p className="text-sm text-gray-600">Compliance</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{report.errorSummary.formatting || 0}</p>
                <p className="text-sm text-gray-600">Formatting</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{report.errorSummary.missing_data || 0}</p>
                <p className="text-sm text-gray-600">Missing Data</p>
              </div>
            </div>
          </div>
        )}

        {report.status === 'analyzed' && report.errors && report.errors.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Errors Detected ({report.errors.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  const grouped = getGroupedErrorsByType(report.errors);
                  const hasCollapsed = Object.keys(grouped).some(
                    (type) => !(expandedTypes[type] ?? false)
                  );
                  setAllTypesExpanded(report.errors, hasCollapsed);
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                {Object.keys(getGroupedErrorsByType(report.errors)).some(
                  (type) => !(expandedTypes[type] ?? false)
                )
                  ? 'Expand all'
                  : 'Collapse all'}
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(getGroupedErrorsByType(report.errors)).map(([type, typeErrors]) => {
                const ErrorIcon = getErrorIcon(type);
                const isExpanded = expandedTypes[type] ?? false;
                const typeColorClass = getErrorColor(type);

                return (
                  <div key={type} className={`border rounded-lg overflow-hidden ${typeColorClass}`}>
                    <button
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`w-full px-4 py-3 transition-colors flex items-center justify-between ${typeColorClass} hover:brightness-95`}
                    >
                      <div className="flex items-center gap-3">
                        <ErrorIcon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{getErrorTypeLabel(type)}</span>
                        <span className="text-xs font-medium bg-white/80 px-2 py-0.5 rounded-full border border-white/70">
                          {typeErrors.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-4 space-y-3">
                        {typeErrors.map((err, index) => {
                          const ItemIcon = getErrorIcon(err.type);
                          return (
                            <div
                              key={err._id || `${type}-${index}`}
                              className="border rounded-lg p-4 bg-gray-50 text-gray-800 border-gray-200"
                            >
                              <div className="flex items-start">
                                <ItemIcon className="w-5 h-5 mr-3 mt-0.5" />
                                <div className="flex-1">
                                  <p>{err.message}</p>
                                  {err.location?.section && (
                                    <p className="text-sm mt-2 opacity-75">
                                      Location: {err.location.section}
                                      {err.location.page && ` - Page ${err.location.page}`}
                                    </p>
                                  )}
                                  {err.suggestion && (
                                    <p className="text-sm mt-2 italic">Suggestion: {err.suggestion}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ReportDetail;
