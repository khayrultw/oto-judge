import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import repo from '../../data/Repo';
import { useUser } from '../../contexts/UserContext';

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

  useEffect(() => {
    // Fetch contests from API
    const fetchContests = async () => {
      try {
        const res = await repo.getContests();
        setContestList(res.data);
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

      await repo.createContest(payload);
      // Refresh contest list
      const res = await repo.getContests();
      setContestList(res.data);
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
      await repo.updateContest(editingContest.id, payload);
      // Refresh contest list
      const res = await repo.getContests();
      setContestList(res.data);
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
    navigate(`/contests/${id}`);
  };

  // Delete contest
  const handleDeleteContest = async (e, contestId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this contest?')) return;
    try {
      await repo.deleteContest(contestId);
      // Refresh contest list
      const res = await repo.getContests();
      setContestList(res.data);
    } catch (err) {
      alert('Failed to delete contest.');
    }
  };

  return (
    <div className="p-4 md:px-24 lg:px-48 xl:px-64 text-xs md:text-base">
      <h1 className="text-2xl font-bold mb-4">Contests</h1>
      
      {/* Display List of Contests */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="py-2 px-4 border">ID</th>
              <th className="py-2 px-4 border">Title</th>
              <th className="py-2 px-4 border">Start Time</th>
              <th className="py-2 px-4 border">Duration</th>
              {user.role === 'admin' && <th className="py-2 px-4 border">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {contestList.map((contest) => (
              <tr
                key={contest.id}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleContestClick(contest.id)}
              >
                <td className="py-2 px-4 border-b">{contest.id}</td>
                <td className="py-2 px-4 border-b">{contest.title}</td>
                <td className="py-2 px-4 border-b">{formatUTC(contest.start_time)}</td>
                <td className="py-2 px-4 border-b">{contest.duration}</td>
                {user.role === 'admin' && (
                  <td className="py-2 px-4 border-b">
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

      {/* Button to trigger popup for creating a new contest */}
      <button
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        onClick={togglePopup}
      >
        Create New Contest
      </button>

      {/* Popup for contest creation */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-md w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Create New Contest</h2>

            <form onSubmit={handleCreateContest}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={newContest.title}
                  onChange={handleInputChange}
                  className="border p-2 w-full"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={newContest.start_time}
                  onChange={handleInputChange}
                  className="border p-2 w-full"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Duration(in minutes)</label>
                <input
                  type="text"
                  name="duration"
                  value={newContest.duration}
                  onChange={handleInputChange}
                  className="border p-2 w-full"
                  placeholder="e.g., 120"
                  required
                />
              </div>

              {createError && <div className="mb-2 text-red-500">{createError}</div>}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-4 bg-gray-300 px-4 py-2 rounded"
                  onClick={togglePopup}
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-md w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Edit Contest</h2>
            <form onSubmit={handleUpdateContest}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  value={editFormData.title}
                  onChange={handleEditInputChange}
                  className="border p-2 w-full"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={editFormData.start_time}
                  onChange={handleEditInputChange}
                  className="border p-2 w-full"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Duration (in minutes)</label>
                <input
                  type="number"
                  name="duration"
                  value={editFormData.duration}
                  onChange={handleEditInputChange}
                  className="border p-2 w-full"
                  placeholder="e.g., 120"
                  required
                />
              </div>
              {updateError && <div className="mb-2 text-red-500">{updateError}</div>}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="mr-4 bg-gray-300 px-4 py-2 rounded"
                  onClick={closeEditPopup}
                  disabled={updateLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded"
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
