import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import repo from '../data/Repo';


function ProblemDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await repo.getProblem(id);
        setProblem(res.data);
        setError('');
      } catch (err) {
        setProblem(null);
        setError('');
      }
    };
    fetchProblem();
  }, [id]);

  if (!problem || Object.keys(problem).length === 0) {
    return <div className="text-center text-xl text-red-600 mt-10">Problem does not exist.</div>;
  }

  return (
    <div className="flex justify-center bg-gray-50 px-1 sm:px-4 lg:px-16 py-8">
      <div className="bg-white p-2 rounded-lg shadow-lg w-full max-w-5xl flex flex-col" style={{height: 'calc(100vh - 60px - 4rem)', minHeight: '400px'}}>
        <div className="flex justify-between items-start p-6 border-b bg-white">
          <h1 className="text-3xl font-bold">
            Problem {problem.problem_number !== undefined ? String.fromCharCode(65 + problem.problem_number) : id}
          </h1>
          <button
            onClick={() => navigate('/submit-code', { state: { problemId: problem.id } })}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Submit Code
          </button>
        </div>
        {error && <div className="text-red-500 mb-4 px-6">{error}</div>}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <h2 className="text-xl font-semibold mb-2">Statement:</h2>
          {problem.statement ? (
            <div className="prose max-w-none bg-gray-100 p-3 rounded-lg whitespace-pre-line">
              {problem.statement}
            </div>
          ) : (
            <div className="text-gray-500">No statement available.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProblemDetailsPage;
