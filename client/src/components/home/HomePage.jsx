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
      const [upcomingRes, allRes] = await Promise.all([
        repo.getUpCommingContest(),
        repo.getContests()
      ]);
      const now = new Date();
      // Categorize contests
      let running = null;
      let upcoming = [];
      let previous = [];
      allRes.data.forEach(c => {
        const start = new Date(c.start_time || c.startTime);
        const duration = c.duration || c.durations || 0;
        const end = new Date(start.getTime() + duration * 60000);
        if (now >= start && now <= end && !running) {
          running = c;
        } else if (now < start) {
          upcoming.push(c);
        } else if (now > end) {
          previous.push(c);
        }
      });
      // Sort upcoming by soonest start, previous by most recent
      upcoming = upcoming.sort((a, b) => new Date(a.start_time || a.startTime) - new Date(b.start_time || b.startTime));
      previous = previous.sort((a, b) => new Date(b.start_time || b.startTime) - new Date(a.start_time || a.startTime));
      setRunningContest(running);
      setUpcomingContests(upcoming);
      setPreviousContests(previous.slice(0, 10));
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
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contests</h1>
      {error && (
        <div className="text-red-500 text-center p-4 bg-red-50 rounded-lg">{error}</div>
      )}
      {/* Running Contest */}
      {runningContest && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Running Contest</h2>
          <div
            className="bg-green-50 rounded-lg shadow-md p-6 mb-2 cursor-pointer hover:bg-green-100"
            onClick={() => navigate(`/viewcontest/${runningContest.id}`)}
          >
            <div className="text-xl font-bold mb-1">{runningContest.title}</div>
            <div className="text-gray-600 mb-1">Start: {formatDateTime(runningContest.start_time || runningContest.startTime)}</div>
            <div className="text-gray-600">Duration: {formatDuration(runningContest.duration || runningContest.durations)}</div>
          </div>
        </div>
      )}
      {/* Upcoming Contests */}
      {upcomingContests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Upcoming Contest{upcomingContests.length > 1 ? 's' : ''}</h2>
          {upcomingContests.map(contest => (
            <div
              key={contest.id}
              className="bg-white rounded-lg shadow-md p-6 mb-2 cursor-pointer hover:bg-blue-50"
              onClick={() => navigate(`/viewcontest/${contest.id}`)}
            >
              <div className="text-xl font-bold mb-1">{contest.title}</div>
              <div className="text-gray-600 mb-1">Start: {formatDateTime(contest.start_time || contest.startTime)}</div>
              <div className="text-gray-600">Duration: {formatDuration(contest.duration || contest.durations)}</div>
            </div>
          ))}
        </div>
      )}
      {/* Previous Contests */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">Previous Contests</h2>
        {previousContests.length === 0 ? (
          <div className="text-gray-500">No previous contests.</div>
        ) : (
          <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow-md">
            {previousContests.map(contest => (
              <li
                key={contest.id}
                className="p-4 hover:bg-blue-50 cursor-pointer"
                onClick={() => navigate(`/viewcontest/${contest.id}`)}
              >
                <div className="font-bold">{contest.title}</div>
                <div className="text-gray-600 text-sm">Ended</div>
                <div className="text-gray-600 text-sm">Duration: {formatDuration(contest.duration || contest.durations)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default HomePage;
