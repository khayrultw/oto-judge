import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import repo from '../../data/Repo';

function HomePage() {
  const [upcomingContests, setUpcomingContests] = useState([]);
  const [previousContests, setPreviousContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningContest, setRunningContest] = useState(null);
  const navigate = useNavigate();

  const fetchContests = async () => {
    try {
      const [upcomingRes, allRes, pastRes] = await Promise.all([
        repo.getUpcomingContest(),
        repo.getContests(),
        repo.getPastContests({ page_size: 10 })
      ]);
      const now = new Date();
      // Categorize contests - handle paginated response
      const allContests = allRes.data?.data || allRes.data || [];
      const pastContests = pastRes.data?.data || pastRes.data || [];
      let running = null;
      let upcoming = [];
      
      (Array.isArray(allContests) ? allContests : []).forEach(c => {
        const start = new Date(c.start_time || c.startTime);
        const duration = c.duration || c.durations || 0;
        const end = new Date(start.getTime() + duration * 60000);
        if (now >= start && now <= end && !running) {
          running = c;
        } else if (now < start) {
          upcoming.push(c);
        }
      });
      // Sort upcoming by soonest start
      upcoming = upcoming.sort((a, b) => new Date(a.start_time || a.startTime) - new Date(b.start_time || b.startTime));
      
      setRunningContest(running);
      setUpcomingContests(upcoming);
      setPreviousContests(pastContests);
      setError('');
    } catch (err) {
      setError('Failed to load contests.');
      setRunningContest(null);
      setUpcomingContests([]);
      setPreviousContests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const formatDateTime = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleString(undefined, options);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 
      ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`
      : `${minutes} minutes`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-5xl mx-auto text-sm">
      <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Contests</h1>
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
        Use of generative AI tools (ChatGPT, Claude, DeepSeek, etc.) is strictly prohibited. You may only browse programming language documentation.
      </div>
      {error && (
        <div className="text-red-500 dark:text-red-400 text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</div>
      )}
      {/* Running Contest */}
      {runningContest && (
        <div className="mb-5">
          <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Running Contest</h2>
          <div
            className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-sm p-3 mb-2 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800"
            onClick={() => navigate(`/viewcontest/${runningContest.id}`)}
          >
            <div className="text-sm font-bold mb-0.5 text-gray-900 dark:text-white">{runningContest.title}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Start: {formatDateTime(runningContest.start_time || runningContest.startTime)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Duration: {formatDuration(runningContest.duration || runningContest.durations)}</div>
          </div>
        </div>
      )}
      {/* Upcoming Contests */}
      {upcomingContests.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Upcoming Contest{upcomingContests.length > 1 ? 's' : ''}</h2>
          {upcomingContests.map(contest => (
            <div
              key={contest.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 mb-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              onClick={() => navigate(`/viewcontest/${contest.id}`)}
            >
              <div className="text-sm font-bold mb-0.5 text-gray-900 dark:text-white">{contest.title}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Start: {formatDateTime(contest.start_time || contest.startTime)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Duration: {formatDuration(contest.duration || contest.durations)}</div>
            </div>
          ))}
        </div>
      )}
      {/* Previous Contests */}
      <div>
        <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">Previous Contests</h2>
        {previousContests.length === 0 ? (
          <div className="text-xs text-gray-500 dark:text-gray-400">No previous contests.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {previousContests.map(contest => (
              <li
                key={contest.id}
                className="p-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/viewcontest/${contest.id}`)}
              >
                <div className="text-sm font-bold text-gray-900 dark:text-white">{contest.title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Ended</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Duration: {formatDuration(contest.duration || contest.durations)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default HomePage;
