import React, { useState, useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { checkHealth } from './services/api';
import EpicTreeView from './components/EpicTreeView';
import SprintView from './components/SprintView';

const tabs = [
  { to: '/work-items', label: 'Work Items' },
  { to: '/sprints', label: 'Sprints' },
];

function ConnectionStatus({ status }) {
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        Connecting...
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Disconnected
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      Connected
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('loading');
  
  useEffect(() => {
    checkHealth()
      .then(data => {
        setHealth(data);
        if (data.configured) {
          localStorage.setItem('ado_org', data.org);
          localStorage.setItem('ado_project', data.project);
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
        }
      })
      .catch(() => setConnectionStatus('error'));
  }, []);
  
  return (
    <div className="h-screen flex flex-col" style={{ background: '#111318' }}>
      {/* Top Bar */}
      <header className="flex-shrink-0 h-14 flex items-center px-5 justify-between border-b border-slate-800" style={{ background: '#16181d' }}>
        <div className="flex items-center gap-6">
          <h1 className="text-base font-semibold text-white">
            ADO Dashboard
          </h1>
          
          {/* Tabs */}
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {health?.project && (
            <span className="text-sm text-slate-500 font-mono">
              {health.org}/{health.project}
            </span>
          )}
          <ConnectionStatus status={connectionStatus} />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {connectionStatus === 'error' ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8 max-w-lg">
              <div className="w-16 h-16 rounded-2xl bg-red-900/30 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚠</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">Connection Failed</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Unable to connect to Azure DevOps. Make sure the backend is running and configured.
              </p>
              <div className="text-left p-4 rounded-lg text-sm font-mono text-slate-400 mb-6 border border-slate-700" style={{ background: '#1e2028' }}>
                <p className="text-slate-500 mb-2"># Required in .env</p>
                <p>ADO_ORG=your-organization</p>
                <p>ADO_PROJECT=your-project</p>
                <p>ADO_PAT=your-token</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : connectionStatus === 'loading' ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Connecting to Azure DevOps...</span>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <Routes>
              <Route path="/" element={<Navigate to="/work-items" replace />} />
              <Route path="/work-items" element={<EpicTreeView />} />
              <Route path="/sprints" element={<SprintView />} />
              <Route path="*" element={<Navigate to="/work-items" replace />} />
            </Routes>
          </div>
        )}
      </main>
    </div>
  );
}
