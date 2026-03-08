import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import repo, { BASE_URL, key } from '../../data/Repo';
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

function ContestSubmissions() {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualJudgeOpen, setManualJudgeOpen] = useState(false);
  const [manualJudgeForm, setManualJudgeForm] = useState({ status: 'PASS', message: '' });
  const [filters, setFilters] = useState({
    status: '',
    language: '',
    problem: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState('newest');
  const { contestId } = useParams();
  const navigate = useNavigate();
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
    `${BASE_URL}/contests/${contestId}/sse?q=${q}`,
    { enabled: !!q && !!contestId }
  );

    useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await repo.getContestSubmissions(contestId);
        // Handle paginated response
        const subs = res.data?.data || res.data || [];
        setSubmissions(Array.isArray(subs) ? subs : []);
      } catch (err) {
        // If 403, redirect to my submissions (non-admin during contest)
        if (err.response && err.response.status === 403) {
          navigate(`/contest/${contestId}/submissions/my`, { replace: true });
          return;
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [contestId, navigate]);

  // Update submissions from SSE
  useEffect(() => {
    if (data) {
      // SSE data should be an array, but be defensive
      const subs = data?.data || data || [];
      setSubmissions(Array.isArray(subs) ? subs : []);
      setLoading(false);
    }
  }, [data]);

  // Get unique problems for filter
  const problems = useMemo(() => {
    const uniqueProblems = new Map();
    // Ensure submissions is an array
    const subs = Array.isArray(submissions) ? submissions : [];
    subs.forEach((sub) => {
      if (sub.problem_title && sub.problem_id) {
        uniqueProblems.set(sub.problem_id, sub.problem_title);
      }
    });
    return Array.from(uniqueProblems.entries()).map(([id, title]) => ({ id, title }));
  }, [submissions]);

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    // Ensure submissions is an array
    const subs = Array.isArray(submissions) ? submissions : [];
    let filtered = [...subs];

    if (filters.status) {
      filtered = filtered.filter((sub) => sub.status === filters.status);
    }
    if (filters.language) {
      filtered = filtered.filter((sub) => sub.language === filters.language);
    }
    if (filters.problem) {
      filtered = filtered.filter((sub) => sub.problem_id?.toString() === filters.problem);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.problem_title?.toLowerCase().includes(searchLower) ||
          sub.user_name?.toLowerCase().includes(searchLower)
      );
    }

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

  const openManualJudge = (submission) => {
    setSelectedSubmission(submission);
    setManualJudgeForm({ status: 'PASS', message: '' });
    setManualJudgeOpen(true);
  };

  const handleManualJudgeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setActionLoading(true);
    try {
      await notify.promise(
        repo.manualJudgeSubmission(selectedSubmission.id, {
          status: manualJudgeForm.status,
          message: manualJudgeForm.message,
        }),
        {
          loading: 'Saving manual judgment...',
          success: 'Submission updated',
          error: 'Failed to update submission',
        }
      );
      setManualJudgeOpen(false);
      setSelectedSubmission(null);
    } catch (err) {
      // Error already shown via toast
    }
    setActionLoading(false);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="p-3 max-w-5xl mx-auto text-xs">
      <ConfirmDeleteDialog />
      
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Contest Submissions</h1>

          <div className="flex flex-row space-x-1.5">
            <button 
              className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
              onClick={() => navigate(`/contest/${id}/submissions/my`)}
            >
              My Submissions
            </button>
            <button
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
              onClick={() => navigate(`/standings/${id}`)}
            >
              Standings
            </button>
            <button
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
              onClick={() => navigate(`/viewcontest/${contestId}`)}
            >
              Problems
            </button>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs">
          {connected && (
            <span className="flex items-center text-green-600 dark:text-green-400">
              <span className="inline-block w-1.5 h-1.5 bg-green-600 dark:bg-green-400 rounded-full mr-1.5"></span>
              Live
            </span>
          )}
          {sseError && (
            <span className="text-red-600 dark:text-red-400">Error</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-3 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
            >
              <option value="">All</option>
              <option value="PASS">PASS</option>
              <option value="WA">WA</option>
              <option value="TLE">TLE</option>
              <option value="MLE">MLE</option>
              <option value="CE">CE</option>
              <option value="RE">RE</option>
              <option value="PENDING">PENDING</option>
              <option value="PENDING_CODE_REVIEW">Review</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Language
            </label>
            <select
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
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
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
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
              Sort
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
            Search
          </label>
          <input
            type="text"
            placeholder="Search by problem or user..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
          />
        </div>
      </div>

      {/* Submissions List */}
      {loading && <SkeletonList rows={5} />}
      {!loading && sseError && <ErrorState message="Failed to load submissions." onRetry={handleRetry} />}
      {!loading && !sseError && filteredSubmissions.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs">
          No submissions found.
        </div>
      )}
      {!loading && !sseError && filteredSubmissions.length > 0 && (
        <div className="space-y-2">
          {filteredSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="bg-white dark:bg-gray-800 rounded shadow-sm p-2.5 hover:shadow transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-500 dark:text-gray-400 text-xs">#{submission.id}</span>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                      {submission.problem_title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>{submission.user_name}</span>
                    <span>•</span>
                    <span>{getLanguageLabel(submission.language)}</span>
                    <span>•</span>
                    <span>{new Date(submission.created_at || submission.submitted_time).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-28">
                    <StatusChip status={submission.status} />
                  </div>
                  <button
                    onClick={() => handleDetails(submission)}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                  onClick={() => openManualJudge(selectedSubmission)}
                  disabled={actionLoading}
                  className="px-2 py-1 text-[10px] bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Manual Judge
                </button>
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
              <span className="font-medium text-gray-700 dark:text-gray-300">User:</span>
              <span className="text-gray-900 dark:text-white mr-2">{selectedSubmission.user_name}</span>
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

      {manualJudgeOpen && selectedSubmission && (
        <Modal
          isOpen={manualJudgeOpen}
          onClose={() => setManualJudgeOpen(false)}
          title={`Manual Judge #${selectedSubmission.id}`}
          size="md"
        >
          <form onSubmit={handleManualJudgeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={manualJudgeForm.status}
                onChange={(e) => setManualJudgeForm((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {['PASS', 'FAIL', 'WA', 'TLE', 'MLE', 'CE', 'RE', 'RTE'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message (optional)</label>
              <textarea
                value={manualJudgeForm.message}
                onChange={(e) => setManualJudgeForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add feedback for the participant"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setManualJudgeOpen(false)}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-400"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default ContestSubmissions;
