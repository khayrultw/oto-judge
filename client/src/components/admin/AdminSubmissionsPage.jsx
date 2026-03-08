import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon,
  CodeBracketIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import repo from '../../data/Repo';
import { notify } from '../../utils/feedback';
import { ConfirmDelete } from '../common/ConfirmDelete';
import Modal from '../common/Modal';
import StatusChip from '../common/StatusChip';
import { LANGUAGES, getLanguageLabel } from '../../utils/languages';
import CodeHighlight from '../common/CodeHighlight';

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Submission Row Component
const SubmissionRow = ({ submission, onDelete, onRejudge, onViewCode, onManualJudge }) => (
  <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
      #{submission.id}
    </td>
    <td className="px-4 py-3">
      <div>
        <p className="font-medium text-gray-900 dark:text-white text-sm">{submission.user_name || `User #${submission.user_id}`}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {submission.user_id}</p>
      </div>
    </td>
    <td className="px-4 py-3">
      <Link
        to={`/problem/${submission.problem_id}`}
        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
      >
        {submission.problem_title || `Problem #${submission.problem_id}`}
      </Link>
    </td>
    <td className="px-4 py-3">
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
        {getLanguageLabel(submission.language)}
      </span>
    </td>
    <td className="px-4 py-3">
      <StatusChip status={submission.status} />
    </td>
    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
      {formatDate(submission.created_at)}
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onViewCode(submission)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="View Code"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onRejudge(submission)}
          className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          title="Rejudge"
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onManualJudge(submission)}
          className="p-2 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
          title="Manual Judge"
        >
          <CheckCircleIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(submission)}
          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </td>
  </tr>
);

const AdminSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    contest_id: '',
    user_id: '',
    status: '',
    language: '',
    start_date: '',
    end_date: '',
  });

  // Modal states
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [manualJudgeOpen, setManualJudgeOpen] = useState(false);
  const [manualJudgeTarget, setManualJudgeTarget] = useState(null);
  const [manualJudgeForm, setManualJudgeForm] = useState({ status: 'PASS', message: '' });

  // Delete/Rejudge confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState(null);

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      };
      const res = await repo.getAdminSubmissions(params);
      setSubmissions(res.data.submissions || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      notify.error('Failed to load submissions');
      console.error('Error fetching submissions:', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Filter handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      contest_id: '',
      user_id: '',
      status: '',
      language: '',
      start_date: '',
      end_date: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Action handlers
  const handleRejudge = async (submission) => {
    try {
      await notify.promise(
        repo.rejudgeSubmission(submission.id),
        {
          loading: 'Rejudging submission...',
          success: 'Rejudge initiated',
          error: 'Failed to rejudge',
        }
      );
      fetchSubmissions();
    } catch (error) {
      console.error('Error rejudging:', error);
    }
  };

  const handleDeleteSubmission = async () => {
    try {
      await repo.deleteSubmission(submissionToDelete.id);
      notify.success('Submission deleted');
      fetchSubmissions();
    } catch (error) {
      notify.error('Failed to delete submission');
      throw error;
    }
  };

  const openDeleteConfirm = (submission) => {
    setSubmissionToDelete(submission);
    setDeleteConfirmOpen(true);
  };

  const openCodeModal = (submission) => {
    setViewingSubmission(submission);
    setShowCodeModal(true);
  };

  const openManualJudgeModal = (submission) => {
    setManualJudgeTarget(submission);
    setManualJudgeForm({ status: 'PASS', message: '' });
    setManualJudgeOpen(true);
  };

  const handleManualJudgeSubmit = async (e) => {
    e.preventDefault();
    if (!manualJudgeTarget) return;
    try {
      await notify.promise(
        repo.manualJudgeSubmission(manualJudgeTarget.id, {
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
      setManualJudgeTarget(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error manual judging:', error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  // Status options for filter
  const statusOptions = ['pending', 'PENDING_CODE_REVIEW', 'PASS', 'FAIL', 'CE', 'TLE', 'RTE', 'MLE'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Submissions</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            View and manage all submissions in the system
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            hasActiveFilters 
              ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <FunnelIcon className="h-5 w-5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {Object.values(filters).filter(v => v !== '').length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Filter Submissions</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Contest ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contest ID
              </label>
              <input
                type="number"
                name="contest_id"
                value={filters.contest_id}
                onChange={handleFilterChange}
                placeholder="e.g., 1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* User ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                User ID
              </label>
              <input
                type="number"
                name="user_id"
                value={filters.user_id}
                onChange={handleFilterChange}
                placeholder="e.g., 123"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                name="language"
                value={filters.language}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Languages</option>
                {LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={filters.start_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={filters.end_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-8 text-center">
            <CodeBracketIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No submissions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Problem
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <SubmissionRow
                      key={submission.id}
                      submission={submission}
                      onDelete={openDeleteConfirm}
                      onRejudge={handleRejudge}
                      onViewCode={openCodeModal}
                      onManualJudge={openManualJudgeModal}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} submissions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Code Modal */}
      <Modal
        isOpen={showCodeModal}
        onClose={() => {
          setShowCodeModal(false);
          setViewingSubmission(null);
        }}
        title={`Submission #${viewingSubmission?.id}`}
        size="xl"
      >
        {viewingSubmission && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">User</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {viewingSubmission.user_name || `User #${viewingSubmission.user_id}`}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Problem</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {viewingSubmission.problem_title || `Problem #${viewingSubmission.problem_id}`}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Language</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {getLanguageLabel(viewingSubmission.language)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Status</p>
                <StatusChip status={viewingSubmission.status} />
              </div>
            </div>

            {viewingSubmission.message && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Message:</span> {viewingSubmission.message}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Code</p>
              <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600">
                {viewingSubmission.source_code && viewingSubmission.source_code !== 'Not Available' ? (
                  <CodeHighlight
                    code={viewingSubmission.source_code}
                    language={viewingSubmission.language}
                  />
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Source code not available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Judge Modal */}
      <Modal
        isOpen={manualJudgeOpen}
        onClose={() => {
          setManualJudgeOpen(false);
          setManualJudgeTarget(null);
        }}
        title={manualJudgeTarget ? `Manual Judge #${manualJudgeTarget.id}` : 'Manual Judge'}
        size="md"
      >
        <form onSubmit={handleManualJudgeSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={manualJudgeForm.status}
              onChange={(e) => setManualJudgeForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Add feedback for the participant"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setManualJudgeOpen(false);
                setManualJudgeTarget(null);
              }}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDelete
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteSubmission}
        entity="submission"
        title={`Delete Submission #${submissionToDelete?.id}?`}
        description="This will permanently delete the submission."
      />
    </div>
  );
};

export default AdminSubmissionsPage;
