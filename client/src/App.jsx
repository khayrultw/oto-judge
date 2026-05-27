import { BrowserRouter as Router, Route, Routes, Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Bars3Icon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import HomePage from './components/home/HomePage';
import ProblemDetailsPage from './components/contests/ProblemDetailsPage';
import SubmissionsPage from './components/submissions/SubmissionsPage';
import StandingsPage from './components/standings/StandingsPage';
import ContestsPage from './components/contests/ContestsPage';
import ContestDetailsPage from './components/contests/ContestDetailsPage';
import ViewContest from './components/contests/ViewContest';
import LoginPage from './components/auth/LoginPage';
import RegistrationPage from './components/auth/RegistrationPage';
import ProfilePage from './components/auth/ProfilePage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import { UserProvider, useUser } from "./contexts/UserContext";
import repo from './data/Repo';
import ContestSubmissions from './components/contests/ContestSubmissions';
import MyContestSubmissions from './components/contests/MyContestSubmissions';
import GuidelinePage from './components/Guideline';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsersPage from './components/admin/AdminUsersPage';
import AdminSubmissionsPage from './components/admin/AdminSubmissionsPage';
import AdminResetTokensPage from './components/admin/AdminResetTokensPage';
import AdminTrashPage from './components/admin/AdminTrashPage';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// ProtectedRoute component using context
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, updateUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // If user is already loaded and has required role, skip API call
      if (user && user.role && allowedRoles.includes(user.role)) {
        setAuthChecked(true);
        return;
      }

      // If no user or user doesn't have required role, check with API
      if (!user || !user.role || !allowedRoles.includes(user.role)) {
        try {
          setLoading(true);
          const fetchedUser = await repo.getUser();
          
          if (fetchedUser.data) {
            updateUser(fetchedUser.data);
            setAuthChecked(true);
          } else {
            setAuthChecked(true);
          }
        } catch (error) {
          console.error("Error fetching user info:", error);
          setAuthChecked(true);
        } finally {
          setLoading(false);
        }
      } else {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [user, allowedRoles, updateUser]);

  // Show loading while checking authentication
  if (loading || !authChecked) {
    return <LoadingSpinner />;
  }

  // If not authenticated or doesn't have required role, redirect to login
  if (!(user && user.role) && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated and has required role, render the protected routes
  return <Outlet />;
};

function AppContent() {
  const { user, _ } = useUser();
  const isLoggedIn = user && user.id;

  return (
    <Router>
      <AppLayout isLoggedIn={isLoggedIn} />
    </Router>
  );
}

function AppLayout({ isLoggedIn }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const getPageTitle = (pathname) => {
    if (pathname === '/') return 'Home';
    if (pathname.startsWith('/submissions')) return 'Submissions';
    if (pathname.startsWith('/standings')) return 'Standings';
    if (pathname.startsWith('/viewcontest')) return 'Contest';
    if (pathname.startsWith('/contest/') && pathname.includes('/submissions/my')) return 'My Contest Submissions';
    if (pathname.startsWith('/contest/') && pathname.includes('/submissions')) return 'Contest Submissions';
    if (pathname.startsWith('/contest/') && pathname.includes('/problem/')) return 'Problem';
    if (pathname.startsWith('/problem/')) return 'Problem';
    if (pathname.startsWith('/profile')) return 'Profile';
    if (pathname.startsWith('/guidelines')) return 'Guidelines';
    if (pathname === '/admin') return 'Admin Dashboard';
    if (pathname.startsWith('/admin/users')) return 'Admin Users';
    if (pathname.startsWith('/admin/trash')) return 'Trash';
    if (pathname.startsWith('/admin/submissions')) return 'Admin Submissions';
    if (pathname.startsWith('/admin/reset-tokens')) return 'Reset Requests';
    if (pathname.startsWith('/contests')) return 'Contests';
    return 'Oto Judge';
  };

  const showNavbar = isLoggedIn && !isAuthPage;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {showNavbar && (
        <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
          <div className="h-14 px-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Open navigation"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                {getPageTitle(location.pathname)}
              </h1>
            </div>

            <Link
              to="/profile"
              className="inline-flex items-center justify-center p-1 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Go to profile"
            >
              <UserCircleIcon className="h-8 w-8" />
            </Link>
          </div>
        </header>
      )}

      {isLoggedIn && !isAuthPage && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div className="min-w-0 w-full p-2 md:p-4">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "user"]} />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/problem/:id" element={<ProblemDetailsPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/standings/:contestId" element={<StandingsPage />} />
              <Route path="/viewcontest/:id" element={<ViewContest />} />
              <Route path="/contest/:contestId/submissions" element={<ContestSubmissions />} />
              <Route path="/contest/:contestId/submissions/my" element={<MyContestSubmissions />} />
              <Route path="/contest/:contestId/problem/:problemId" element={<ProblemDetailsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/guidelines" element={<GuidelinePage />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/trash" element={<AdminTrashPage />} />
              <Route path="/contests" element={<ContestsPage />} />
              <Route path="/contests/:id" element={<ContestDetailsPage />} />
              <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
              <Route path="/admin/reset-tokens" element={<AdminResetTokensPage />} />
            </Route>

            {/* Catch all route - redirect to home or login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <Toaster position="top-right" />
      <AppContent />
    </UserProvider>
  );
}

export default App;