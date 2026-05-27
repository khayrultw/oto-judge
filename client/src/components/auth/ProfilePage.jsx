import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import repo from '../../data/Repo';

const ChangePasswordForm = () => {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await repo.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.error;
      if (msg === 'incorrect_current_password') {
        setError('Current password is incorrect.');
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        onClick={() => { setOpen(!open); setError(''); setSuccess(''); }}
        className="text-sm text-blue-500 dark:text-blue-400 hover:underline"
      >
        {open ? 'Cancel' : 'Change Password'}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white">Current Password</label>
            <input
              type="password"
              className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white">New Password</label>
            <input
              type="password"
              className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={5}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white">Confirm New Password</label>
            <input
              type="password"
              className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 dark:text-red-400 text-xs">{error}</p>}
          {success && <p className="text-green-600 dark:text-green-400 text-xs">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-1.5 rounded text-sm hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const { user, clearUser } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setLoading(true);
    setError('');
    try {
      await repo.logout();
      clearUser();
      navigate('/login');
    } catch (err) {
      setError('Logout failed.');
    }
    setLoading(false);
  };

  if (!user || !user.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md max-w-sm w-full">
        <h2 className="text-lg font-bold mb-4 text-center text-gray-900 dark:text-white">My Profile</h2>
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">User ID:</div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">{user.id}</div>
        </div>
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Name:</div>
          <div className="font-semibold text-sm text-gray-900 dark:text-white">{user.name}</div>
        </div>
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Email:</div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">{user.email}</div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Role:</div>
          <div className="inline-block px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-xs">{user.role}</div>
        </div>
        {error && <div className="mb-3 text-red-500 dark:text-red-400 text-center text-xs">{error}</div>}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-1.5 rounded text-sm hover:bg-red-600 transition"
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Logout'}
        </button>
        <ChangePasswordForm />
      </div>
    </div>
  );
};

export default ProfilePage; 