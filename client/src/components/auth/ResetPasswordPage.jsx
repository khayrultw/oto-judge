import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import repo from '../../data/Repo';

const ResetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await repo.resetPassword({ token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg === 'invalid_or_expired_token') {
        setError('Token is invalid or has expired. Please request a new one.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-xs w-full">
        <h2 className="text-lg font-bold mb-4 text-center text-gray-900 dark:text-white">Reset Password</h2>

        {success ? (
          <div className="text-center">
            <p className="text-sm text-green-600 dark:text-green-400 mb-3">
              Password reset successfully! Redirecting to login...
            </p>
            <Link to="/login" className="text-xs text-blue-500 dark:text-blue-400 hover:underline">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white" htmlFor="token">
                Reset Token
              </label>
              <input
                type="text"
                id="token"
                className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono focus:ring focus:ring-blue-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the token from your admin"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white" htmlFor="newPassword">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring focus:ring-blue-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={5}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring focus:ring-blue-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="mb-3 text-red-500 dark:text-red-400 text-center text-xs">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 text-white py-1.5 rounded text-sm hover:bg-blue-600 transition disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <p className="mt-3 text-center text-xs text-gray-900 dark:text-white">
              <Link to="/forgot-password" className="text-blue-500 dark:text-blue-400 hover:underline">
                Request a new token
              </Link>
              {' · '}
              <Link to="/login" className="text-blue-500 dark:text-blue-400 hover:underline">
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
