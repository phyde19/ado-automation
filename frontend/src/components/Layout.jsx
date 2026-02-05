import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

// Navigation items configuration
const navItems = [
  { 
    to: '/', 
    label: 'Dashboard', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
    end: true 
  },
  { 
    to: '/work-items', 
    label: 'Work Items', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  { 
    to: '/sprints', 
    label: 'Sprints', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    to: '/prs', 
    label: 'Pull Requests', 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )
  },
];

function NavItem({ to, label, icon, collapsed, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          isActive
            ? 'bg-indigo-600/20 text-indigo-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`
      }
      title={collapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </NavLink>
  );
}

function ConnectionStatus({ status, collapsed }) {
  const dot = status === 'connected' 
    ? 'bg-green-500' 
    : status === 'error' 
      ? 'bg-red-500' 
      : 'bg-yellow-500 animate-pulse';
  
  const text = status === 'connected' 
    ? 'Connected' 
    : status === 'error' 
      ? 'Disconnected' 
      : 'Connecting...';

  return (
    <div className="flex items-center gap-2" title={collapsed ? text : undefined}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      {!collapsed && <span className="text-xs text-slate-500">{text}</span>}
    </div>
  );
}

export default function Layout({ children, health, connectionStatus }) {
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <div className="h-screen flex" style={{ background: '#111318' }}>
      {/* Sidebar */}
      <aside 
        className={`flex-shrink-0 flex flex-col border-r border-slate-800 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-52'
        }`}
        style={{ background: '#16181d' }}
      >
        {/* Logo/Title */}
        <div className="h-14 flex items-center px-4 border-b border-slate-800">
          {collapsed ? (
            <span className="text-lg font-bold text-indigo-400">A</span>
          ) : (
            <span className="text-base font-semibold text-white">ADO Dashboard</span>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavItem 
              key={item.to} 
              {...item} 
              collapsed={collapsed} 
            />
          ))}
        </nav>
        
        {/* Bottom section */}
        <div className="p-3 border-t border-slate-800 space-y-3">
          {/* Project info */}
          {health?.project && !collapsed && (
            <div className="px-3 py-2">
              <div className="text-xs text-slate-500 mb-1">Project</div>
              <div className="text-sm text-slate-300 font-mono truncate" title={`${health.org}/${health.project}`}>
                {health.project}
              </div>
            </div>
          )}
          
          {/* Connection status */}
          <div className="px-3 py-2">
            <ConnectionStatus status={connectionStatus} collapsed={collapsed} />
          </div>
          
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
