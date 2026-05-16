import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import repo from '../../data/Repo';
import { useUser } from '../../contexts/UserContext';
import { notify } from '../../utils/feedback';
import { useConfirmDelete } from '../../components/common/ConfirmDelete';

// Converts 'YYYY-MM-DDTHH:mm' (local) to a UTC ISO string
const localToUTC = (localDateTime) => {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  return date.toISOString();
};

// Converts a UTC ISO string to a local 'YYYY-MM-DDTHH:mm' string for input fields
const utcToLocal = (utcString) => {
  if (!utcString) return '';
  const date = new Date(utcString);
  // Get the timezone offset in minutes, convert it to milliseconds, and subtract it from the UTC date.
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - timezoneOffset);
  // Format to 'YYYY-MM-DDTHH:mm'
  return localDate.toISOString().slice(0, 16);
};

// Formats a UTC ISO string to a more readable format e.g. "2024-07-27 10:30 UTC"
const formatUTC = (utcString) => {
  if (!utcString) return 'N/A';
  try {
    return new Date(utcString).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  } catch (error) {
    return 'Invalid Date';
  }
};

const ContestsPage = () => {
  const [contestList, setContestList] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [newContest, setNewContest] = useState({
    title: "",
    start_time: "",
    duration: 0,
  });
  const [editingContest, setEditingContest] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: null,
    title: "",
    start_time: "",
    duration: 0,
  });

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const navigate = useNavigate(); // Hook for navigation
  const { user } = useUser();
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    // Fetch contests from API
    const fetchContests = async () => {
      try {
        const res = await repo.getContests();
        // Handle paginated response - extract data array
        const contests = res.data?.data || res.data || [];
        setContestList(Array.isArray(contests) ? contests : []);
      } catch (err) {
        setContestList([]);
      }
    };
    fetchContests();
  }, []);

  // Handle input change for new contest
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewContest({ ...newContest, [name]: value });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  // Handle form submission to create a new contest
  const handleCreateContest = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      // Prepare payload and convert time to UTC
      const payload = {
        title: newContest.title,
        start_time: localToUTC(newContest.start_time),
        duration: parseInt(newContest.duration, 10),
      };

      await notify.promise(
        repo.createContest(payload),
        {
          loading: 'Creating contest...',
          success: 'Contest created.',
          error: 'Failed to create contest.',
        }
      );
      // Refresh contest list
      const res = await repo.getContests();
      const contests = res.data?.data || res.data || [];
      setContestList(Array.isArray(contests) ? contests : []);
      setShowPopup(false); // Close the popup after submission
      setNewContest({ title: "", start_time: "", duration: 0 }); // Reset the form
    } catch (err) {
      setCreateError("Failed to create contest. Please try again.");
    }
    setCreateLoading(false);
  };

  const handleUpdateContest = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError("");
    try {
      const payload = {
        title: editFormData.title,
        start_time: localToUTC(editFormData.start_time),
        duration: parseInt(editFormData.duration, 10),
      };
      await notify.promise(
        repo.updateContest(editingContest.id, payload),
        {
          loading: 'Updating contest...',
          success: 'Contest updated.',
          error: 'Failed to update contest.',
        }
      );
      // Refresh contest list
      const res = await repo.getContests();
      const contests = res.data?.data || res.data || [];
      setContestList(Array.isArray(contests) ? contests : []);
      setEditingContest(null); // Close popup
    } catch (err) {
      setUpdateError("Failed to update contest. Please try again.");
    }
    setUpdateLoading(false);
  };

  // Open and close the popup
  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  const handleEditClick = (e, contest) => {
    e.stopPropagation();
    setEditingContest(contest);
    setEditFormData({
      id: contest.id,
      title: contest.title,
      start_time: utcToLocal(contest.start_time),
      duration: contest.duration,
    });
  };

  const closeEditPopup = () => {
    setEditingContest(null);
  }

  // Navigate to contest details page
  const handleContestClick = (id) => {
    // Admin goes to contest details (problem management), user goes to view contest
    if (user.role === 'admin') {
      navigate(`/contests/${id}`);
    } else {
      navigate(`/viewcontest/${id}`);
    }
  };

  // Delete contest
  const handleDeleteContest = async (e, contestId) => {
    e.stopPropagation();
    
    await confirmDelete({
      entity: 'contest',
      onConfirm: async () => {
        await notify.promise(
          repo.deleteContest(contestId),
          {
            loading: 'Deleting...',
            success: 'Deleted.',
            error: 'Delete failed.',
          }
        );
        // Refresh contest list
        const res = await repo.getContests();
        const contests = res.data?.data || res.data || [];
        setContestList(Array.isArray(contests) ? contests : []);
      }
    });
  };

  return (
    <div className="p-3 sm:p-4 md:px-8 lg:px-12 xl:px-16 text-sm">
      <ConfirmDeleteDialog />
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Contests</h1>
      
      {/* Display List of Contests */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700 text-left">
              <th className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">ID</th>
              <th className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">Title</th>
              <th className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">Start Time</th>
              <th className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">Duration</th>
              {user.role === 'admin' && <th className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {contestList.map((contest) => (
              <tr
                key={contest.id}
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                onClick={() => handleContestClick(contest.id)}
              >
                <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{contest.id}</td>
                <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{contest.title}</td>
                <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{formatUTC(contest.start_time)}</td>
                <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">{contest.duration}</td>
                {user.role === 'admin' && (
                  <td className="py-2 px-4 border-b border-gray-300 dark:border-gray-600">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        onClick={(e) => handleEditClick(e, contest)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        onClick={e => handleDeleteContest(e, contest.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Button to trigger popup for creating a new contest - Admin only */}
      {user.role === 'admin' && (
        <button
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={togglePopup}
        >
          Create New Contest
        </button>
      )}

      {/* Popup for contest creation */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Create New Contest</h2>

            <form onSubmit={handleCreateContest}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Title</label>
                <input
                  type="text"
                  name="title"
                  value={newContest.title}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Start Time</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={newContest.start_time}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Duration(in minutes)</label>
                <input
                  type="text"
                  name="duration"
                  value={newContest.duration}
                  onChange={handleInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  placeholder="e.g., 120"
                  required
                />
              </div>

              {createError && <div className="mb-2 text-red-500 dark:text-red-400">{createError}</div>}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                  onClick={togglePopup}
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                  disabled={createLoading}
                >
                  {createLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup for contest editing */}
      {editingContest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-md w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Edit Contest</h2>
            <form onSubmit={handleUpdateContest}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Title</label>
                <input
                  type="text"
                  name="title"
                  value={editFormData.title}
                  onChange={handleEditInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Start Time</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={editFormData.start_time}
                  onChange={handleEditInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-900 dark:text-white">Duration (in minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={editFormData.duration}
                  onChange={handleEditInputChange}
                  className="border border-gray-300 dark:border-gray-600 p-2 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded"
                  placeholder="e.g., 120"
                  required
                />
              </div>
              {updateError && <div className="mb-2 text-red-500 dark:text-red-400">{updateError}</div>}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                  onClick={closeEditPopup}
                  disabled={updateLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                  disabled={updateLoading}
                >
                  {updateLoading ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestsPage;
