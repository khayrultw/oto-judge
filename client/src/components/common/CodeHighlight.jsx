import React, { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { ClipboardIcon, ClipboardDocumentCheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';
import { getLanguageById } from '../../utils/languages';

/**
 * Code highlighter component with copy and download functionality
 * @param {Object} props
 * @param {string} props.code - Code to highlight
 * @param {string} props.language - Language ID (py, js, cpp, kt)
 * @param {string} props.filename - Optional filename for download
 */
const CodeHighlight = ({ code, language, filename = 'code.txt' }) => {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const lang = getLanguageById(language);
  const prismLang = lang?.prismLang || 'text';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button
          onClick={handleCopy}
          className="p-2 bg-gray-700 dark:bg-gray-600 text-white rounded-md hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <ClipboardDocumentCheckIcon className="h-4 w-4" />
          ) : (
            <ClipboardIcon className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={handleDownload}
          className="p-2 bg-gray-700 dark:bg-gray-600 text-white rounded-md hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
          title="Download code"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Code */}
      <Highlight
        theme={resolvedTheme === 'dark' ? themes.vsDark : themes.github}
        code={code}
        language={prismLang}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} p-4 rounded-md overflow-auto text-sm max-h-[60vh]`}
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="inline-block w-8 text-right mr-4 text-gray-500 select-none">
                  {i + 1}
                </span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

export default CodeHighlight;
