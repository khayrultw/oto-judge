import React, { useEffect, useState } from 'react';
import repo, { BASE_URL, key } from '../../data/Repo';
import { useParams } from 'react-router-dom';
import StandingsTable from './StandingsTable';

const StandingsPage = () => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contest, setContest] = useState(null);
  const { contestId } = useParams();

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

    const q = localStorage.getItem(key)
    const es = new EventSource(BASE_URL + "/contests/standings/sse/" + contestId + "?q=" + q)
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStandings(data);
    } 

    return () => {
      es.close();
    };
    
  }, [contestId]);

  return (
    <div className="p-0 md:p-2 text-xs">
      <div className="max-w-5xl mx-auto px-1 sm:px-2">
        <h1 className="font-bold mb-1.5 text-sm text-gray-900 dark:text-white">
          Standings: {contest ? (contest.title || contest.id) : contestId}
        </h1>
        <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100">
          Use of generative AI tools (ChatGPT, Claude, DeepSeek, etc.) is strictly prohibited. You may only browse programming language documentation.
        </div>
      </div>
      {loading ? (
        <div className="max-w-5xl mx-auto px-1 sm:px-2 text-xs text-gray-600 dark:text-gray-400">Loading...</div>
      ) : error ? (
        <div className="max-w-5xl mx-auto px-1 sm:px-2 text-xs text-red-500 dark:text-red-400">{error}</div>
      ) : ( 
        <StandingsTable standings={standings} />
      )}
    </div>
  );
};

export default StandingsPage;
