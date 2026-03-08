import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Error state component for displaying error messages with retry option
 * @param {Object} props
 * @param {string} props.message - Error message to display
 * @param {Function} props.onRetry - Callback function for retry action
 * @param {string} props.className - Additional CSS classes
 */
const ErrorState = ({ message = 'Something went wrong.', onRetry, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <ExclamationTriangleIcon className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
      <p className="text-gray-700 dark:text-gray-300 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
