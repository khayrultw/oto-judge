import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowPathIcon,
  TrashIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import repo from '../../data/Repo';
import { notify } from '../../utils/feedback';
import { ConfirmDelete } from '../common/ConfirmDelete';

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

const AdminTrashPage = () => {
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deletedSubmissions, setDeletedSubmissions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [userSortField, setUserSortField] = useState(null); // null | 'name' | 'progress'
  const [userSortDir, setUserSortDir] = useState('asc');

  // Permanent-delete confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type: 'user'|'submission', item }

  const fetchDeletedUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await repo.getUsers({ deleted_only: true, page_size: 200 });
      setDeletedUsers(res.data.users || []);
    } catch {
      notify.error('Failed to load deleted users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchDeletedSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await repo.getAdminSubmissions({ deleted_only: true, page_size: 200 });
      setDeletedSubmissions(res.data.submissions || []);
    } catch {
      notify.error('Failed to load deleted submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    fetchDeletedUsers();
    fetchDeletedSubmissions();
  }, [fetchDeletedUsers, fetchDeletedSubmissions]);

  const handleRestoreUser = async (user) => {
    try {
      await notify.promise(repo.restoreUser(user.id), {
        loading: 'Restoring user…',
        success: 'User restored',
        error: 'Failed to restore user',
      });
      fetchDeletedUsers();
    } catch {
      // error already shown by notify.promise
    }
  };

  const handleRestoreSubmission = async (sub) => {
    try {
      await notify.promise(repo.restoreSubmission(sub.id), {
        loading: 'Restoring submission…',
        success: 'Submission restored',
        error: 'Failed to restore submission',
      });
      fetchDeletedSubmissions();
    } catch {
      // error already shown by notify.promise
    }
  };

  const openPermanentDeleteConfirm = (type, item) => {
    setConfirmTarget({ type, item });
    setConfirmOpen(true);
  };

  const handlePermanentDelete = async () => {
    if (!confirmTarget) return;
    const { type, item } = confirmTarget;
    if (type === 'user') {
      await repo.permanentDeleteUser(item.id);
      fetchDeletedUsers();
    } else {
      await repo.permanentDeleteSubmission(item.id);
      fetchDeletedSubmissions();
    }
  };

  const handleUserSort = (field) => {
    if (userSortField === field) {
      setUserSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortDir('asc');
    }
  };

  const sortedDeletedUsers = useMemo(() => {
    if (!userSortField) return deletedUsers;
    return [...deletedUsers].sort((a, b) => {
      let aVal, bVal;
      if (userSortField === 'name') {
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
      } else {
        aVal = a.solved_count ?? 0;
        bVal = b.solved_count ?? 0;
      }
      if (aVal < bVal) return userSortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return userSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [deletedUsers, userSortField, userSortDir]);

  const tabClass = (tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrashIcon className="h-6 w-6 text-red-500" />
          Trash
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Restore or permanently remove deleted users and submissions.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="flex gap-2">
          <button className={tabClass('users')} onClick={() => setActiveTab('users')}>
            Users ({deletedUsers.length})
          </button>
          <button className={tabClass('submissions')} onClick={() => setActiveTab('submissions')}>
            Submissions ({deletedSubmissions.length})
          </button>
        </nav>
      </div>

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loadingUsers ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              <p className="text-gray-500 dark:text-gray-400 mt-2">Loading…</p>
            </div>
          ) : deletedUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <UserIcon className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              No deleted users.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleUserSort('name')}
                    >
                      <span className="inline-flex items-center gap-1">
                        User
                        {userSortField === 'name' ? (
                          userSortDir === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        ) : <span className="text-gray-300 dark:text-gray-600">⇅</span>}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => handleUserSort('progress')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Progress
                        {userSortField === 'progress' ? (
                          userSortDir === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />
                        ) : <span className="text-gray-300 dark:text-gray-600">⇅</span>}
                      </span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deleted At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDeletedUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${user.is_admin ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            {user.is_admin
                              ? <ShieldCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              : <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_admin
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {user.solved_count ?? 0} / {user.total_problems ?? 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">{formatDate(user.deleted_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestoreUser(user)}
                            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openPermanentDeleteConfirm('user', user)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Permanently Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loadingSubmissions ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              <p className="text-gray-500 dark:text-gray-400 mt-2">Loading…</p>
            </div>
          ) : deletedSubmissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              No deleted submissions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Problem</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deleted At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedSubmissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">#{sub.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{sub.user_name || sub.user_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{sub.problem_title || sub.problem_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          sub.status === 'PASS' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                          sub.status === 'FAIL' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">{formatDate(sub.deleted_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestoreSubmission(sub)}
                            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openPermanentDeleteConfirm('submission', sub)}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Permanently Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Permanent delete confirm */}
      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={(v) => { setConfirmOpen(v); if (!v) setConfirmTarget(null); }}
        onConfirm={handlePermanentDelete}
        title="Permanently Delete"
        description={
          confirmTarget?.type === 'user'
            ? `Permanently delete user "${confirmTarget.item.name}"? This cannot be undone.`
            : `Permanently delete submission #${confirmTarget?.item?.id}? This cannot be undone.`
        }
      />
    </div>
  );
};

export default AdminTrashPage;
