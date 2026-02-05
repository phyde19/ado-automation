import React, { useState, useEffect, useRef } from 'react';
import { searchWorkItems } from '../../services/api';
import { Widget, WidgetLink, WidgetEmpty, Spinner, SearchInput, openWorkItem } from '../shared/ui';
import { WorkItemTypeBadge, WorkItemStateBadge, WorkItemId } from '../WorkItemBadge';

const DEBOUNCE_MS = 300;

export default function WorkItemSearchWidget({ className = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const abortControllerRef = useRef(null);
  
  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    
    // Clear results if query is empty
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }
    
    // Debounce the search
    const timer = setTimeout(async () => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await searchWorkItems(trimmed);
        setResults(data?.value || []);
        setHasSearched(true);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    
    return () => {
      clearTimeout(timer);
    };
  }, [query]);
  
  return (
    <Widget 
      title="Work Item Search" 
      action={<WidgetLink to="/work-items">Browse</WidgetLink>}
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* Search input */}
        <div className="px-4 py-3 border-b border-slate-800">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or ID..."
            searching={loading}
          />
        </div>
        
        {/* Results */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <Spinner className="w-5 h-5" />
            </div>
          ) : error ? (
            <WidgetEmpty message={`Error: ${error}`} />
          ) : !hasSearched ? (
            <WidgetEmpty 
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              message="Type to search" 
            />
          ) : results.length === 0 ? (
            <WidgetEmpty message="No results found" />
          ) : (
            <div className="divide-y divide-slate-800">
              {results.slice(0, 8).map(wi => {
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
                    <WorkItemId id={wi.id} onClick={(e) => { e.stopPropagation(); openWorkItem(wi.id); }} />
                  </button>
                );
              })}
              {results.length > 8 && (
                <div className="px-4 py-2.5 text-xs text-slate-500 text-center">
                  +{results.length - 8} more results
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Widget>
  );
}
