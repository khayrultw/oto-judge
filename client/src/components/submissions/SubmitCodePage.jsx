import React, { useState, useEffect } from 'react';
import repo from '../../data/Repo';
import { useLocation, useNavigate } from 'react-router-dom';

function SubmitCodePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const problemId = location.state?.problemId;
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!problemId) return;
    const fetchProblem = async () => {
      try {
        const res = await repo.getProblem(problemId);
        setProblem(res.data);
      } catch (err) {
        setProblem(null);
      }
    };
    fetchProblem();
  }, [problemId]);

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  }
  const handleCodeChange = (event) => {
    setCode(event.target.value);
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await repo.submitCode(
        problemId,
        {
          contest_id: problem.contest_id,
          language,
          source_code: code,
        }
      );
      navigate('/contest/' + problem.contest_id + '/submissions/my', { replace: true });

    } catch (err) {
      setError('Failed to submit code.');
    }
    setLoading(false);
  };

  if (!problemId) {
    return <div className="text-center text-red-600 mt-10">No problem selected for submission.</div>;
  }
  if (!problem) {
    return <div className="text-center text-red-600 mt-10">Problem not found.</div>;
  }

  return (
    <div className="flex justify-center p-4">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl mb-4 text-center">
          Submit Code for Problem '{ problem.title}'
        </h1>
        <div className="h-screen flex flex-col p-4 max-h-[calc(100vh-200px)]">
          <form onSubmit={handleSubmit} className="flex flex-col flex-grow space-y-4 overflow-hidden">
            
            {/* Language Selector */}
            <div className="shrink-0">
              <label htmlFor="language" className="block mb-2 font-bold">Language</label>
              <select
                id="language"
                value={language}
                onChange={handleLanguageChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Select language</option>
                <option value="kt">Kotlin</option>
                <option value="py">Python</option>
                <option value="js">Javascript</option>
              </select>
            </div>

            <div className="flex flex-col flex-grow overflow-hidden">
              <label htmlFor="code" className="block mb-2 font-bold">Code</label>
              <textarea
                id="code"
                value={code}
                onChange={handleCodeChange}
                className="w-full h-full p-2 border border-gray-300 rounded-md text-sm resize-none"
                placeholder="Paste your code here..."
              ></textarea>
            </div>

            {message && <div className="text-green-600 text-center">{message}</div>}
            {error && <div className="text-red-600 text-center">{error}</div>}

            <div className="shrink-0">
              <button
                type="submit"
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SubmitCodePage;
