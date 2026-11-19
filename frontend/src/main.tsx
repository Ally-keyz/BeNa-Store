import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Providers } from './app/Providers';
import { App } from './app/App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root was not found.');

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
