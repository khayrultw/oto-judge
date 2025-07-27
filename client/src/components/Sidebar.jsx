import { Link, useLocation } from 'react-router-dom';
import { UserIcon } from '@heroicons/react/24/outline';
import { useUser } from '../contexts/UserContext';

function Navbar() {
  const { user } = useUser();
  const isLoggedIn = !!user && !!user.role;
  const isAdmin = user.role === 'admin';
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const linkClass = (path) =>
    `flex items-center space-x-1 md:space-x-2 hover:text-blue-300 ${
      isActive(path) ? 'text-blue-400 font-semibold' : ''
    }`;

  return (
    <nav className="w-full bg-gray-800 text-white flex flex-row items-center px-4 md:px-6 py-3 shadow-md fixed top-0 left-0 z-50">
      <div className="flex flex-row items-center flex-1 space-x-2 md:space-x-6 text-xs md:text-sm">
        {isLoggedIn && (
          <Link to="/" className={linkClass('/')}>
            <span>Home</span>
          </Link>
        )}
        {isLoggedIn && isAdmin && (
          <Link to="/contests" className={linkClass('/contests')}>
            <span>Contests</span>
          </Link>
        )}
        {isLoggedIn && (
          <Link to="/submissions" className={linkClass('/submissions')}>
            <span>Submissions</span>
          </Link>
        )}
      </div>

      {isLoggedIn && (
        <div className="flex items-center">
          <Link to="/profile" className={linkClass('/profile')}>
            <UserIcon className="h-6 w-6" />
          </Link>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
