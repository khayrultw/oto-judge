
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
    if (cell.startsWith('+')) return 'text-green-600';
    if (cell.startsWith('-')) return 'text-red-600';
    return '';
  };

  // Only show users who have attempted at least one problem
  const filteredStandings = standings.filter(user =>
    user.problems && user.problems.some(p => p.status === '+' || p.status === '-')
  );

  return (
    <div className="overflow-x-auto w-full max-w-5xl mx-auto px-1 sm:px-2 lg:px-4">
      <table className="min-w-full bg-white border text-xs md:text-base">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="py-1 md:py-2 px-2 md:px-4 border text-xs md:text-base">Rank</th>
            <th className="py-1 md:py-2 px-2 md:px-4 border text-xs md:text-base">User</th>
            <th className="py-1 md:py-2 px-2 md:px-4 border text-xs md:text-base">Solved</th>
            <th className="py-1 md:py-2 px-2 md:px-4 border text-xs md:text-base">Penalty</th>
            {problemHeaders.map((header, idx) => (
              <th
                key={idx}
                className="py-1 md:py-2 px-2 md:px-4 border text-center min-w-[16px] md:min-w-[48px] text-xs md:text-base"
                style={{ textAlign: 'center', minWidth: 16 }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredStandings.map((user, idx) => (
            <tr key={user.user_id}>
              <td className="py-1 md:py-2 px-2 md:px-4 border-b text-xs md:text-base">{user.rank ?? idx + 1}</td>
              <td className="py-1 md:py-2 px-2 md:px-4 border-b text-xs md:text-base">{user.user_name}</td>
              <td className="py-1 md:py-2 px-2 md:px-4 border-b text-xs md:text-base">{user.solved}</td>
              <td className="py-1 md:py-2 px-2 md:px-4 border-b text-xs md:text-base">{user.penalty ?? 0}</td>
              {problemHeaders.map((_, pIdx) => {
                const cell = getProblemCell(user.problems, pIdx);
                return (
                  <td
                    key={pIdx}
                    className={`py-1 md:py-2 px-2 md:px-4 border-b text-center font-mono text-xs md:text-lg ${getVerdictClass(cell)}`}
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