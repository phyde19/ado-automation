import React from 'react';

const typeConfig = {
  'Epic': { bg: '#7c3aed20', color: '#a78bfa', border: '#7c3aed40', abbrev: 'E' },
  'Feature': { bg: '#3b82f620', color: '#60a5fa', border: '#3b82f640', abbrev: 'F' },
  'User Story': { bg: '#10b98120', color: '#34d399', border: '#10b98140', abbrev: 'US' },
  'Task': { bg: '#f59e0b20', color: '#fbbf24', border: '#f59e0b40', abbrev: 'T' },
  'Bug': { bg: '#ef444420', color: '#f87171', border: '#ef444440', abbrev: 'B' },
};

const stateConfig = {
  'New': '#94a3b8',
  'Active': '#60a5fa',
  'Resolved': '#34d399',
  'Closed': '#64748b',
  'Done': '#34d399',
  'In Progress': '#60a5fa',
  'To Do': '#94a3b8',
};

export function WorkItemTypeBadge({ type, compact = false }) {
  const config = typeConfig[type] || { bg: '#64748b20', color: '#94a3b8', border: '#64748b40', abbrev: '?' };
  
  const style = {
    backgroundColor: config.bg,
    color: config.color,
    borderColor: config.border,
  };
  
  if (compact) {
    return (
      <span 
        className="inline-flex items-center justify-center w-8 h-6 text-xs font-semibold rounded border"
        style={style}
      >
        {config.abbrev}
      </span>
    );
  }
  
  return (
    <span 
      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border"
      style={style}
    >
      {type}
    </span>
  );
}

export function WorkItemStateBadge({ state }) {
  const color = stateConfig[state] || '#94a3b8';
  
  return (
    <span className="text-xs font-medium" style={{ color }}>
      {state}
    </span>
  );
}

export function WorkItemId({ id, onClick }) {
  return (
    <span 
      className="text-xs font-mono text-slate-500 hover:text-indigo-400 cursor-pointer"
      onClick={onClick}
    >
      #{id}
    </span>
  );
}
