# Oto Judge Frontend - Quick Start Guide

This guide will help you get started with the newly improved Oto Judge frontend.

## Installation

```bash
cd /home/khayrul/Dev/web/oto-judge/client
npm install
```

## Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Project Structure

```
src/
├── components/
│   ├── auth/              # Login, Registration, Profile
│   ├── common/            # Reusable UI components
│   │   ├── StatusChip.jsx
│   │   ├── SkeletonList.jsx
│   │   ├── ErrorState.jsx
│   │   ├── Modal.jsx
│   │   ├── CodeHighlight.jsx
│   │   └── ConfirmDelete.jsx
│   ├── contests/          # Contest and problem pages
│   ├── submissions/       # Submit and view submissions
│   ├── standings/         # Leaderboard
│   ├── home/             # Home page
│   ├── Sidebar.jsx       # Main navigation
│   └── Guideline.jsx     # Guidelines page
├── contexts/
│   └── UserContext.jsx   # User authentication context
├── hooks/
│   ├── useTheme.js       # Dark mode management
│   └── useSSE.js         # Server-Sent Events with auto-reconnect
├── utils/
│   ├── languages.js      # Language configurations
│   ├── utils.js          # Utility functions
│   └── feedback.js       # Toast notifications
├── data/
│   └── Repo.js           # API repository
├── App.jsx               # Main app component
└── main.jsx              # Entry point
```

## Key Features

### 1. Code Submission with CodeMirror 6
- Syntax highlighting for Python, JavaScript, C++, and Kotlin
- Auto-save drafts to localStorage
- Keyboard shortcuts (Ctrl/Cmd+Enter to submit)
- Fullscreen and line-wrap modes
- Dark mode theme sync

### 2. Submissions Management
- Real-time updates via Server-Sent Events (SSE)
- Multi-dimensional filtering:
  - Status (PASS, WA, TLE, MLE, CE, RE, PENDING)
  - Language (Python, JavaScript, C++, Kotlin)
  - Problem
  - Time range (1h, 24h, 7d, All Time)
  - Text search
- Client-side sorting (Newest, Oldest, By Status)
- Detailed modal with tabs:
  - Verdict: Summary info
  - Logs: Error/compile logs (Markdown)
  - Code: Syntax-highlighted source with copy/download

### 3. Dark Mode
- System-aware with manual toggle
- Persisted to localStorage
- Applies to all components including editor and Markdown preview

### 4. Admin Features
- Markdown editor for problem statements with live preview
- CRUD operations for contests and problems

## Development Guidelines

### Adding a New Component

```jsx
import React from 'react';

const MyComponent = ({ prop1, prop2 }) => {
  return (
    <div className="p-4 bg-white dark:bg-gray-800">
      {/* Your component content */}
    </div>
  );
};

export default MyComponent;
```

### Using Dark Mode Classes

Always provide both light and dark mode styles:

```jsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

### Using the Language Config

```javascript
import { LANGUAGES, getLanguageById, getLanguageLabel } from '../utils/languages';

// Get all languages
const languages = LANGUAGES;

// Get specific language
const python = getLanguageById('py');
// { id: 'py', label: 'Python', cmLanguage: [Function], prismLang: 'python' }

// Get language label
const label = getLanguageLabel('cpp'); // 'C++'
```

### Using the Theme Hook

```jsx
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  
  return (
    <div data-color-mode={resolvedTheme}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Using the SSE Hook

```jsx
import { useSSE } from '../hooks/useSSE';

function MyComponent() {
  const { data, connected, reconnecting, error } = useSSE(
    '/api/some-endpoint',
    { enabled: true }
  );
  
  return (
    <div>
      {connected && <span>🟢 Live</span>}
      {reconnecting && <span>🟡 Reconnecting...</span>}
      {error && <span>🔴 Error</span>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### Using Toast Notifications

```javascript
import { notify } from '../utils/feedback';

// Success
notify.success('Operation successful!');

// Error
notify.error('Something went wrong.');

// Promise with loading state
await notify.promise(
  apiCall(),
  {
    loading: 'Processing...',
    success: 'Done!',
    error: 'Failed!',
  }
);
```

## Common Tasks

### Adding a New Language

1. Edit `src/utils/languages.js`
2. Import the CodeMirror language extension
3. Add entry to `LANGUAGES` array:

```javascript
import { kotlin } from '@codemirror/lang-kotlin'; // if available

export const LANGUAGES = [
  // ... existing languages
  {
    id: 'kt',
    label: 'Kotlin',
    cmLanguage: kotlin,
    prismLang: 'kotlin',
  },
];
```

### Styling Guidelines

- Use Tailwind CSS utility classes
- Always provide dark mode variants
- Use semantic color names (e.g., `text-gray-900 dark:text-white`)
- Maintain consistent spacing (p-4, mb-6, etc.)
- Use responsive classes (sm:, md:, lg:)

### State Management

- Use React Context for global state (user auth)
- Use useState for local component state
- Use useMemo for expensive computations (filtering, sorting)
- Use useCallback for event handlers passed as props

## Troubleshooting

### Dark mode not working
- Check if `darkMode: 'class'` is set in `tailwind.config.js`
- Verify `useTheme` hook is being used
- Check if dark mode classes are applied (e.g., `dark:bg-gray-800`)

### SSE connection issues
- Verify backend SSE endpoint is running
- Check browser console for EventSource errors
- Ensure auth token is present in localStorage

### CodeMirror not highlighting
- Verify language extension is imported in `languages.js`
- Check if `cmLanguage` function is being called correctly
- Ensure language prop is passed to editor

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check for any TypeScript/JSX syntax errors

## Testing

```bash
# Run tests (if configured)
npm test

# Lint code
npm run lint
```

## Useful Resources

- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Router Documentation](https://reactrouter.com/)
- [MDEditor Documentation](https://uiwjs.github.io/react-md-editor/)

## Support

For issues or questions, please refer to:
- `IMPLEMENTATION_SUMMARY.md` for detailed feature documentation
- `devdata/plan.md` for the original improvement plan
- `devdata/wireframe.md` for UX flow and wireframes

---

Happy coding! 🚀
