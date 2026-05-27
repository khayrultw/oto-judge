import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

/**
 * Shared anti-AI policy banner.
 * showGuidelineLink – when true, shows a separate "Submission Guidelines" button above the banner.
 */
const AIPolicyBanner = ({ showGuidelineLink = false, className = '' }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {showGuidelineLink && (
      <div>
        <Link
          to="/guidelines"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 dark:border-blue-700/50 dark:hover:bg-blue-900/50 transition-colors"
        >
          <BookOpenIcon className="h-4 w-4" />
          Submission Guidelines
        </Link>
      </div>
    )}
    <div className="flex items-start gap-2.5 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/70 dark:bg-amber-900/25 dark:text-amber-100">
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
      <p className="text-sm font-medium leading-snug">
        <span className="font-bold">No AI tools allowed.</span>{' '}
        Use of generative AI (ChatGPT, Claude, DeepSeek, etc.) is strictly prohibited. You may only browse programming language documentation.
      </p>
    </div>
  </div>
);

export default AIPolicyBanner;
