import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import repo from '../../data/Repo';
import AIPolicyBanner from '../common/AIPolicyBanner';

function ViewContest() {
  const { id } = useParams();
  const [contest, setContest] = useState({});
  const [problems, setProblems] = useState([]);
  const [remaining, setRemaining] = useState('');
  const [intervalId, setIntervalId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const res = await repo.getContest(id);
        setContest(res.data);
        setProblems(res.data.problems || []);
        updateRemaining(res.data);
        if (intervalId) clearInterval(intervalId);
        const newInterval = setInterval(() => updateRemaining(res.data), 1000);
        setIntervalId(newInterval);
      } catch (err) {
        setContest({});
        setProblems([]);
      }
    };
    fetchContest();
    return () => { if (intervalId) clearInterval(intervalId); };
    // eslint-disable-next-line
  }, [id]);

  const updateRemaining = (contestData) => {
    if (!contestData.start_time || !contestData.duration) {
      setRemaining('');
      return;
    }
    const start = new Date(contestData.start_time);
    const durationMs = Number(contestData.duration) * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);
    const now = new Date();
    if (now < start) {
      setRemaining(`Starts in: ${formatTimeDiff(start - now)}`);
    } else if (now >= start && now <= end) {
      setRemaining(`Time left: ${formatTimeDiff(end - now)}`);
    } else {
      setRemaining('Contest ended');
    }
  };

  const formatTimeDiff = (ms) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="px-4 py-4 text-sm max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
        <h1 className="font-bold text-xl mr-2 mb-2 sm:mb-0 text-gray-900 dark:text-white">{contest.title}</h1>

        <div className="grid grid-cols-2 sm:flex gap-1.5 w-full sm:w-auto">
          <button
            className="bg-green-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-green-600 whitespace-normal"
            onClick={() => navigate(`/contest/${id}/submissions`)}
          >
            Submissions
          </button>
          <button 
            className="bg-yellow-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-yellow-600 whitespace-normal"
            onClick={() => navigate(`/contest/${id}/submissions/my`)}
          >
            My Submissions
          </button>
          <button
            className="bg-blue-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-blue-600 whitespace-normal"
            onClick={() => navigate(`/standings/${id}`)}
          >
            Standings
          </button>
          <button
            className="bg-gray-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-gray-600 whitespace-normal col-span-2 sm:col-span-1"
            onClick={() => navigate('/guidelines')}
          >
            Guidelines
          </button>
        </div>
      </div>
      <AIPolicyBanner className="mb-3" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-sm text-gray-600 dark:text-gray-400">
        <span><strong>Start:</strong> {contest.start_time && new Date(contest.start_time).toLocaleString()}</span>
        <span><strong>Duration:</strong> {contest.duration} min</span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">{remaining}</span>
      </div>
      <h2 className="font-bold mb-3 text-lg text-gray-900 dark:text-white">Problems</h2>
      <div className="space-y-1.5">
        {problems
          .sort((a, b) => a.problem_number - b.problem_number)
          .map((problem, idx) => (
            <div
              key={problem.id}
              className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded shadow-sm cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 flex items-center gap-2 sm:gap-3 border border-gray-200 dark:border-gray-700"
              onClick={() => navigate(`/contest/${id}/problem/${problem.id}`)}
            >
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                Problem {(problem.problem_number ?? idx) + 1}
              </span>
              <span className="font-bold text-sm text-gray-900 dark:text-white">{problem.title}</span>
              {problem.is_special && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Special
                </span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

export default ViewContest;