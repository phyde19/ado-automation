import React from 'react';

// Format relative time (e.g., "5m ago", "2h ago", "3d ago")
export function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

// Spinner
export const Spinner = ({ className = 'w-4 h-4' }) => (
  <svg className={`animate-spin text-slate-500 ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// Filter label (uppercase, subtle)
export const FilterLabel = ({ children }) => (
  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{children}</span>
);

// Styled select dropdown
export const Select = ({ value, onChange, children, className = '' }) => (
  <select
    value={value}
    onChange={onChange}
    className={`px-3 py-2 text-sm rounded-md border border-slate-700 text-slate-200 focus:border-slate-600 focus:outline-none ${className}`}
    style={{ background: '#1e2028' }}
  >
    {children}
  </select>
);

// Icon button (for refresh, expand, etc.)
export const IconButton = ({ onClick, title, children, className = '' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors ${className}`}
  >
    {children}
  </button>
);

// Common icons
export const Icons = {
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  // Unfold/expand all - double chevron down
  Expand: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7M19 5l-7 7-7-7" />
    </svg>
  ),
  // Fold/collapse all - double chevron up
  Collapse: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
    </svg>
  ),
  // Pin outline
  PinOutline: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  ),
  // Pin filled
  PinFilled: () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1}>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </svg>
  ),
  // External link
  ExternalLink: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

// Pin button - visible, easy to click
export const PinButton = ({ isPinned, onToggle, className = '' }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    title={isPinned ? 'Unpin' : 'Pin'}
    className={`p-1.5 rounded-md transition-all flex-shrink-0 ${
      isPinned 
        ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10' 
        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700 opacity-60 group-hover:opacity-100'
    } ${className}`}
  >
    {isPinned ? <Icons.PinFilled /> : <Icons.PinOutline />}
  </button>
);

// Search input with icon
export const SearchInput = ({ value, onChange, placeholder, searching = false }) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      {searching ? <Spinner className="w-4 h-4" /> : (
        <span className="text-slate-500"><Icons.Search /></span>
      )}
    </div>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
      style={{ background: '#1e2028' }}
    />
  </div>
);

// Widget container for dashboard
export const Widget = ({ title, action, children, className = '' }) => (
  <div 
    className={`rounded-xl border border-slate-800 flex flex-col overflow-hidden ${className}`}
    style={{ background: '#16181d' }}
  >
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
      {typeof title === 'string' ? (
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      ) : (
        <div className="text-sm">{title}</div>
      )}
      {action}
    </div>
    <div className="flex-1 overflow-auto">
      {children}
    </div>
  </div>
);

// Widget link action (e.g., "View All →")
export const WidgetLink = ({ to, children }) => (
  <a 
    href={to} 
    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
  >
    {children}
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </a>
);

// Empty state for widgets
export const WidgetEmpty = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500">
    {icon && <span className="mb-2 opacity-50">{icon}</span>}
    <span className="text-sm">{message}</span>
  </div>
);

// Typeahead dropdown (generic)
export function Typeahead({ options, valueId, onChangeId, placeholder, showAllOption = true }) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => options.find(o => o.id === valueId) || null, [options, valueId]);
  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options.slice(0, 50);
    return options
      .filter(o => o.label.toLowerCase().includes(query) || String(o.id).includes(query))
      .slice(0, 50);
  }, [options, q]);

  React.useEffect(() => {
    if (selected && !open) setQ('');
  }, [selected, open]);

  return (
    <div className="relative w-64">
      <div className="relative">
        <input
          value={open ? q : (selected ? selected.label : '')}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full pl-3 pr-8 py-2 text-sm rounded-md border border-slate-700 text-slate-200 focus:border-slate-600 focus:outline-none"
          style={{ background: '#1e2028' }}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <Icons.ChevronDown />
        </span>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-slate-700 shadow-xl" style={{ background: '#1a1d24' }}>
          {showAllOption && (
            <button
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors border-b border-slate-800 ${
                valueId === null ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50'
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChangeId(null)}
            >
              <span className={`w-4 flex-shrink-0 ${valueId === null ? 'text-indigo-400' : 'text-transparent'}`}>
                <Icons.Check />
              </span>
              <span>All</span>
            </button>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">No matches</div>
          ) : (
            filtered.map(o => {
              const isSelected = o.id === valueId;
              return (
                <button
                  key={o.id}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                    isSelected ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChangeId(o.id)}
                  title={o.label}
                >
                  <span className={`w-4 flex-shrink-0 ${isSelected ? 'text-indigo-400' : 'text-transparent'}`}>
                    <Icons.Check />
                  </span>
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.meta && <span className="text-xs text-slate-500 flex-shrink-0">{o.meta}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Open work item in Azure DevOps (uses localStorage for org/project)
export function openWorkItem(id) {
  const org = localStorage.getItem('ado_org');
  const project = localStorage.getItem('ado_project');
  if (org && project) {
    window.open(`https://dev.azure.com/${org}/${project}/_workitems/edit/${id}`, '_blank');
  }
}
