// Centralized language configuration for the application
// Maps language IDs to their display names and editor/highlighter configs

// import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';

export const LANGUAGES = [
  // {
  //   id: 'py',
  //   label: 'Python',
  //   cmLanguage: python,
  //   prismLang: 'python',
  // },
  // {
  //   id: 'js',
  //   label: 'JavaScript',
  //   cmLanguage: javascript,
  //   prismLang: 'javascript',
  // },
  {
    id: 'cpp',
    label: 'C++',
    cmLanguage: cpp,
    prismLang: 'cpp',
  },
  {
    id: 'kt',
    label: 'Kotlin',
    cmLanguage: java, // Using Java mode as fallback for CodeMirror
    prismLang: 'kotlin',
  },
  {
    id: 'dart',
    label: 'Dart',
    cmLanguage: javascript, // Using JavaScript mode as fallback for CodeMirror
    prismLang: 'dart',
  },
];

// Helper functions
export const getLanguageById = (id) => {
  return LANGUAGES.find((lang) => lang.id === id);
};

export const getLanguageLabel = (id) => {
  const lang = getLanguageById(id);
  return lang ? lang.label : id;
};
