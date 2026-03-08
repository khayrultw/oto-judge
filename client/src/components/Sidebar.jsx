import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  UserIcon,
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
} from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../hooks/useTheme';
import repo from '../data/Repo';

function Sidebar() {
  const { user, updateUser } = useUser();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isLoggedIn = !!user && !!user.role;
  const isAdmin = user?.role === 'admin';
  const location = useLocation();

  if (!isLoggedIn) return null;

  const handleLogout = async () => {
    try {
      await repo.logout();
      updateUser(null);
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
    `flex items-center justify-center py-1.5 rounded transition-colors ${
      isActive(path)
        ? 'bg-blue-500 dark:bg-blue-600 text-white font-semibold'
        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
    }`;

  const iconButtonClass = 'py-1.5 rounded transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white';

  return (
    <aside className="fixed top-0 left-0 h-screen bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg 
                  flex flex-col 
                  w-10 z-40 border-r border-gray-200 dark:border-gray-700">

      <nav className="flex-1 space-y-1 py-2">
        <Link to="/" className={linkClass('/')} title="Home">
          <HomeIcon className="h-5 w-5 flex-shrink-0" />
        </Link>

        <Link to="/submissions" className={linkClass('/submissions')} title="Submissions">
          <ClipboardDocumentIcon className="h-5 w-5 flex-shrink-0" />
        </Link>

        <Link to="/guidelines" className={linkClass('/guidelines')} title="Guidelines">
          <InformationCircleIcon className="h-5 w-5 flex-shrink-0" />
        </Link>

        <Link to="/profile" className={linkClass('/profile')} title="Profile">
          <UserIcon className="h-5 w-5 flex-shrink-0" />
        </Link>

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
            </div>
            
            <Link to="/admin" className={linkClass('/admin')} title="Admin Dashboard">
              <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
            </Link>

            <Link to="/admin/users" className={linkClass('/admin/users')} title="Manage Users">
              <UsersIcon className="h-5 w-5 flex-shrink-0" />
            </Link>

            <Link to="/contests" className={linkClass('/contests')} title="Contests">
              <TrophyIcon className="h-5 w-5 flex-shrink-0" />
            </Link>

            <Link to="/admin/submissions" className={linkClass('/admin/submissions')} title="All Submissions">
              <ClipboardDocumentListIcon className="h-5 w-5 flex-shrink-0" />
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-700 space-y-1 py-2">
        <button
          onClick={toggleTheme}
          className={`${iconButtonClass} w-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700`}
          title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {resolvedTheme === 'dark' ? (
            <SunIcon className="h-5 w-5 flex-shrink-0" />
          ) : (
            <MoonIcon className="h-5 w-5 flex-shrink-0" />
          )}
        </button>

        <button
          onClick={handleLogout}
          className={`${iconButtonClass} w-full flex items-center justify-center text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300`}
          title="Logout"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
