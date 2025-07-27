import React, { useEffect, useState } from 'react';
import repo, { BASE_URL, key } from '../data/Repo';
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
        const standingsRes = await repo.getStandings(contestId)
        const contestRes = await repo.getContest(contestId)
        setStandings(standingsRes.data);
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
    <div className="p-0 md:p-2 text-xs md:text-base">
      <div className="max-w-5xl mx-auto px-1 sm:px-2 lg:px-4">
        <h1 className="font-bold mb-2">
          Standings for Contest {contest ? (contest.title || contest.id) : contestId}
        </h1>
      </div>
      {loading ? (
        <div className="max-w-5xl mx-auto px-1 sm:px-2 lg:px-4">Loading...</div>
      ) : error ? (
        <div className="max-w-5xl mx-auto px-1 sm:px-2 lg:px-4 text-red-500">{error}</div>
      ) : ( 
        <StandingsTable standings={standings} />
      )}
    </div>
  );
};

export default StandingsPage;
