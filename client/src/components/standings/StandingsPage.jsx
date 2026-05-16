import React, { useEffect, useState } from 'react';
import repo, { BASE_URL, key } from '../../data/Repo';
import { useNavigate, useParams } from 'react-router-dom';
import StandingsTable from './StandingsTable';

const StandingsPage = () => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contest, setContest] = useState(null);
  const { contestId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!contestId) {
      setError('No contest selected.');
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const standingsRes = await repo.getStandings(contestId);
        const contestRes = await repo.getContest(contestId);
        // Handle paginated response
        const standingsData = standingsRes.data?.data || standingsRes.data || [];
        setStandings(standingsData);
        setContest(contestRes.data);
        setError('');
      } catch (err) {
        setError('Failed to fetch standings or contest info');
        setStandings([]);
        setContest(null);
      }
      setLoading(false);
    };
    fetchData();

    const token = localStorage.getItem(key);
    const sseUrl = token
      ? `${BASE_URL}/contests/standings/sse/${contestId}?q=${encodeURIComponent(token)}`
      : `${BASE_URL}/contests/standings/sse/${contestId}`;
    const es = new EventSource(sseUrl)
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStandings(data);
    } 

    return () => {
      es.close();
    };
    
  }, [contestId]);

  return (
    <div className="p-1 sm:p-2 md:p-3 text-sm">
      <div className="w-full max-w-5xl mx-auto px-1 sm:px-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <h1 className="font-bold text-lg text-gray-900 dark:text-white">
            Standings: {contest ? (contest.title || contest.id) : contestId}
          </h1>

          <div className="grid grid-cols-2 sm:flex gap-1.5 w-full sm:w-auto">
            <button
              className="bg-green-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-green-600 whitespace-normal"
              onClick={() => navigate(`/contest/${contestId}/submissions`)}
            >
              Submissions
            </button>
            <button
              className="bg-yellow-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-yellow-600 whitespace-normal"
              onClick={() => navigate(`/contest/${contestId}/submissions/my`)}
            >
              My Submissions
            </button>
            <button
              className="bg-blue-500 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm hover:bg-blue-600 whitespace-normal col-span-2 sm:col-span-1"
              onClick={() => navigate(`/viewcontest/${contestId}`)}
            >
              Problems
            </button>
          </div>
        </div>

        <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-2 sm:px-3 py-2 text-xs sm:text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100 break-words">
          Use of generative AI tools (ChatGPT, Claude, DeepSeek, etc.) is strictly prohibited. You may only browse programming language documentation.
        </div>
      </div>
      {loading ? (
        <div className="w-full max-w-5xl mx-auto px-1 sm:px-2 text-sm text-gray-600 dark:text-gray-400">Loading...</div>
      ) : error ? (
        <div className="w-full max-w-5xl mx-auto px-1 sm:px-2 text-sm text-red-500 dark:text-red-400">{error}</div>
      ) : ( 
        <StandingsTable standings={standings} />
      )}
    </div>
  );
};

export default StandingsPage;
