// src/repositories/ContestRepository.js

let contests = [
    {
      id: 1,
      title: "Contest 1",
      startTime: "2024-09-02 12:00",
      durations: null,
    },
    {
      id: 2,
      title: "Contest 2",
      startTime: "2024-09-10 10:00",
      durations: null,
    },
  ];
  
  let problems = [
    {
      id: 1,
      contestId: 1,
      tag: "A",
      title: "Problem 1",
      description: "Solve this DP problem...",
      testCases: [],
    },
    {
      id: 2,
      contestId: 1,
      tag: "B",
      title: "Problem 2",
      description: "Solve this graph problem...",
      testCases: [],
    },
    {
        id: 3,
        contestId: 1,
        tag: "c",
        title: "Problem 2",
        description: "Solve this DP problem...",
        testCases: [],
    },
    {
        id: 4,
        contestId: 1,
        tag: "d",
        title: "Problem 4",
        description: "Solve this graph problem...",
        testCases: [],
    }
  ];
  
  // Get all contests
  const FakeRepo = {
    getAllContests: () => {
      return contests;
    },
  
    // Get contest by ID
    getContestById: (id) => {
      const contest = contests.find((contest) => contest.id === id);
      if (contest) {
        const contestProblems = problems.filter((problem) => problem.contestId === id);
        return { ...contest, problems: contestProblems };
      }
      return null;
    },
  
    // Create a new contest
    createContest: (data) => {
      const newContest = {
        id: contests.length + 1,
        title: data.title,
        startTime: data.startTime,
        durations: data.durations,
      };
      contests.push(newContest);
      return newContest;
    },
  
    // Add a new problem to a contest
    addProblem: (data) => {
      const newProblem = {
        id: problems.length + 1,
        contestId: data.contestId,
        tag: data.tag,
        title: data.title,
        description: data.description,
        testCases: data.testCases || [],
      };
      problems.push(newProblem);
      return newProblem;
    },
  
    getProblemById: (id) => {
      const res = problems.find((problem) => problem.id === id);
      return res;
    },
  };

  export default FakeRepo
  