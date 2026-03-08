
const StandingsTable = ({ standings }) => {
  // Find the max problem number to determine columns
  const maxProblemNumber = Math.max(
    ...standings.flatMap(user => user.problems.map(p => p.problem_number))
  );

  // Generate problem column headers
  const problemHeaders = Array.from({ length: maxProblemNumber + 1 }, (_, i) => (i + 1).toString());

  // Helper to get problem status for a user
  const getProblemCell = (problems, problemIdx) => {
    const prob = problems.find(p => p.problem_number === problemIdx);
    if (!prob) return '';
    if (prob.status === '+') {
      return prob.count > 1 ? `+${prob.count}` : '+';
    } else if (prob.count > 0) {
      return prob.count > 1 ? `-${prob.count}` : '-';
    }
    return '';
  };

  // Helper to get color class for verdict
  const getVerdictClass = (cell) => {
    if (cell.startsWith('+')) return 'text-green-600 dark:text-green-400';
    if (cell.startsWith('-')) return 'text-red-600 dark:text-red-400';
    return '';
  };

  // Only show users who have attempted at least one problem
  const filteredStandings = standings.filter(user =>
    user.problems && user.problems.some(p => p.status === '+' || p.status === '-')
  );

  return (
    <div className="overflow-x-auto w-full max-w-5xl mx-auto px-1 sm:px-2 lg:px-4">
      <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs md:text-base">
        <thead>
          <tr className="bg-gray-200 dark:bg-gray-700 text-left">
            <th className="py-1 md:py-2 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-xs md:text-base text-gray-900 dark:text-white">Rank</th>
            <th className="py-1 md:py-2 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-xs md:text-base text-gray-900 dark:text-white">User</th>
            <th className="py-1 md:py-2 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-xs md:text-base text-gray-900 dark:text-white">Solved</th>
            <th className="py-1 md:py-2 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-xs md:text-base text-gray-900 dark:text-white">Penalty</th>
            {problemHeaders.map((header, idx) => (
              <th
                key={idx}
                className="py-1 md:py-2 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-center min-w-[16px] md:min-w-[48px] text-xs md:text-base text-gray-900 dark:text-white"
                style={{ textAlign: 'center', minWidth: 16 }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredStandings.map((user, idx) => (
            <tr key={user.user_id} className="text-gray-900 dark:text-white">
              <td className="py-1 md:py-2 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-xs md:text-base">{user.rank ?? idx + 1}</td>
              <td className="py-1 md:py-2 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-xs md:text-base">{user.user_name}</td>
              <td className="py-1 md:py-2 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-xs md:text-base">{user.solved}</td>
              <td className="py-1 md:py-2 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-xs md:text-base">{user.penalty ?? 0}</td>
              {problemHeaders.map((_, pIdx) => {
                const cell = getProblemCell(user.problems, pIdx);
                return (
                  <td
                    key={pIdx}
                    className={`py-1 md:py-2 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-center font-mono text-xs md:text-lg ${getVerdictClass(cell)}`}
                    style={{ textAlign: 'center', fontFamily: 'monospace', minWidth: 16 }}
                  >
                    <b>{cell}</b>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StandingsTable; 