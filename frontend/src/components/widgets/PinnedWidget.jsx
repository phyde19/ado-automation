import React, { useMemo } from 'react';
import { usePinnedItems } from '../../hooks/usePinnedItems';
import { useApi } from '../../hooks/useApi';
import { getWorkItemsBatch } from '../../services/api';
import { Widget, WidgetEmpty, Spinner, Icons, PinButton, openWorkItem } from '../shared/ui';
import { WorkItemTypeBadge, WorkItemStateBadge, WorkItemId } from '../WorkItemBadge';

export default function PinnedWidget({ className = '' }) {
  const { pinnedIds, isPinned, togglePin, clearPins } = usePinnedItems();
  
  const pinnedArray = useMemo(() => Array.from(pinnedIds), [pinnedIds]);
  
  // Fetch pinned work items
  const { data, loading, error } = useApi(
    () => pinnedArray.length > 0 
      ? getWorkItemsBatch(pinnedArray) 
      : Promise.resolve({ value: [] }),
    [pinnedArray.join(',')],
    { enabled: pinnedArray.length > 0 }
  );
  
  const workItems = data?.value || [];
  
  return (
    <Widget 
      title="Pinned Items" 
      action={
        pinnedArray.length > 0 ? (
          <button 
            onClick={clearPins}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Clear all
          </button>
        ) : null
      }
      className={className}
    >
      {pinnedArray.length === 0 ? (
        <WidgetEmpty 
          icon={<Icons.PinOutline />}
          message="No pinned items" 
        />
      ) : loading ? (
        <div className="flex items-center justify-center h-full py-8">
          <Spinner className="w-5 h-5" />
        </div>
      ) : error ? (
        <WidgetEmpty message={`Error: ${error}`} />
      ) : (
        <div className="divide-y divide-slate-800">
          {workItems.map(wi => {
            const fields = wi.fields || {};
            const type = fields['System.WorkItemType'] || 'Unknown';
            const title = fields['System.Title'] || 'Untitled';
            const state = fields['System.State'] || 'Unknown';
            
            return (
              <div
                key={wi.id}
                className="group flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/50 transition-colors"
              >
                <button
                  onClick={() => openWorkItem(wi.id)}
                  className="flex-1 flex items-center gap-3 min-w-0 text-left"
                >
                  <WorkItemTypeBadge type={type} compact />
                  <span className="flex-1 text-sm text-slate-200 truncate" title={title}>
                    {title}
                  </span>
                  <WorkItemStateBadge state={state} />
                  <WorkItemId id={wi.id} onClick={(e) => { e.stopPropagation(); openWorkItem(wi.id); }} />
                </button>
                <PinButton isPinned={isPinned(wi.id)} onToggle={() => togglePin(wi.id)} />
              </div>
            );
          })}
        </div>
      )}
    </Widget>
  );
}
