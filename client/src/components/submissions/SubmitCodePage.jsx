import React, { useState, useEffect, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import repo from '../../data/Repo';
import { LANGUAGES, getLanguageById } from '../../utils/languages';
import { useTheme } from '../../hooks/useTheme';
import { notify } from '../../utils/feedback';
import Modal from '../common/Modal';

function SubmitCodePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const problemId = location.state?.problemId;
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wrapLines, setWrapLines] = useState(true);
  const { resolvedTheme } = useTheme();
  const initialLoadRef = useRef(true);

  // Test run states
  const [testInput, setTestInput] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [testRunning, setTestRunning] = useState(false);
  const [testResultModalOpen, setTestResultModalOpen] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Load problem data
  useEffect(() => {
    if (!problemId) return;
    const fetchProblem = async () => {
      try {
        const res = await repo.getProblem(problemId);
        setProblem(res.data);
      } catch (err) {
        setProblem(null);
      }
    };
    fetchProblem();
  }, [problemId]);

  // Load saved language and draft code
  useEffect(() => {
    if (!problemId || !problem) return;

    // Load last used language for this problem
    const savedLang = localStorage.getItem(`lastLang:${problemId}`) || 'py';
    setLanguage(savedLang);

    // Load draft code for this problem+language
    const draftKey = `submitDraft:${problemId}:${savedLang}`;
    const savedCode = localStorage.getItem(draftKey) || '';
    setCode(savedCode);

    initialLoadRef.current = false;
  }, [problemId, problem]);

  // Save draft when code changes
  useEffect(() => {
    if (!problemId || !language || initialLoadRef.current) return;

    const draftKey = `submitDraft:${problemId}:${language}`;
    localStorage.setItem(draftKey, code);
    setHasUnsavedChanges(code.trim().length > 0);
  }, [code, problemId, language]);

  // Handle language change
  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    
    if (!problemId) {
      setLanguage(newLang);
      return;
    }

    // Save current language preference
    localStorage.setItem(`lastLang:${problemId}`, newLang);

    // Load draft for new language
    const draftKey = `submitDraft:${problemId}:${newLang}`;
    const savedCode = localStorage.getItem(draftKey) || '';
    
    setLanguage(newLang);
    setCode(savedCode);
  };

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!language || !code.trim()) return;

    setLoading(true);
    try {
      await repo.submitCode(problemId, {
        language,
        source_code: code,
      });

      // Clear draft after successful submission
      const draftKey = `submitDraft:${problemId}:${language}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);

      // Show success toast and navigate
      notify.success('Code submitted successfully!');
      navigate(`/contest/${problem.contest_id}/submissions/my`, { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit code. Please try again.';
      notify.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle test run
  const handleTestRun = async () => {
    if (!language || !code.trim()) {
      notify.error('Please select a language and enter your code');
      return;
    }

    setTestRunning(true);
    try {
      const res = await repo.testRun({
        source_code: code,
        language,
        input: testInput,
        expected_output: expectedOutput,
      });
      setTestResult(res.data);
      setTestResultModalOpen(true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to run test. Please try again.';
      notify.error(errorMsg);
    } finally {
      setTestRunning(false);
    }
  };

  // Handle Ctrl/Cmd+Enter to submit
  const handleKeyDown = useCallback(
    (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (language && code.trim() && !loading) {
          handleSubmit(event);
        }
      }
    },
    [language, code, loading]
  );

  const goBack = () => {
    navigate(`/contest/${problem.contest_id}/problem/${problemId}`);
  };

  if (!problemId) {
    return <div className="text-center text-red-600 dark:text-red-400 mt-10">No problem selected for submission.</div>;
  }
  if (!problem) {
    return <div className="text-center text-gray-600 dark:text-gray-400 mt-10">Loading problem...</div>;
  }

  const selectedLang = getLanguageById(language);
  const isSubmitDisabled = !language || !code.trim() || loading;

  return (
    <div className={`flex justify-center p-4 overflow-x-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto' : ''}`}>
      <div className="w-full max-w-6xl min-w-0">
        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <button
            onClick={goBack}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Problem</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
            Submit Code — {problem.title}
          </h1>
        </div>

        {problem.is_special && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-200">
            Special judge problem: passing submissions will be queued for manual review.
          </div>
        )}

        {/* Editor Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-4">
              <label htmlFor="language" className="font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                Language:
              </label>
              <select
                id="language"
                value={language}
                onChange={handleLanguageChange}
                className="px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              >
                <option value="">Select language</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {loading ? 'Submitting...' : 'Submit Code'}
              </button>
              <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={wrapLines}
                  onChange={(e) => setWrapLines(e.target.checked)}
                  className="rounded"
                />
                Wrap
              </label>
              <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isFullscreen}
                  onChange={(e) => setIsFullscreen(e.target.checked)}
                  className="rounded"
                />
                Fullscreen
              </label>
            </div>
          </div>

          {/* Code Editor and Test Case Panel */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Code Editor */}
            <div className="flex-1 min-w-0 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <CodeMirror
                value={code}
                height={isFullscreen ? 'calc(100vh - 250px)' : '400px'}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                extensions={selectedLang?.cmLanguage ? [selectedLang.cmLanguage()] : []}
                onChange={(value) => setCode(value)}
                onKeyDown={handleKeyDown}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                  lineWrapping: wrapLines,
                }}
                className="text-sm [&_.cm-editor]:!max-w-full [&_.cm-scroller]:!overflow-x-auto"
              />
            </div>

            {/* Test Case Panel */}
            <div className="w-full lg:w-80 lg:shrink-0 flex flex-col gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Custom Test Case</h3>
                
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Input
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter test input..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none"
                />
                
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 mt-3">
                  Expected Output (optional)
                </label>
                <textarea
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="Enter expected output..."
                  className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none"
                />
                
                <button
                  type="button"
                  onClick={handleTestRun}
                  disabled={testRunning || !language || !code.trim()}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <PlayIcon className="h-5 w-5" />
                  {testRunning ? 'Running...' : 'Test Run'}
                </button>
              </div>
            </div>
          </div>

          {/* Status and Hint */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {hasUnsavedChanges && <span className="text-amber-600 dark:text-amber-400">● Unsaved changes</span>}
              {!hasUnsavedChanges && code.trim() && <span className="text-green-600 dark:text-green-400">✓ Draft saved</span>}
            </p>
          </div>
        </form>
      </div>

      {/* Test Result Modal */}
      <Modal
        isOpen={testResultModalOpen}
        onClose={() => setTestResultModalOpen(false)}
        title="Test Run Result"
        size="md"
      >
        {testResult && (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  testResult.passed
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                }`}
              >
                {testResult.status}
              </span>
            </div>

            {/* Message */}
            {testResult.message && (
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Message:</span>
                <p className="mt-1 text-gray-600 dark:text-gray-400">{testResult.message}</p>
              </div>
            )}

            {/* Output */}
            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Output:</span>
              <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-40 whitespace-pre-wrap">
                {testResult.output || '(No output)'}
              </pre>
            </div>

            {/* Expected Output (if provided) */}
            {testResult.expected_output && (
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Expected Output:</span>
                <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-40 whitespace-pre-wrap">
                  {testResult.expected_output}
                </pre>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTestResultModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SubmitCodePage;
