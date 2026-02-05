import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { getTeams, getIterations, getIterationWorkItems } from '../../services/api';
import { Widget, WidgetLink, WidgetEmpty, Spinner, Icons, openWorkItem } from '../shared/ui';
import { WorkItemTypeBadge, WorkItemStateBadge } from '../WorkItemBadge';

const STORAGE_KEY = 'ado-dashboard-sprint-widget';

export default function SprintWidget({ className = '' }) {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });
  
  // Get teams
  const { data: teamsData, loading: loadingTeams } = useApi(
    () => getTeams(), 
    [], 
    { cacheKey: 'teams' }
  );
  const teams = teamsData?.value || [];
  const activeTeam = teams[0]?.name || '';
  
  // Get iterations for team
  const { data: iterationsData, loading: loadingIterations } = useApi(
    () => activeTeam ? getIterations(activeTeam) : Promise.resolve({ value: [] }),
    [activeTeam],
    { enabled: !!activeTeam }
  );
  const iterations = iterationsData?.value || [];
  
  // Find current sprint (date-based)
  const currentIteration = useMemo(() => {
    const now = new Date();
    return iterations.find(iter => {
      const start = iter.attributes?.startDate ? new Date(iter.attributes.startDate) : null;
      const end = iter.attributes?.finishDate ? new Date(iter.attributes.finishDate) : null;
      return start && end && now >= start && now <= end;
    });
  }, [iterations]);
  
  // Determine active iteration: stored selection > current > first available
  const activeIteration = useMemo(() => {
    if (selectedPath) {
      const found = iterations.find(i => i.path === selectedPath);
      if (found) return found;
    }
    return currentIteration || iterations[0] || null;
  }, [iterations, selectedPath, currentIteration]);
  
  // Persist selection to localStorage
  const selectIteration = (path) => {
    setSelectedPath(path);
    try {
      if (path) {
        localStorage.setItem(STORAGE_KEY, path);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save sprint selection:', e);
    }
  };
  
  // Get configured user from localStorage (set from ADO_USER env var)
  const adoUser = localStorage.getItem('ado_user') || '';
  
  // Get sprint work items (filtered by user if configured)
  const { data: workItemsData, loading: loadingItems } = useApi(
    () => activeIteration?.path 
      ? getIterationWorkItems(activeIteration.path, { assignedTo: adoUser || undefined }) 
      : Promise.resolve({ value: [] }),
    [activeIteration?.path, adoUser],
    { enabled: !!activeIteration?.path }
  );
  
  const workItems = workItemsData?.value || [];
  const isLoading = loadingTeams || loadingIterations || loadingItems;
  
  // Summary stats
  const stats = useMemo(() => {
    const byState = {};
    workItems.forEach(wi => {
      const state = wi.fields?.['System.State'] || 'Unknown';
      byState[state] = (byState[state] || 0) + 1;
    });
    return byState;
  }, [workItems]);
  
  const goToSprints = () => {
    if (activeIteration?.path) {
      navigate(`/sprints?iter=${encodeURIComponent(activeIteration.path)}`);
    } else {
      navigate('/sprints');
    }
  };
  
  // Sprint selector dropdown with search
  const SprintSelector = () => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    
    const filteredIterations = useMemo(() => {
      if (!search.trim()) return iterations;
      const q = search.toLowerCase();
      return iterations.filter(iter => 
        iter.name?.toLowerCase().includes(q) || 
        iter.path?.toLowerCase().includes(q)
      );
    }, [iterations, search]);
    
    const handleClose = () => {
      setOpen(false);
      setSearch('');
    };
    
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white transition-colors"
        >
          <span>{activeIteration?.name || 'Select Sprint'}</span>
          <Icons.ChevronDown />
        </button>
        
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={handleClose} />
            <div 
              className="absolute left-0 top-full mt-1 z-20 w-64 rounded-lg border border-slate-700 shadow-xl overflow-hidden"
              style={{ background: '#1a1d24' }}
            >
              {/* Search input */}
              <div className="p-2 border-b border-slate-800">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sprints..."
                  autoFocus
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
                  style={{ background: '#16181d' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {/* Results */}
              <div className="max-h-56 overflow-auto">
                {filteredIterations.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-500 text-center">
                    No sprints match "{search}"
                  </div>
                ) : (
                  filteredIterations.map(iter => {
                    const isSelected = iter.path === activeIteration?.path;
                    const isCurrent = iter.path === currentIteration?.path;
                    
                    return (
                      <button
                        key={iter.id}
                        onClick={() => { selectIteration(iter.path); handleClose(); }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                          isSelected 
                            ? 'bg-slate-800 text-white' 
                            : 'text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="flex-1 truncate">{iter.name}</span>
                        {isCurrent && (
                          <span className="text-xs text-emerald-500">current</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };
  
  return (
    <Widget 
      title={<SprintSelector />}
      action={<WidgetLink to="/sprints">View All</WidgetLink>}
      className={className}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full py-8">
          <Spinner className="w-5 h-5" />
        </div>
      ) : !activeIteration ? (
        <WidgetEmpty 
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          message="No active sprint" 
        />
      ) : (
        <div className="flex flex-col h-full">
          {/* Stats bar */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-4 flex-wrap">
            <span className="text-xs text-slate-500">{workItems.length} items</span>
            {adoUser && (
              <span className="text-xs text-indigo-400" title={`Filtered to: ${adoUser}`}>
                (my items)
              </span>
            )}
            {Object.entries(stats).map(([state, count]) => (
              <span key={state} className="text-xs">
                <span className="text-slate-500">{state}:</span>
                <span className="text-slate-300 ml-1">{count}</span>
              </span>
            ))}
          </div>
          
          {/* Work items list */}
          {workItems.length === 0 ? (
            <WidgetEmpty message="No items in this sprint" />
          ) : (
            <div className="flex-1 overflow-auto divide-y divide-slate-800">
              {workItems.slice(0, 8).map(wi => {
                const fields = wi.fields || {};
                const type = fields['System.WorkItemType'] || 'Unknown';
                const title = fields['System.Title'] || 'Untitled';
                const state = fields['System.State'] || 'Unknown';
                
                return (
                  <button
                    key={wi.id}
                    onClick={() => openWorkItem(wi.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-800/50 transition-colors flex items-center gap-3"
                  >
                    <WorkItemTypeBadge type={type} compact />
                    <span className="flex-1 text-sm text-slate-200 truncate" title={title}>
                      {title}
                    </span>
                    <WorkItemStateBadge state={state} />
                  </button>
                );
              })}
              {workItems.length > 8 && (
                <button
                  onClick={goToSprints}
                  className="w-full text-center px-4 py-2.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/50 transition-colors"
                >
                  +{workItems.length - 8} more items
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}
