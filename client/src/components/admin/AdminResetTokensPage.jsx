import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardDocumentIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import repo from '../../data/Repo';
import { notify } from '../../utils/feedback';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AdminResetTokensPage = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await repo.getResetTokens();
      setTokens(res.data || []);
    } catch {
      notify.error('Failed to load reset tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCopy = (token) => {
    navigator.clipboard.writeText(token);
    notify.success('Token copied to clipboard');
  };

  const handleRevoke = async (id) => {
    try {
      await notify.promise(
        repo.revokeResetToken(id),
        {
          loading: 'Revoking token...',
          success: 'Token revoked',
          error: 'Failed to revoke token',
        }
      );
      fetchTokens();
    } catch {
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Reset Requests</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Copy a token and share it with the user via Discord or another channel.
          </p>
        </div>
        <button
          onClick={fetchTokens}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Refresh"
        >
          <ArrowPathIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Loading...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">
            No pending reset requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expires</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{t.user_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded max-w-xs truncate block">
                          {t.token}
                        </code>
                        <button
                          onClick={() => handleCopy(t.token)}
                          className="shrink-0 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="Copy token"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(t.expires_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRevoke(t.id)}
                        className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Revoke token"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminResetTokensPage;
