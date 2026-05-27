import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  HomeIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  TrophyIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../hooks/useTheme';
import repo from '../data/Repo';

function Sidebar({ open = false, onClose = () => {} }) {
  const { user, updateUser } = useUser();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isLoggedIn = !!user && !!user.role;
  const isAdmin = user?.role === 'admin';
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!isLoggedIn) return null;

  const handleLogout = async () => {
    try {
      await repo.logout();
      updateUser(null);
      onClose();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const isActive = (path) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '')) return true;
    if (path === '/') return false;
    // For admin routes, match exact or nested paths
    if (path.startsWith('/admin')) {
      if (path === '/admin') {
        return location.pathname === '/admin';
      }
      return location.pathname.startsWith(path);
    }
    return location.pathname.startsWith(path);
  };

  const linkClass = (path) =>
    `flex items-center py-2 rounded-xl transition-colors ${
      'justify-start gap-3 px-3'
    } ${
      isActive(path)
        ? 'bg-blue-500 dark:bg-blue-600 text-white font-semibold'
        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
    }`;

  const iconButtonClass = 'py-2 rounded-xl transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white justify-start gap-3 px-3';

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg
                    flex flex-col z-50 border-r border-gray-200 dark:border-gray-700 transition-transform duration-200
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >

      <nav className="flex-1 space-y-1 py-2">
        <button
          onClick={() => { navigate('/', { replace: true }); onClose(); }}
          className={linkClass('/')}
          title="Home"
        >
          <HomeIcon className="h-6 w-6 flex-shrink-0" />
          <span className="text-sm">Home</span>
        </button>

        <Link to="/submissions" className={linkClass('/submissions')} title="Submissions" onClick={onClose}>
          <ClipboardDocumentIcon className="h-6 w-6 flex-shrink-0" />
          <span className="text-sm">Submissions</span>
        </Link>

        <Link to="/guidelines" className={linkClass('/guidelines')} title="Guidelines" onClick={onClose}>
          <InformationCircleIcon className="h-6 w-6 flex-shrink-0" />
          <span className="text-sm">Guidelines</span>
        </Link>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            </div>
            
            <Link to="/admin" className={linkClass('/admin')} title="Admin Dashboard" onClick={onClose}>
              <Cog6ToothIcon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm">Dashboard</span>
            </Link>

            <Link to="/admin/users" className={linkClass('/admin/users')} title="Manage Users" onClick={onClose}>
              <UsersIcon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm">Users</span>
            </Link>

            <Link to="/contests" className={linkClass('/contests')} title="Contests" onClick={onClose}>
              <TrophyIcon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm">Contests</span>
            </Link>

            <Link to="/admin/submissions" className={linkClass('/admin/submissions')} title="All Submissions" onClick={onClose}>
              <ClipboardDocumentListIcon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm">All Submissions</span>
            </Link>

            <Link to="/admin/trash" className={linkClass('/admin/trash')} title="Trash" onClick={onClose}>
              <TrashIcon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm">Trash</span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-700 space-y-1 py-2">
        <button
          onClick={toggleTheme}
          className={`${iconButtonClass} w-full flex items-center hover:bg-gray-200 dark:hover:bg-gray-700`}
          title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {resolvedTheme === 'dark' ? (
            <SunIcon className="h-6 w-6 flex-shrink-0" />
          ) : (
            <MoonIcon className="h-6 w-6 flex-shrink-0" />
          )}
          <span className="text-sm">Theme</span>
        </button>

        <button
          onClick={handleLogout}
          className={`${iconButtonClass} w-full flex items-center text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300`}
          title="Logout"
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6 flex-shrink-0" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
      </aside>
    </>
  );
}

export default Sidebar;
