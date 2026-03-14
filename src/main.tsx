import React from 'react';
import ReactDOM from 'react-dom/client';
import { AgenticApp } from './components/AgenticApp';
import './styles.css';
import './styles-dashboard.css';
import './styles-charts.css';
import './styles-tabs.css';
import './styles-priya.css';
import './styles-agentic.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AgenticApp />
  </React.StrictMode>
);
