import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Fuentes autoalojadas (sin CDN): la CSP solo permite recursos propios.
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource-variable/source-sans-3/index.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
