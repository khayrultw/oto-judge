import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import repo from '../../data/Repo';
import { useUser } from '../../contexts/UserContext';
import { notify } from '../../utils/feedback';
import { useConfirmDelete } from '../../components/common/ConfirmDelete';

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
    statement: '',
    testcase: '',
    is_special: false,
  });
  const [error, setError] = useState('');
  const [editPopup, setEditPopup] = useState({ open: false, problem: null, title: '', statement: '', is_special: false });
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

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
    setProblemForm({ problemNumber: '', title: '', statement: '', testcase: '', is_special: false });
    setShowPopup(true);
    setError('');
  };

  // Close the popup
  const closePopup = () => {
    setShowPopup(false);
    setProblemForm({ problemNumber: '', title: '', statement: '', testcase: '', is_special: false });
    setError('');
  };

  // Handle input changes for the problem form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'is_special') {
      setProblemForm((prev) => ({ ...prev, is_special: checked }));
      return;
    }
    setProblemForm((prev) => ({ ...prev, [name]: name === 'problemNumber' ? Number(value) : value }));
  };

  // Handle form submission for creating a new problem
  const handleCreateProblem = async (e) => {
    e.preventDefault();
    if (problemForm.problemNumber === '' || isNaN(problemForm.problemNumber)) {
      setError('Please select a problem number.');
      return;
    }
    if (!problemForm.statement || !problemForm.testcase) {
      setError('Statement and test case are required.');
      return;
    }
    const formData = new FormData();
    formData.append('contest_id', id);
    formData.append('problem_number', problemForm.problemNumber);
    formData.append('title', problemForm.title);
    formData.append('statement', problemForm.statement);
    formData.append('testcase', problemForm.testcase);
    formData.append('is_special', problemForm.is_special ? 'true' : 'false');
    try {
      await notify.promise(
        repo.createProblem(formData),
        {
          loading: 'Creating problem...',
          success: 'Problem created.',
          error: 'Failed to create problem.',
        }
      );
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
    setEditPopup({ open: true, problem, title: problem.title || '', statement: problem.statement || '', is_special: !!problem.is_special });
    setError('');
  };

  // Close edit popup
  const closeEditPopup = () => {
    setEditPopup({ open: false, problem: null, title: '', statement: '' });
    setError('');
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'is_special') {
      setEditPopup((prev) => ({ ...prev, is_special: checked }));
      return;
    }
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
      await notify.promise(
        repo.updateProblem(editPopup.problem.id, {
          title: editPopup.title,
          statement: editPopup.statement,
          is_special: editPopup.is_special,
        }),
        {
          loading: 'Updating problem...',
          success: 'Problem updated.',
          error: 'Failed to update problem.',
        }
      );
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
      <ConfirmDeleteDialog />
      <div className="max-w-5xl mx-auto py-10">
        {/* Contest Title and Description */}
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">{contest.title}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{contest.desc}</p>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          <strong>Start Time:</strong> {contest.start_time} | <strong>Duration:</strong> {contest.duration}
        </p>

        {/* Problem List */}
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Problems</h2>
        <div className="space-y-2">
          {problems
            .slice()
            .sort((a, b) => (a.problem_number ?? 0) - (b.problem_number ?? 0))
            .map((problem, idx) => (
              <div
                key={problem.id}
                className="p-3 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm mb-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[80px_70px_1fr_220px_auto] gap-2 items-start">
                  <div className="text-sm font-mono text-gray-900 dark:text-white">ID: {problem.id}</div>

                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {(problem.problem_number ?? idx) + 1}
                  </div>

                  <div className="text-sm text-gray-900 dark:text-white break-words">
                    <span className="font-semibold">Title:</span> {problem.title || 'N/A'}
                  </div>

                  <div className="text-sm text-gray-900 dark:text-white break-words">
                    <span className="font-semibold">Test Case:</span>{' '}
                    {problem.test_case_path ? (
                      <a
                        href={problem.test_case_path.startsWith('/store') ? problem.test_case_path : `${baseURL}/${problem.test_case_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline"
                      >
                        Download
                      </a>
                    ) : 'N/A'}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {problem.is_special && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Special Judge
                      </span>
                    )}

                    {user.role === 'admin' && (
                      <>
                        <button
                          className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                          onClick={() => handleEditProblem(problem)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          onClick={async () => {
                            await confirmDelete({
                              entity: 'problem',
                              onConfirm: async () => {
                                await notify.promise(
                                  repo.deleteProblem(problem.id),
                                  {
                                    loading: 'Deleting...',
                                    success: 'Deleted.',
                                    error: 'Delete failed.',
                                  }
                                );
                                const res = await repo.getContest(id);
                                setProblems(res.data.problems || []);
                              }
                            });
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
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

      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-md w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateProblem}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Problem Number</label>
                <select
                  name="problemNumber"
                  value={problemForm.problemNumber}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                >
                  <option value="" disabled>Select problem number</option>
                  {availableProblemNumberOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Problem Title</label>
                <input
                  type="text"
                  name="title"
                  value={problemForm.title}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Statement</label>
                <textarea
                  name="statement"
                  value={problemForm.statement || ''}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  rows={12}
                  placeholder="Enter the problem statement..."
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Test Case</label>
                <textarea
                  name="testcase"
                  value={problemForm.testcase}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  rows={12}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <input
                    type="checkbox"
                    name="is_special"
                    checked={problemForm.is_special}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  Special Judge (manual review)
                </label>
              </div>
              {error && <div className="mb-4 text-red-500 dark:text-red-400">{error}</div>}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                  onClick={closePopup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Save Problem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPopup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-md w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Edit Problem</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Problem Title</label>
                <input
                  type="text"
                  name="title"
                  value={editPopup.title}
                  onChange={handleEditChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Statement</label>
                <textarea
                  name="statement"
                  value={editPopup.statement}
                  onChange={handleEditChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full h-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded resize-y"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <input
                    type="checkbox"
                    name="is_special"
                    checked={editPopup.is_special}
                    onChange={handleEditChange}
                    className="rounded"
                  />
                  Special Judge (manual review)
                </label>
              </div>
              {error && <div className="mb-4 text-red-500 dark:text-red-400">{error}</div>}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                  onClick={closeEditPopup}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
