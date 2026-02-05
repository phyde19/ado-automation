import React, { useState, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { checkHealth } from './services/api';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EpicTreeView from './components/EpicTreeView';
import SprintView from './components/SprintView';
import PRsView from './components/PRsView';

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
          if (data.projectPRs) {
            localStorage.setItem('ado_project_prs', data.projectPRs);
          }
          if (data.user) {
            localStorage.setItem('ado_user', data.user);
          }
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
        }
      })
      .catch(() => setConnectionStatus('error'));
  }, []);
  
  // Error state
  if (connectionStatus === 'error') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: '#111318' }}>
        <div className="text-center p-8 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">!</span>
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
    );
  }
  
  // Loading state
  if (connectionStatus === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400" style={{ background: '#111318' }}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Connecting to Azure DevOps...</span>
        </div>
      </div>
    );
  }
  
  // Connected state with sidebar layout
  return (
    <Layout health={health} connectionStatus={connectionStatus}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/work-items" element={<EpicTreeView />} />
        <Route path="/sprints" element={<SprintView />} />
        <Route path="/prs" element={<PRsView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
