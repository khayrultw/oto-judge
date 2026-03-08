import React from 'react';

/**
 * Status chip component for displaying submission statuses
 * @param {Object} props
 * @param {string} props.status - Status code (PASS, WA, TLE, MLE, CE, RE, etc.)
 * @param {string} props.className - Additional CSS classes
 */
const StatusChip = ({ status, className = '' }) => {
  const getStatusConfig = () => {
    const statusUpper = status?.toUpperCase();
    
    // Green for pass only
    if (statusUpper === 'PASS' || statusUpper === 'AC' || statusUpper === 'ACCEPTED') {
      return {
        label: 'PASS',
        bgLight: '#dcfce7',
        textLight: '#166534',
        bgDark: '#14532d',
        textDark: '#bbf7d0'
      };
    }
    
    // Determine label for all other statuses
    let label = status || 'N/A';
    if (statusUpper === 'WA' || statusUpper === 'WRONG_ANSWER') label = 'WA';
    else if (statusUpper === 'TLE' || statusUpper === 'TIME_LIMIT') label = 'TLE';
    else if (statusUpper === 'MLE' || statusUpper === 'MEMORY_LIMIT') label = 'MLE';
    else if (statusUpper === 'CE' || statusUpper === 'COMPILE_ERROR') label = 'CE';
    else if (statusUpper === 'RE' || statusUpper === 'RUNTIME_ERROR') label = 'RE';
    else if (statusUpper === 'PENDING') label = 'PENDING';
    else if (statusUpper === 'WAITING' || statusUpper === 'PENDING_CODE_REVIEW') label = 'Pending Code Review';
    else if (statusUpper === 'JUDGING') label = 'JUDGING';
    else if (statusUpper === 'IN_QUEUE') label = 'IN QUEUE';

    if (statusUpper === 'WAITING' || statusUpper === 'PENDING_CODE_REVIEW' || statusUpper === 'PENDING' || statusUpper === 'JUDGING' || statusUpper === 'IN_QUEUE') {
      return {
        label,
        bgLight: '#fef3c7',
        textLight: '#92400e',
        bgDark: '#78350f',
        textDark: '#fde68a'
      };
    }

    // Red for all other cases (everything except PASS)
    return {
      label,
      bgLight: '#fee2e2',
      textLight: '#b91c1c',
      bgDark: '#7f1d1d',
      textDark: '#fecaca'
    };
  };

  const config = getStatusConfig();
  const isDark = document.documentElement.classList.contains('dark');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: isDark ? config.bgDark : config.bgLight,
        color: isDark ? config.textDark : config.textLight
      }}
    >
      {config.label}
    </span>
  );
};

export default StatusChip;
