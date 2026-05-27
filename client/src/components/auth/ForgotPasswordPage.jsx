import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import repo from '../../data/Repo';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await repo.requestPasswordReset({ email });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-xs w-full">
        <h2 className="text-lg font-bold mb-1 text-center text-gray-900 dark:text-white">Forgot Password</h2>

        {submitted ? (
          <div className="text-center">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              A reset token has been created. Please contact an admin (e.g. via Discord or email) to receive your token.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Once you have the token, use the link below to set your new password.
            </p>
            <Link
              to="/reset-password"
              className="block w-full text-center bg-blue-500 text-white py-1.5 rounded text-sm hover:bg-blue-600 transition mb-3"
            >
              Enter Reset Token
            </Link>
            <Link to="/login" className="text-xs text-blue-500 dark:text-blue-400 hover:underline">
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 text-center">
              Enter your email. An admin will be notified and can share your reset token with you.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1 text-gray-900 dark:text-white" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring focus:ring-blue-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <div className="mb-3 text-red-500 dark:text-red-400 text-center text-xs">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-1.5 rounded text-sm hover:bg-blue-600 transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Request Reset'}
              </button>
            </form>
            <p className="mt-3 text-center text-xs text-gray-900 dark:text-white">
              <Link to="/login" className="text-blue-500 dark:text-blue-400 hover:underline">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
