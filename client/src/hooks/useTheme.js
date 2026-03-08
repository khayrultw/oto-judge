import { useEffect, useState } from 'react';

/**
 * Custom hook for managing dark mode preference
 * Supports 'light', 'dark', and 'system' modes
 */
export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    // Initialize from localStorage or default to 'system'
    return localStorage.getItem('theme') || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState('light');

  useEffect(() => {
    const updateTheme = () => {
      let effectiveTheme;

      if (theme === 'system') {
        // Check system preference
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      } else {
        effectiveTheme = theme;
      }

      setResolvedTheme(effectiveTheme);

      // Update DOM
      const root = document.documentElement;
      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setAndPersistTheme = (newTheme) => {
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  const toggleTheme = () => {
    // Cycle through: light -> dark -> light
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setAndPersistTheme(newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setAndPersistTheme,
    toggleTheme,
  };
};
