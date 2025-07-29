const SubmissionsList = ({ submissions = [], loading, error, onDetails }) => {
  if (loading) return <div className="text-center text-gray-500">Loading...</div>;
  if (error) return <div className="text-center text-red-500">{error}</div>;
  if (!submissions?.length) return <div className="text-center text-gray-500">No submissions found.</div>;
  return (
    <div>
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="flex flex-col md:flex-row md:items-center bg-gray-200 p-4 mb-2 rounded-md max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 text-sm gap-x-2"
        >
          <div className="text-left font-bold truncate flex-1 border-r border-gray-300 pr-2 text-sm px-2">
            <span className="text-gray-400 mr-2">#{submission.id}</span>
            {submission.problem_title}
          </div>
          <div className="text-left font-bold truncate flex-1 md:ml-2 text-sm px-2">{submission.user_name}</div>
          <div className="text-left text-gray-500 truncate flex-1 text-sm px-2">{submission.created_at || submission.submitted_time}</div>
          <div className={`text-left font-bold min-w-[8rem] text-sm px-2 ${submission.status === 'PASS' ? 'text-green-500' : 'text-red-500'}`}>{submission.status}</div>
          <button
            className="text-blue-500 underline text-center text-sm w-full md:w-20 px-0 py-0"
            style={{minWidth: 0}}
            onClick={() => onDetails(submission)}
          >
            Details
          </button>
        </div>
      ))}
    </div>
  );
}

export default SubmissionsList;