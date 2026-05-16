import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlayIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import CodeMirror from '@uiw/react-codemirror';
import repo from '../../data/Repo';
import { LANGUAGES, getLanguageById } from '../../utils/languages';
import { useTheme } from '../../hooks/useTheme';
import { notify } from '../../utils/feedback';
import Modal from '../common/Modal';

const ACTION_COOLDOWN_SECONDS = 5;

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
  const [actionCooldownLeft, setActionCooldownLeft] = useState(0);
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.innerWidth < 1024);

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

  useEffect(() => {
    if (actionCooldownLeft <= 0) return;
    const timer = setInterval(() => {
      setActionCooldownLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [actionCooldownLeft]);

  useEffect(() => {
    const onResize = () => setIsMobileLayout(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startActionCooldown = (seconds = ACTION_COOLDOWN_SECONDS) => {
    setActionCooldownLeft((prev) => Math.max(prev, seconds));
  };

  const applyRetryCooldown = (err) => {
    const retryAfter = Number(err?.response?.data?.retry_after_seconds);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      startActionCooldown(Math.ceil(retryAfter));
    }
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!language || !code.trim() || actionCooldownLeft > 0) return;

    startActionCooldown();
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
      applyRetryCooldown(err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit code. Please try again.';
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
    if (actionCooldownLeft > 0) return;

    startActionCooldown();
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
      applyRetryCooldown(err);
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
        if (language && code.trim() && !submitting && actionCooldownLeft === 0) {
          handleSubmit(event);
        }
      }
    },
    [language, code, submitting, actionCooldownLeft]
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
  const isActionCoolingDown = actionCooldownLeft > 0;
  const isSubmitDisabled = !language || !code.trim() || submitting || isActionCoolingDown;
  const editorHeight = isMobileLayout ? '48vh' : '100%';

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-gray-50 dark:bg-gray-900 text-sm">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-1.5 p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0 text-sm"
              title="Back to contest"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {problemLetter && `${problemLetter}. `}
              {problem.title}
            </h1>
            {problem.is_special && (
              <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 shrink-0">
                Special
              </span>
            )}
          </div>
          
          {/* Action buttons and Language selector */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:justify-end">
            {hasUnsavedChanges && (
              <span className="hidden md:inline text-sm text-amber-600 dark:text-amber-400">● Unsaved</span>
            )}
            {isActionCoolingDown && (
              <span className="hidden md:inline text-sm text-red-600 dark:text-red-400">Cooldown: {actionCooldownLeft}s</span>
            )}
            <button
              type="button"
              onClick={handleTestRun}
              disabled={testRunning || !language || !code.trim() || isActionCoolingDown}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-gray-600 text-white rounded text-xs sm:text-sm hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PlayIcon className="h-4 w-4" />
              {testRunning ? 'Running...' : isActionCoolingDown ? `Wait ${actionCooldownLeft}s` : 'Test'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {submitting ? 'Submitting...' : isActionCoolingDown ? `Wait ${actionCooldownLeft}s` : 'Submit'}
            </button>
            <select
              value={language}
              onChange={handleLanguageChange}
              className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Left Panel - Problem Description and Input */}
        <div className="lg:w-1/2 overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 p-3 min-h-[36vh] lg:min-h-0">
          {/* Problem Statement */}
          <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-4 mb-3">
            {problem.is_special && (
              <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-amber-200">
                Special judge: passing solutions will be queued for manual review.
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Problem Statement
            </h2>
            {problem.statement ? (
              <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 leading-relaxed text-base">
                {problem.statement}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 py-3 text-center text-sm">
                No statement available.
              </div>
            )}
          </div>
          
          {/* Input textbox */}
          <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Input
            </label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter test input..."
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none"
            />
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="lg:w-1/2 flex flex-col min-h-[48vh] lg:min-h-0">
          {/* Code Editor */}
          <div className="flex-1 min-h-[42vh] overflow-hidden p-3 pb-0">
            <div className="h-full border border-gray-300 dark:border-gray-600 rounded overflow-hidden bg-white dark:bg-gray-800">
              <CodeMirror
                value={code}
                height={editorHeight}
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
                className="h-full text-sm [&_.cm-editor]:!h-full [&_.cm-scroller]:!overflow-auto [&_.cm-editor]:!min-h-[48vh] lg:[&_.cm-editor]:!min-h-0"
              />
            </div>
          </div>
          
          {/* Keyboard shortcut hint */}
          <div className="flex-shrink-0 p-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
