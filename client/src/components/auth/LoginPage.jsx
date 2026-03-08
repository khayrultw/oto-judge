import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import repo from '../../data/Repo';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { updateUser } = useUser();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await repo.login(
        { email, password }
      );
      const data = response.data;
      // Set user context with id, name, email, role from backend response
      if (data.id && data.name && data.email && data.role) {
        updateUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
        });
      }

      navigate("/");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-xs w-full">
        <h2 className="text-lg font-bold mb-4 text-center text-gray-900 dark:text-white">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring focus:ring-blue-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring focus:ring-blue-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="mb-3 text-red-500 dark:text-red-400 text-center text-xs">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-1.5 rounded text-sm hover:bg-blue-600 transition"
          >
            Login
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-gray-900 dark:text-white">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-500 dark:text-blue-400 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
