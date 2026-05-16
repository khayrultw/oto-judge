const SubmissionsList = ({ submissions = [], loading, error, onDetails }) => {
  if (loading) return <div className="text-center text-gray-500">Loading...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (!submissions?.length) return <div className="text-center text-gray-500">No submissions found.</div>;
  
  const getStatusClass = (status) => {
    if (status === 'PASS') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
  };

  return (
    <div>
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="flex flex-col md:flex-row md:items-center bg-gray-100 dark:bg-gray-800 p-4 mb-2 rounded-lg max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 text-sm gap-x-2"
        >
          <div className="text-left font-bold truncate flex-1 border-r border-gray-300 dark:border-gray-600 pr-2 text-sm px-2">
            <span className="text-gray-500 dark:text-gray-400 mr-2">#{submission.id}</span>
            {submission.problem_title}
          </div>
          <div className="text-left font-bold truncate flex-1 md:ml-2 text-sm px-2 text-gray-700 dark:text-gray-300">{submission.user_name}</div>
          <div className="text-left text-gray-600 dark:text-gray-400 truncate flex-1 text-sm px-2">{submission.created_at || submission.submitted_time}</div>
          <div className={`text-left font-bold px-3 py-2 rounded-md text-sm whitespace-normal break-words ${getStatusClass(submission.status)}`}>
            {submission.status}
          </div>
          <button
            className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline text-center text-sm w-full md:w-20 px-0 py-2"
            onClick={() => onDetails(submission)}
          >
            Details
          </button>
        </div>
      ))}
    </div>
  );
};

export default SubmissionsList;