import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import CodeMirror from '@uiw/react-codemirror';
import repo from '../../data/Repo';
import { LANGUAGES, getLanguageById } from '../../utils/languages';
import { useTheme } from '../../hooks/useTheme';
import { notify } from '../../utils/feedback';
import Modal from '../common/Modal';

function ProblemDetailsPage() {
  const { id, problemId, contestId } = useParams();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  
  // Problem states
  const [problem, setProblem] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Code editor states
  const [language, setLanguage] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const initialLoadRef = useRef(true);
  
  // Test run states
  const [testInput, setTestInput] = useState('');
  const [testRunning, setTestRunning] = useState(false);
  const [testResultModalOpen, setTestResultModalOpen] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const effectiveProblemId = problemId || id;
  const effectiveContestId = contestId || problem?.contest_id;

  // Fetch problem
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await repo.getProblem(effectiveProblemId);
        setProblem(res.data);
        setError('');
      } catch (err) {
        setProblem(null);
        if (err.response && err.response.status === 403) {
          setError('Problem will be available at contest start.');
        } else {
          setError('Failed to load problem.');
        }
      } finally {
        setLoading(false);
      }
    };
    if (effectiveProblemId) {
      fetchProblem();
    }
  }, [effectiveProblemId]);

  // Load saved language and draft code
  useEffect(() => {
    if (!effectiveProblemId || !problem || Object.keys(problem).length === 0) return;

    const savedLang = localStorage.getItem(`lastLang:${effectiveProblemId}`) || 'py';
    setLanguage(savedLang);

    const draftKey = `submitDraft:${effectiveProblemId}:${savedLang}`;
    const savedCode = localStorage.getItem(draftKey) || '';
    setCode(savedCode);

    initialLoadRef.current = false;
  }, [effectiveProblemId, problem]);

  // Save draft when code changes
  useEffect(() => {
    if (!effectiveProblemId || !language || initialLoadRef.current) return;

    const draftKey = `submitDraft:${effectiveProblemId}:${language}`;
    localStorage.setItem(draftKey, code);
    setHasUnsavedChanges(code.trim().length > 0);
  }, [code, effectiveProblemId, language]);

  // Handle language change
  const handleLanguageChange = (event) => {
    const newLang = event.target.value;
    
    if (!effectiveProblemId) {
      setLanguage(newLang);
      return;
    }

    localStorage.setItem(`lastLang:${effectiveProblemId}`, newLang);

    const draftKey = `submitDraft:${effectiveProblemId}:${newLang}`;
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
    event?.preventDefault();
    if (!language || !code.trim()) return;

    setSubmitting(true);
    try {
      await repo.submitCode(effectiveProblemId, {
        language,
        source_code: code,
      });

      const draftKey = `submitDraft:${effectiveProblemId}:${language}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);

      notify.success('Code submitted successfully!');
      navigate(`/contest/${effectiveContestId}/submissions/my`, { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit code. Please try again.';
      notify.error(errorMsg);
    } finally {
      setSubmitting(false);
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
        expected_output: '',
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
        if (language && code.trim() && !submitting) {
          handleSubmit(event);
        }
      }
    },
    [language, code, submitting]
  );

  const handleBack = () => {
    if (effectiveContestId) {
      navigate(`/viewcontest/${effectiveContestId}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading problem...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!problem || Object.keys(problem).length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center text-xl text-red-600 dark:text-red-400">
          Problem does not exist.
        </div>
      </div>
    );
  }

  const problemLetter = problem.problem_number !== undefined 
    ? String.fromCharCode(65 + problem.problem_number) 
    : '';

  const selectedLang = getLanguageById(language);
  const isSubmitDisabled = !language || !code.trim() || submitting;

  return (
    <div className="fixed inset-0 ml-14 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shrink-0 text-xs"
              title="Back to contest"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {problemLetter && `${problemLetter}. `}
              {problem.title}
            </h1>
            {problem.is_special && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                Special
              </span>
            )}
          </div>
          
          {/* Action buttons and Language selector */}
          <div className="flex items-center gap-2 shrink-0">
            {hasUnsavedChanges && (
              <span className="hidden md:inline text-[10px] text-amber-600 dark:text-amber-400">● Unsaved</span>
            )}
            <button
              type="button"
              onClick={handleTestRun}
              disabled={testRunning || !language || !code.trim()}
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PlayIcon className="h-3.5 w-3.5" />
              {testRunning ? 'Running...' : 'Test'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="h-3.5 w-3.5" />
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
            >
              <option value="">Language</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main content - Split view */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Problem Description and Input */}
        <div className="lg:w-1/2 overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-2">
          {/* Problem Statement */}
          <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-3 mb-2">
            {problem.is_special && (
              <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-200">
                Special judge: passing solutions will be queued for manual review.
              </div>
            )}
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
              Problem Statement
            </h2>
            {problem.statement ? (
              <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed text-xs">
                {problem.statement}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 py-2 text-center text-xs">
                No statement available.
              </div>
            )}
          </div>
          
          {/* Input textbox */}
          <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Input
            </label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter test input..."
              className="w-full h-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-xs resize-none"
            />
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="lg:w-1/2 flex flex-col overflow-hidden">
          {/* Code Editor */}
          <div className="flex-1 overflow-hidden p-2 pb-0">
            <div className="h-full border border-gray-300 dark:border-gray-600 rounded overflow-hidden bg-white dark:bg-gray-800">
              <CodeMirror
                value={code}
                height="100%"
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                extensions={selectedLang?.cmLanguage ? [selectedLang.cmLanguage()] : []}
                onChange={(value) => setCode(value)}
                onKeyDown={handleKeyDown}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                  lineWrapping: true,
                }}
                className="h-full text-xs [&_.cm-editor]:!h-full [&_.cm-scroller]:!overflow-auto"
              />
            </div>
          </div>
          
          {/* Keyboard shortcut hint */}
          <div className="flex-shrink-0 p-2">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Ctrl+Enter to submit
            </p>
          </div>
        </div>
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
            {testResult.message && (
              <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Message:</span>
                <p className="mt-1 text-gray-600 dark:text-gray-400">{testResult.message}</p>
              </div>
            )}

            <div>
              <span className="font-semibold text-gray-700 dark:text-gray-300">Output:</span>
              <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-40 whitespace-pre-wrap">
                {testResult.output || '(No output)'}
              </pre>
            </div>

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

export default ProblemDetailsPage;
