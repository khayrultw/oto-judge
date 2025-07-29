import { Link, useLocation } from 'react-router-dom';
import { UserIcon, HomeIcon, ClipboardDocumentIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';

function Sidebar() {
  const { user } = useUser();
  const isLoggedIn = !!user && !!user.role;
  const isAdmin = user?.role === 'admin';
  const location = useLocation();

  if (!isLoggedIn) return null;

  const isActive = (path) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '')) return true;
    return location.pathname === path;
  };

  const linkClass = (path) =>
    `flex items-center space-x-2 p-2 rounded hover:bg-gray-700 ${
      isActive(path) ? 'bg-gray-700 text-blue-400 font-semibold' : ''
    }`;

  return (
    <aside className="fixed top-0 left-0 h-screen bg-gray-800 text-white shadow-md 
                  flex flex-col items-center md:items-start 
                  w-12 md:w-64 p-0 md:p-4 space-y-2 md:space-y-4">
      
      <Link to="/" className={linkClass('/')}>
        <HomeIcon className="h-6 w-6" />
        <span className="hidden md:inline">Home</span>
      </Link>

      {isAdmin && (
        <Link to="/contests" className={linkClass('/contests')}>
          <PencilSquareIcon className="h-6 w-6" />
          <span className="hidden md:inline">Contests</span>
        </Link>
      )}

      <Link to="/submissions" className={linkClass('/submissions')}>
        <ClipboardDocumentIcon className="h-6 w-6" />
        <span className="hidden md:inline">Submissions</span>
      </Link>

      <Link to="/profile" className={linkClass('/profile')}>
        <UserIcon className="h-6 w-6" />
        <span className="hidden md:inline">Profile</span>
      </Link>
    </aside>
  );
}

export default Sidebar;
