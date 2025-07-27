import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import repo from '../data/Repo';
import { useUser } from '../contexts/UserContext';

const baseURL = '/api';

const problemNumberOptions = Array.from({ length: 10 }, (_, i) => ({ label: (i + 1).toString(), value: i }));

const ContestDetailsPage = () => {
  const { id } = useParams();
  const { user } = useUser();
  const [contest, setContest] = useState({});
  const [problems, setProblems] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [problemForm, setProblemForm] = useState({
    problemNumber: '',
    title: '',
    statement: null,
    testcase: null,
  });
  const [error, setError] = useState('');
  const [editPopup, setEditPopup] = useState({ open: false, problem: null, title: '', statement: '' });

  useEffect(() => {
    const fetchContest = async () => {
      try {
        const res = await repo.getContest(id);
        setContest(res.data);
        setProblems(res.data.problems || []);
      } catch (err) {
        setContest({});
        setProblems([]);
      }
    };
    fetchContest();
  }, [id]);

  // Open the popup for adding a new problem
  const handleAddProblem = () => {
    setProblemForm({ problemNumber: '', title: '', statement: null, testcase: null });
    setShowPopup(true);
    setError('');
  };

  // Close the popup
  const closePopup = () => {
    setShowPopup(false);
    setProblemForm({ problemNumber: '', title: '', statement: null, testcase: null });
    setError('');
  };

  // Handle input changes for the problem form
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setProblemForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setProblemForm((prev) => ({ ...prev, [name]: name === 'problemNumber' ? Number(value) : value }));
    }
  };

  // Handle form submission for creating a new problem
  const handleCreateProblem = async (e) => {
    e.preventDefault();
    if (problemForm.problemNumber === '' || isNaN(problemForm.problemNumber)) {
      setError('Please select a problem number.');
      return;
    }
    if (!problemForm.statement || !problemForm.testcase) {
      setError('Both files are required.');
      return;
    }
    const formData = new FormData();
    formData.append('contest_id', id);
    formData.append('problem_number', problemForm.problemNumber);
    formData.append('title', problemForm.title);
    formData.append('statement', problemForm.statement);
    formData.append('testcase', problemForm.testcase);
    try {
      await repo.createProblem(formData);
      setError('');
      closePopup();
      // Refresh problems list
      const res = await repo.getContest(id);
      setProblems(res.data.problems || []);
    } catch (err) {
      setError('Failed to create problem');
    }
  };

  // Open edit popup
  const handleEditProblem = (problem) => {
    setEditPopup({ open: true, problem, title: problem.title || '', statement: problem.statement || '' });
    setError('');
  };

  // Close edit popup
  const closeEditPopup = () => {
    setEditPopup({ open: false, problem: null, title: '', statement: '' });
    setError('');
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditPopup((prev) => ({ ...prev, [name]: value }));
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editPopup.title || !editPopup.statement) {
      setError('Title and statement are required.');
      return;
    }
    try {
      await repo.updateProblem(editPopup.problem.id, {
        title: editPopup.title,
        statement: editPopup.statement,
      });
      closeEditPopup();
      // Refresh problems list
      const res = await repo.getContest(id);
      setProblems(res.data.problems || []);
    } catch (err) {
      setError('Failed to update problem.');
    }
  };

  // Compute available problem numbers for dropdown
  const usedNumbers = new Set(problems.map(p => p.problem_number));
  const availableProblemNumberOptions = problemNumberOptions.filter(opt => !usedNumbers.has(opt.value));

  return (
    <div className="px-2 md:px-8 lg:px-0">
      <div className="max-w-5xl mx-auto py-10">
        {/* Contest Title and Description */}
        <h1 className="text-3xl font-bold mb-4">{contest.title}</h1>
        <p className="text-gray-600 mb-4">{contest.desc}</p>
        <p className="text-gray-500 mb-6">
          <strong>Start Time:</strong> {contest.start_time} | <strong>Duration:</strong> {contest.duration}
        </p>

        {/* Problem List */}
        <h2 className="text-2xl font-bold mb-4">Problems</h2>
        <div className="space-y-2">
          {problems
            .slice()
            .sort((a, b) => (a.problem_number ?? 0) - (b.problem_number ?? 0))
            .map((problem, idx) => (
              <div
              key={problem.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-200 rounded-md shadow-sm w-auto mb-2"
            >
              {/* ID with fixed width */}
              <div className="w-[60px] text-left text-sm font-mono shrink-0">
                ID: {problem.id}
              </div>
            
              {/* Problem Number (1, 2, 3...) */}
              <div className="w-[40px] text-left text-sm font-semibold shrink-0">
                {(problem.problem_number ?? idx) + 1}
              </div>
            
              {/* Title with fixed width and ellipsis */}
              <div className="w-[250px] text-left text-sm truncate">
                Title: {problem.title || 'N/A'}
              </div>
            
              {/* Test case link */}
              <div className="text-left text-sm w-[200px] truncate">
                Test Case: {problem.test_case_path ? (
                  <a
                    href={`${baseURL}/${problem.test_case_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Download
                  </a>
                ) : 'N/A'}
              </div>
            
              {/* Admin-only buttons */}
              {user.role === 'admin' && (
                <div className="flex flex-row gap-2 mt-2 sm:mt-0 shrink-0">
                  <button
                    className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                    onClick={() => handleEditProblem(problem)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete this problem?')) return;
                      try {
                        await repo.deleteProblem(problem.id);
                        const res = await repo.getContest(id);
                        setProblems(res.data.problems || []);
                      } catch (err) {
                        alert('Failed to delete problem.');
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            
          ))}
        </div>

        <button
          className="mt-5 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleAddProblem}
        >
          Add New Problem
        </button>
      </div>

      {/* Problem Popup for adding a problem */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white py-10 px-10 rounded-md w-full max-w-4xl max-h-[80vh] overflow-y-auto my-8">
            <form onSubmit={handleCreateProblem}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Problem Number</label>
                <select
                  name="problemNumber"
                  value={problemForm.problemNumber}
                  onChange={handleInputChange}
                  className="border p-2 w-full"
                  required
                >
                  <option value="" disabled>Select problem number</option>
                  {availableProblemNumberOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Problem Title</label>
                <input
                  type="text"
                  name="title"
                  value={problemForm.title}
                  onChange={handleInputChange}
                  className="border p-2 w-full"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Statement</label>
                <textarea
                  name="statement"
                  value={problemForm.statement || ''}
                  onChange={handleInputChange}
                  className="border p-2 w-full text-sm"
                  rows={12}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Test Case</label>
                <textarea
                  name="testcase"
                  value={problemForm.testcase}
                  onChange={handleInputChange}
                  className="border p-2 w-full text-sm"
                  rows={12}
                  required
                />
              </div>
              {error && <div className="mb-4 text-red-500">{error}</div>}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-4 bg-gray-300 px-4 py-2 rounded"
                  onClick={closePopup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Save Problem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Problem Popup */}
      {editPopup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white py-10 px-10 rounded-md w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Edit Problem</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Problem Title</label>
                <input
                  type="text"
                  name="title"
                  value={editPopup.title}
                  onChange={handleEditChange}
                  className="border p-2 w-full"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Statement</label>
                <textarea
                  name="statement"
                  value={editPopup.statement}
                  onChange={handleEditChange}
                  className="border p-2 w-full"
                  rows={10}
                  required
                />
              </div>
              {error && <div className="mb-4 text-red-500">{error}</div>}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-4 bg-gray-300 px-4 py-2 rounded"
                  onClick={closeEditPopup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestDetailsPage;
