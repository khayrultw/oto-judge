import { BrowserRouter as Router, Route, Routes, Outlet, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './components/home/HomePage';
import ProblemDetailsPage from './components/contests/ProblemDetailsPage';
import SubmissionsPage from './components/submissions/SubmissionsPage';
import StandingsPage from './components/standings/StandingsPage';
import SubmitCodePage from './components/submissions/SubmitCodePage';
import ContestsPage from './components/contests/ContestsPage';
import ContestDetailsPage from './components/contests/ContestDetailsPage';
import ViewContest from './components/contests/ViewContest';
import LoginPage from './components/auth/LoginPage';
import RegistrationPage from './components/auth/RegistrationPage';
import ProfilePage from './components/auth/ProfilePage';
import { UserProvider, useUser } from "./contexts/UserContext";
import repo from './data/Repo';
import ContestSubmissions from './components/contests/ContestSubmissions';
import MyContestSubmissions from './components/contests/MyContestSubmissions';

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

  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        {/* Navbar is now fixed at the top, so add margin-top to content */}
        <Sidebar />
          <div className="flex-grow p-2 md:p-4 bg-gray-100 
                ml-12 md:ml-64 transition-all duration-200">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "user"]} />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/problem/:id" element={<ProblemDetailsPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/submit-code" element={<SubmitCodePage />} />
              <Route path="/contests" element={<ContestsPage />} />
              <Route path="/contests/:id" element={<ContestDetailsPage />} />
              <Route path="/standings/:contestId" element={<StandingsPage />} />
              <Route path="/viewcontest/:id" element={<ViewContest />} />
              <Route path="/contest/:contestId/submissions" element={<ContestSubmissions />} />
              <Route path="/contest/:contestId/submissions/my" element={<MyContestSubmissions />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Catch all route - redirect to home or login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;