import toast from 'react-hot-toast';

/**
 * Feedback utility for consistent toast notifications
 * Uses generic messages only per decision 5/a
 */

export const notify = {
  success: (message, opts) => toast.success(message, opts),
  error: (message, opts) => toast.error(message, opts),
  info: (message, opts) => toast(message, opts),
  
  /**
   * Wraps a promise with loading, success, and error toast notifications
   * @param {Promise} promise - The promise to wrap
   * @param {Object} messages - Toast messages { loading, success, error }
   * @returns {Promise} - The original promise
   */
  promise: (promise, messages) => toast.promise(promise, messages),
};

/**
 * Optional error message normalization (for internal use/logging)
 * Per decision 5/a, we use generic messages in toasts
 * @param {Error} err - The error object
 * @returns {string} - A human-friendly error message
 */
export const getErrorMessage = (err) => {
  if (err.response?.data?.error) return err.response.data.error;
  if (err.response?.data?.message) return err.response.data.message;
  if (err.message) return err.message;
  return 'Something went wrong.';
};
