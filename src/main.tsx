import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/explicitLogout';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import './styles/globals.css';
import './styles/reset.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
