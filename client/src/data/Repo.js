import axios from 'axios';

export const BASE_URL = "/api"

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const key = "Fkj6yhsdkjfhsj"

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(key);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Submissions
export const submitCode = (problemId, payload) => api.post(`/submissions/${problemId}`, payload);
export const testRun = (payload) => api.post('/submissions/test-run', payload);
export const getSubmission = (id) => api.get(`/submissions/${id}`);
export const getMySubmissions = (params) => api.get('/submissions/my', { params });
export const getAllSubmissions = () => api.get('/submissions');

// Submissions (admin-only)
export const rejudgeSubmission = (id) => api.post(`/admin/submissions/${id}/rejudge`);
export const deleteSubmission = (id) => api.delete(`/admin/submissions/${id}`);
export const manualJudgeSubmission = (id, payload) => api.patch(`/admin/submissions/${id}/manual-judge`, payload);

// Contests (public)
export const getContests = (params) => api.get('/contests', { params });
export const getUpcomingContest = (params) => api.get("/contests/upcoming", { params });
export const getPastContests = (params) => api.get('/contests/past', { params });
export const getContest = (id) => api.get(`/contests/${id}`);
export const getStandings = (id, params) => api.get(`/contests/${id}/standings`, { params });
export const getContestSubmissions = (contestId, params) => api.get(`/contests/${contestId}/submissions`, { params });
export const getMyContestSubmissions = (contestId, params) => api.get(`/contests/${contestId}/submissions/my`, { params });

// Contests (admin-only)
export const createContest = (payload) => api.post('/admin/contests', payload);
export const updateContest = (id, payload) => api.put(`/admin/contests/${id}`, payload);
export const deleteContest = (id) => api.delete(`/admin/contests/${id}`);

// Problems (public)
export const getProblem = (id) => api.get(`/problem/${id}`);

// Problems (admin-only)
export const createProblem = (payload) => api.post('/admin/problems', payload);
export const updateProblem = (id, payload) => api.put(`/admin/problems/${id}`, payload);
export const deleteProblem = (id) => api.delete(`/admin/problems/${id}`);
export const getAdminContestProblems = (contestId) => api.get(`/admin/contests/${contestId}/problems`);

// Users (admin-only)
export const getUserStats = () => api.get('/admin/users/stats');
export const searchUsers = (params) => api.get('/admin/users/search', { params });
export const getUsers = (params) => api.get('/admin/users', { params });
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const createUser = (payload) => api.post('/admin/users', payload);
export const updateUser = (id, payload) => api.put(`/admin/users/${id}`, payload);
export const updateUserPassword = (id, payload) => api.put(`/admin/users/${id}/password`, payload);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const restoreUser = (id) => api.post(`/admin/users/${id}/restore`);

// Submissions (admin-only)
export const getAdminSubmissions = (params) => api.get('/admin/submissions', { params });

// Auth
export const register = (payload) => api.post('/register', payload);
export const login = async (payload) => {
  const res = await api.post('/login', payload);
  if (res.data.token) {
    localStorage.setItem(key, res.data.token);
  }
  return res;
};
export const getUser = () => api.get('/me');
export const logout = async () => {
  localStorage.removeItem(key);
  return api.get('/logout');
};

const Repo = {
  // Submissions
  submitCode,
  testRun,
  getSubmission,
  getMySubmissions,
  getAllSubmissions,
  // Submissions (admin-only)
  rejudgeSubmission,
  deleteSubmission,
  manualJudgeSubmission,
  getAdminSubmissions,
  // Contests (public)
  getContests,
  getUpcomingContest,
  getPastContests,
  getContest,
  getStandings,
  getContestSubmissions,
  getMyContestSubmissions,
  // Contests (admin-only)
  createContest,
  updateContest,
  deleteContest,
  // Problems (public)
  getProblem,
  // Problems (admin-only)
  createProblem,
  updateProblem,
  deleteProblem,
  getAdminContestProblems,
  // Users (admin-only)
  getUserStats,
  searchUsers,
  getUsers,
  getAdminUser,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  restoreUser,
  // Auth
  register,
  login,
  getUser,
  logout,
};

export default Repo; 
