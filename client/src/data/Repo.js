import axios from 'axios';

export const BASE_URL = "/api"

const api = axios.create({
  baseURL: BASE_URL,
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
export const getSubmission = (id) => api.get(`/submissions/${id}`);
export const getMySubmissions = (params) => api.get('/submissions/my', { params });
export const getAllSubmissions = () => api.get('/submissions');

// Contests
export const createContest = (payload) => api.post('/contests', payload);
export const getContest = (id) => api.get(`/contests/${id}`);
export const updateContest = (id, payload) => api.put(`/contests/${id}`, payload);
export const getContests = () => api.get('/contests');
export const getUpCommingContest = () => api.get("/contests/upcomming")
export const deleteContest = (id) => api.delete(`/contests/${id}`);
export const getStandings = (id) => api.get(`/contests/${id}/standings`)
export const getContestSubmissions = (contestId, params) => api.get(`/contests/${contestId}/submissions`, { params });
export const getMyContestSubmissions = (contestId, params) => api.get(`/contests/${contestId}/submissions/my`, { params });


// Problems
export const createProblem = (payload) => api.post('/problem', payload);
export const getProblem = (id) => api.get(`/problem/${id}`);
export const updateProblem = (id, payload) => api.put(`/problem/${id}`, payload);
export const deleteProblem = (id) => api.delete(`/problem/${id}`);

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
export const logout = () => api.get('/logout');

const Repo = {
  // Submissions
  submitCode,
  getSubmission,
  getMySubmissions,
  getAllSubmissions,
  // Contests
  createContest,
  getContest,
  updateContest,
  getContests,
  getUpCommingContest,
  deleteContest,
  getContestSubmissions,
  getMyContestSubmissions,
  // Problems
  createProblem,
  getProblem,
  updateProblem,
  deleteProblem,

  getStandings,
  // Auth
  register,
  login,
  getUser,
  logout,
};

export default Repo; 
