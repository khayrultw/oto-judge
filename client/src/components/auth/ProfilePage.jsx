import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import repo from '../../data/Repo';

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-center">My Profile</h2>
        <div className="mb-4">
          <div className="text-gray-600 mb-1">User ID:</div>
          <div className="font-mono text-lg">{user.id}</div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600 mb-1">Name:</div>
          <div className="font-semibold text-lg">{user.name}</div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600 mb-1">Email:</div>
          <div className="font-mono text-lg">{user.email}</div>
        </div>
        <div className="mb-6">
          <div className="text-gray-600 mb-1">Role:</div>
          <div className="inline-block px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold text-sm">{user.role}</div>
        </div>
        {error && <div className="mb-4 text-red-500 text-center">{error}</div>}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition"
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage; 