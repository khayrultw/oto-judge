import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../../contexts/UserContext';
import { notify } from '../../utils/feedback';
import { useConfirmDelete } from '../../components/common/ConfirmDelete';
import { useSSE } from '../../hooks/useSSE';
import { LANGUAGES, getLanguageLabel } from '../../utils/languages';
import StatusChip from '../common/StatusChip';
import SkeletonList from '../common/SkeletonList';
import ErrorState from '../common/ErrorState';
import Modal from '../common/Modal';
import CodeHighlight from '../common/CodeHighlight';
import repo, { BASE_URL, key } from '../../data/Repo';

function SubmissionsPage() {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    language: '',
    problem: '',
    timeRange: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | status
  const { user } = useUser();
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  // Helper to strip markdown formatting from logs
  const stripMarkdown = (text) => {
    if (!text) return '';
    return text
      .replace(/```[\w]*\n?/g, '') // Remove code block markers
      .replace(/`/g, '')            // Remove inline code markers
      .trim();
  };

  // Use SSE hook for live updates
  const q = localStorage.getItem(key);
  const { data, connected, error: sseError } = useSSE(
    `${BASE_URL}/submissions/sse/my?q=${q}`,
    { enabled: !!q }
  );

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await repo.getMySubmissions();
        // Handle paginated response
        const subs = res.data?.data || res.data || [];
        setSubmissions(Array.isArray(subs) ? subs : []);
      } catch (err) {
        console.error('Failed to load submissions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  // Update submissions from SSE
  useEffect(() => {
    if (data) {
      // SSE data should be an array, but be defensive
      let subs = [];
      if (Array.isArray(data)) {
        subs = data;
      } else if (Array.isArray(data?.data)) {
        subs = data.data;
      } else if (data?.data) {
        subs = [data.data];
      } else if (typeof data === 'object') {
        subs = [data];
      }
      setSubmissions(subs);
      setLoading(false);
    }
  }, [data]);

  // Get unique problems for filter
  const problems = useMemo(() => {
    const uniqueProblems = new Map();
    // Ensure submissions is always an array
    if (!Array.isArray(submissions)) {
      return [];
    }
    submissions.forEach((sub) => {
      if (sub && sub.problem_title && sub.problem_id) {
        uniqueProblems.set(sub.problem_id, sub.problem_title);
      }
    });
    return Array.from(uniqueProblems.entries()).map(([id, title]) => ({ id, title }));
  }, [submissions]);

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    // Ensure submissions is an array
    if (!Array.isArray(submissions)) {
      return [];
    }
    let filtered = [...submissions];

    // Apply filters
    if (filters.status) {
      filtered = filtered.filter((sub) => sub.status === filters.status);
    }
    if (filters.language) {
      filtered = filtered.filter((sub) => sub.language === filters.language);
    }
    if (filters.problem) {
      filtered = filtered.filter((sub) => sub.problem_id?.toString() === filters.problem);
    }
    if (filters.timeRange) {
      const now = new Date();
      const cutoff = new Date();
      switch (filters.timeRange) {
        case '1h':
          cutoff.setHours(now.getHours() - 1);
          break;
        case '24h':
          cutoff.setHours(now.getHours() - 24);
          break;
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
        default:
          break;
      }
      if (filters.timeRange) {
        filtered = filtered.filter((sub) => {
          const subTime = new Date(sub.created_at || sub.submitted_time);
          return subTime >= cutoff;
        });
      }
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.problem_title?.toLowerCase().includes(searchLower) ||
          sub.user_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at || a.submitted_time) - new Date(b.created_at || b.submitted_time);
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'newest':
        default:
          return new Date(b.created_at || b.submitted_time) - new Date(a.created_at || a.submitted_time);
      }
    });

    return filtered;
  }, [submissions, filters, sortBy]);

  const handleDetails = (submission) => {
    setSelectedSubmission(submission);
  };

  const handleCloseModal = () => {
    setSelectedSubmission(null);
  };

  const handleRejudge = async (submissionId) => {
    setActionLoading(true);
    try {
      await notify.promise(
        repo.rejudgeSubmission(submissionId),
        {
          loading: 'Rejudging...',
          success: 'Rejudge started.',
          error: 'Rejudge failed.',
        }
      );
      setSelectedSubmission(null);
    } catch (err) {
      // Error already shown via toast
    }
    setActionLoading(false);
  };

  const handleDelete = async (submissionId) => {
    await confirmDelete({
      entity: 'submission',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await notify.promise(
            repo.deleteSubmission(submissionId),
            {
              loading: 'Deleting...',
              success: 'Deleted.',
              error: 'Delete failed.',
            }
          );
          setSelectedSubmission(null);
        } catch (err) {
          // Error already shown via toast
        }
        setActionLoading(false);
      }
    });
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 text-xs">
      <ConfirmDeleteDialog />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">My Submissions</h1>
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
            Track your submission history and results
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs">
          {connected && (
            <span className="flex items-center px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              Live
            </span>
          )}
          {sseError && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
              Error
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">All</option>
              <option value="PASS">PASS</option>
              <option value="WA">WA</option>
              <option value="TLE">TLE</option>
              <option value="MLE">MLE</option>
              <option value="CE">CE</option>
              <option value="RE">RE</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">All</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Problem
            </label>
            <select
              value={filters.problem}
              onChange={(e) => setFilters({ ...filters, problem: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">All</option>
              {problems.map((prob) => (
                <option key={prob.id} value={prob.id}>
                  {prob.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Time
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">All</option>
              <option value="1h">1h</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Sort
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      {loading && <SkeletonList rows={5} />}
      {!loading && sseError && <ErrorState message="Failed to load submissions." onRetry={handleRetry} />}
      {!loading && !sseError && filteredSubmissions.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded text-xs">
          No submissions found.
        </div>
      )}
      {!loading && !sseError && filteredSubmissions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase">ID</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase">Problem</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase">Lang</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase">Time</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-600 dark:text-gray-300 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-2 py-2 text-xs text-gray-500 dark:text-gray-400">
                      #{submission.id}
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        {submission.problem_title}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {getLanguageLabel(submission.language)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <StatusChip status={submission.status} />
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(submission.created_at || submission.submitted_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDetails(submission)}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={!!selectedSubmission}
          onClose={handleCloseModal}
          title={`Submission #${selectedSubmission.id}`}
          size="xl"
          headerActions={
            user.role === 'admin' && (
              <>
                <button
                  onClick={() => handleRejudge(selectedSubmission.id)}
                  disabled={actionLoading}
                  className="px-2 py-1 text-[10px] bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? 'Processing...' : 'Rejudge'}
                </button>
                <button
                  onClick={() => handleDelete(selectedSubmission.id)}
                  disabled={actionLoading}
                  className="px-2 py-1 text-[10px] bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {actionLoading ? 'Processing...' : 'Delete'}
                </button>
              </>
            )
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-y-0.5 pb-1 border-b border-gray-200 dark:border-gray-700 text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
              <span className="mr-2"><StatusChip status={selectedSubmission.status} /></span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Language:</span>
              <span className="text-gray-900 dark:text-white mr-2">{getLanguageLabel(selectedSubmission.language)}</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Problem:</span>
              <span className="text-gray-900 dark:text-white mr-2 truncate max-w-xs">{selectedSubmission.problem_title}</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Submitted:</span>
              <span className="text-gray-900 dark:text-white text-[10px]">
                {new Date(selectedSubmission.created_at || selectedSubmission.submitted_time).toLocaleString()}
              </span>
            </div>

            {selectedSubmission.status !== 'PASS' && selectedSubmission.message && (
              <div>
                <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Logs</h3>
                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono text-xs">
                  {stripMarkdown(selectedSubmission.message)}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">Code</h3>
              <div className="text-[9px]">
                <CodeHighlight
                  code={selectedSubmission.code || selectedSubmission.source_code}
                  language={selectedSubmission.language}
                  filename={`submission_${selectedSubmission.id}.${selectedSubmission.language}`}
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SubmissionsPage;
