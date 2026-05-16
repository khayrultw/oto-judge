
const StandingsTable = ({ standings }) => {
  // Find the max problem number to determine columns
  const maxProblemNumber = standings.length
    ? Math.max(
        ...standings.flatMap((user) => (user.problems || []).map((p) => p.problem_number))
      )
    : -1;

  // Generate problem column headers
  const problemHeaders =
    maxProblemNumber >= 0
      ? Array.from({ length: maxProblemNumber + 1 }, (_, i) => (i + 1).toString())
      : [];

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
    <div className="w-full max-w-5xl mx-auto px-1 sm:px-2 lg:px-4">
      <div className="sm:hidden space-y-2">
        {filteredStandings.map((user, idx) => (
          <div key={user.user_id} className="rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
            <div className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 mb-1">
              <span>#{user.rank ?? idx + 1}</span>
              <span>Solved: {user.solved}</span>
              <span>Time: {user.penalty ?? 0}</span>
            </div>
            <div className="font-semibold text-sm text-gray-900 dark:text-white mb-2 break-words">{user.user_name}</div>
            <div className="grid grid-cols-4 gap-1 text-xs font-mono">
              {problemHeaders.map((header, pIdx) => {
                const cell = getProblemCell(user.problems || [], pIdx);
                return (
                  <div key={pIdx} className="rounded border border-gray-200 dark:border-gray-700 px-1.5 py-1 text-center">
                    <div className="text-gray-500 dark:text-gray-400">{header}</div>
                    <div className={getVerdictClass(cell)}>{cell || '-'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-[720px] w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm md:text-base">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700 text-left">
              <th className="py-2 md:py-3 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-sm md:text-base text-gray-900 dark:text-white">Rank</th>
              <th className="py-2 md:py-3 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-sm md:text-base text-gray-900 dark:text-white">User</th>
              <th className="py-2 md:py-3 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-sm md:text-base text-gray-900 dark:text-white">Solved</th>
              <th className="py-2 md:py-3 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-sm md:text-base text-gray-900 dark:text-white">Time</th>
              {problemHeaders.map((header, idx) => (
                <th
                  key={idx}
                  className="py-2 md:py-3 px-2 md:px-4 border border-gray-300 dark:border-gray-600 text-center min-w-[32px] md:min-w-[48px] text-sm md:text-base text-gray-900 dark:text-white"
                  style={{ textAlign: 'center', minWidth: 32 }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStandings.map((user, idx) => (
              <tr key={user.user_id} className="text-gray-900 dark:text-white">
                <td className="py-2 md:py-3 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-sm md:text-base">{user.rank ?? idx + 1}</td>
                <td className="py-2 md:py-3 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-sm md:text-base">{user.user_name}</td>
                <td className="py-2 md:py-3 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-sm md:text-base">{user.solved}</td>
                <td className="py-2 md:py-3 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-sm md:text-base">{user.penalty ?? 0}</td>
                {problemHeaders.map((_, pIdx) => {
                  const cell = getProblemCell(user.problems || [], pIdx);
                  return (
                    <td
                      key={pIdx}
                      className={`py-2 md:py-3 px-2 md:px-4 border-b border-gray-300 dark:border-gray-600 text-center font-mono text-sm md:text-lg ${getVerdictClass(cell)}`}
                      style={{ textAlign: 'center', fontFamily: 'monospace', minWidth: 32 }}
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
    </div>
  );
};

export default StandingsTable; 