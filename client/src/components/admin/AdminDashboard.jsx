import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  TrophyIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import repo from '../../data/Repo';
import { notify } from '../../utils/feedback';

const StatCard = ({ title, value, icon: Icon, color, loading, to }) => {
  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          {loading ? (
            <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
          ) : (
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          )}
        </div>
        <div className={`p-2 rounded-full ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
  
  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
};

const AdminDashboard = () => {
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await repo.getUserStats();
        setUserStats(res.data);
      } catch (error) {
        notify.error('Failed to load statistics');
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Manage users, contests, problems, and submissions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          title="Total Users"
          value={userStats?.total_users ?? 0}
          icon={UsersIcon}
          color="bg-blue-500"
          loading={loading}
          to="/admin/users"
        />
        <StatCard
          title="Total Admins"
          value={userStats?.total_admins ?? 0}
          icon={ShieldCheckIcon}
          color="bg-purple-500"
          loading={loading}
          to="/admin/users?filter=admin"
        />
        <StatCard
          title="Active Users"
          value={userStats?.active_users ?? 0}
          icon={ArrowTrendingUpIcon}
          color="bg-green-500"
          loading={loading}
          to="/admin/users"
        />
        <StatCard
          title="Deleted Users"
          value={userStats?.deleted_users ?? 0}
          icon={TrashIcon}
          color="bg-red-500"
          loading={loading}
          to="/admin/users?deleted=true"
        />
      </div>

      {/* Navigation Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Admin Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            to="/admin/users"
            className="text-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          >
            <UsersIcon className="h-10 w-10 mx-auto text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">User Management</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create, edit, and manage users</p>
          </Link>
          <Link 
            to="/contests"
            className="text-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          >
            <TrophyIcon className="h-10 w-10 mx-auto text-amber-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Contest Management</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage contests and problems</p>
          </Link>
          <Link 
            to="/admin/submissions"
            className="text-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
          >
            <ClipboardDocumentListIcon className="h-10 w-10 mx-auto text-green-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">All Submissions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View and rejudge submissions</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
