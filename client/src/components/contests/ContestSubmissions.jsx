import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import SubmissionsList from '../submissions/SubmissionList';
import repo, { BASE_URL, key } from '../../data/Repo';

function ContestSubmissions() {
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { contestId } = useParams();

    useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await repo.getContestSubmissions(contestId);
        setSubmissions(res.data);
        setError('');
      } catch (err) {
        setError('Failed to load submissions.');
        setSubmissions([]);
      }
      setLoading(false);
    };
    fetchSubmissions();

      const q = localStorage.getItem(key)
      const es = new EventSource(BASE_URL + `/contests/${contestId}/sse?q=${q}`)
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setSubmissions(data);
        } catch (err) {
          console.error("Bad JSON:", err);
        }
      }

      return () => {
        es.close();
      };
  }, []);

  const handleDetails = (submission) => {
    setSelectedSubmission(submission);
  };

  const handleClosePopup = () => {
    setSelectedSubmission(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4 text-center">Contest Submissions</h1>

      <SubmissionsList submissions={submissions} loading={loading} error={error} onDetails={handleDetails} />
     
      {/* Details Popup  */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center overflow-y-auto"
          onClick={handleClosePopup}
        >
          <div
            className="bg-white p-4 rounded-md max-w-2xl w-full max-h-[90vh] overflow-y-auto text-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl mb-4">Submission Details</h2>
            <div className="mb-2">
              <span className="font-bold">Status:</span> <span className={selectedSubmission.status === 'PASS' ? 'text-green-600' : 'text-red-600'}>{selectedSubmission.status}</span>
            </div>
           
            {selectedSubmission.status !== 'PASS' && selectedSubmission.message && (
              <div className="mb-2">
                <Markdown>{selectedSubmission.message}</Markdown>
              </div>
            )}
            <div className="mb-2">
              <span className="font-bold">Source Code:</span>
              <pre className="bg-gray-200 p-4 rounded-md max-h-[50vh] overflow-y-auto mt-2 text-sm">
                <code className="text-xs">{selectedSubmission.code || selectedSubmission.source_code}</code>
              </pre>
            </div>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
              onClick={handleClosePopup}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContestSubmissions;
