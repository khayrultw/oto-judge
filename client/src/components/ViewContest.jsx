import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import repo from '../data/Repo';

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
    <div className="md:px-8 py-8 text-xs md:text-base max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
      <h1 className="font-bold text-lg">{contest.title}</h1>
      <div className="flex space-x-2">
        <button
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={() => navigate(`/contest/${id}/submissions`)}
        >
          Submissions
        </button>
        <button 
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          onClick={() => navigate(`/contest/${id}/submissions/my`)}
        >
          My Submissions
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => navigate(`/standings/${id}`)}
        >
          Standings
        </button>
      </div>
    </div>
      <div className="mb-2 text-gray-600">
        <strong>Start Time:</strong> {contest.start_time && new Date(contest.start_time).toLocaleString()}
      </div>
      <div className="mb-2 text-gray-600">
        <strong>Duration:</strong> {contest.duration} minutes
      </div>
      <div className="mb-4 text-blue-600 font-semibold">{remaining}</div>
      <h2 className="font-bold mb-4">Problems</h2>
      <div className="space-y-2">
        {problems
          .sort((a, b) => a.problem_number - b.problem_number)
          .map((problem, idx) => (
            <div
              key={problem.id}
              className="p-4 bg-gray-100 rounded shadow cursor-pointer hover:bg-blue-100 flex items-center space-x-4"
              onClick={() => navigate(`/problem/${problem.id}`)}
            >
              <span className="font-semibold">
                Problem {(problem.problem_number ?? idx) + 1}
              </span>
              <span className="font-bold">{problem.title}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default ViewContest;