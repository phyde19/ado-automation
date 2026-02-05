import React, { useMemo, useState, useEffect } from 'react';
import { getWorkItemsByType, getChildren, searchWorkItems, getWorkItemsBatch } from '../services/api';
import { useApi } from '../hooks/useApi';
import { usePinnedItems } from '../hooks/usePinnedItems';
import { WorkItemTypeBadge, WorkItemStateBadge, WorkItemId } from './WorkItemBadge';
import { Spinner, FilterLabel, Select, IconButton, Icons, SearchInput, Typeahead, PinButton, openWorkItem } from './shared/ui';

const workItemTypes = ['All', 'Epic', 'Feature', 'User Story', 'Task'];
const yearOptions = ['2026', '2025', 'All'];

function getParentId(item) {
  const url = item?.relations?.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse')?.url;
  if (!url) return null;
  const m = url.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

function buildIdMap(items) {
  const m = new Map();
  for (const it of items || []) m.set(it.id, it);
  return m;
}

function getTitle(item) {
  return item?.fields?.['System.Title'] || 'Untitled';
}

function TreeNode({ item, level = 0, openWorkItem, expandedItems, toggleExpand, childrenCache, loadChildren, checkPinned, onTogglePin }) {
  const fields = item.fields || {};
  const id = item.id;
  const title = fields['System.Title'] || 'Untitled';
  const type = fields['System.WorkItemType'] || 'Unknown';
  const state = fields['System.State'] || 'Unknown';
  const pinned = checkPinned ? checkPinned(id) : false;
  
  const isExpanded = expandedItems.has(id);
  const children = childrenCache[id];
  const hasChildren = item.relations?.some(r => r.rel === 'System.LinkTypes.Hierarchy-Forward') ?? true;
  
  const handleToggle = async () => {
    if (!hasChildren) return;
    if (!isExpanded && !children) {
      await loadChildren(id);
    }
    toggleExpand(id);
  };
  
  const indent = level * 24;
  
  return (
    <div>
      <div 
        className="flex items-center py-1 rounded-lg group"
        style={{ paddingLeft: `${indent}px` }}
      >
        {/* Toggle button - separate clickable area */}
        <div 
          className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
            hasChildren ? 'cursor-pointer hover:bg-slate-700' : 'cursor-default opacity-40'
          }`}
          onClick={handleToggle}
        >
          {hasChildren ? (
            children === 'loading' ? (
              <Spinner />
            ) : (
              <span className="text-slate-400">
                {isExpanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
              </span>
            )
          ) : (
            <span className="w-4" />
          )}
        </div>
        
        {/* Content area - clickable to open WI */}
        <div 
          className="flex items-center gap-3 flex-1 min-w-0 py-2 px-2 rounded-lg cursor-pointer hover:bg-slate-800/50"
          onClick={() => openWorkItem(id)}
        >
          <WorkItemTypeBadge type={type} compact />
          
          <span className="text-sm font-medium text-slate-200 truncate flex-1 min-w-0" title={title}>
            {title}
          </span>
          
          <WorkItemStateBadge state={state} />
          <WorkItemId id={id} onClick={(e) => { e.stopPropagation(); openWorkItem(id); }} />
          
          {/* Pin button */}
          {onTogglePin && <PinButton isPinned={pinned} onToggle={() => onTogglePin(id)} />}
        </div>
      </div>
      
      {isExpanded && children && children !== 'loading' && (
        <div>
          {children.length === 0 ? (
            <div 
              className="text-sm text-slate-500 py-2 italic"
              style={{ paddingLeft: `${indent + 54}px` }}
            >
              No children
            </div>
          ) : (
            children.map(child => (
              <TreeNode
                key={child.id}
                item={child}
                level={level + 1}
                openWorkItem={openWorkItem}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
                childrenCache={childrenCache}
                loadChildren={loadChildren}
                checkPinned={checkPinned}
                onTogglePin={onTogglePin}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Component that shows pinned items in a separate section at the top
function PinnedAndTreeView({ items, pinnedIds, isPinned, togglePin, openWorkItem, expandedItems, toggleExpand, childrenCache, loadChildren, emptyMessage }) {
  // Separate pinned items from the rest
  const pinnedItems = useMemo(() => 
    items.filter(item => pinnedIds.has(item.id)),
    [items, pinnedIds]
  );
  
  const unpinnedItems = useMemo(() => 
    items.filter(item => !pinnedIds.has(item.id)),
    [items, pinnedIds]
  );
  
  if (items.length === 0) {
    return (
      <div className="text-slate-500 text-sm p-6 text-center">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div>
      {/* Pinned section */}
      {pinnedItems.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-amber-400 border-b border-slate-800">
            <Icons.PinFilled />
            <span className="font-medium uppercase tracking-wide">Pinned</span>
            <span className="text-slate-500">({pinnedItems.length})</span>
          </div>
          <div className="py-1">
            {pinnedItems.map(item => (
              <TreeNode
                key={item.id}
                item={item}
                level={0}
                openWorkItem={openWorkItem}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
                childrenCache={childrenCache}
                loadChildren={loadChildren}
                checkPinned={isPinned}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Regular items */}
      {unpinnedItems.length > 0 && (
        <div>
          {pinnedItems.length > 0 && (
            <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-800">
              <span className="font-medium uppercase tracking-wide">All Items</span>
              <span className="ml-2">({unpinnedItems.length})</span>
            </div>
          )}
          <div className="py-1">
            {unpinnedItems.map(item => (
              <TreeNode
                key={item.id}
                item={item}
                level={0}
                openWorkItem={openWorkItem}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
                childrenCache={childrenCache}
                loadChildren={loadChildren}
                checkPinned={isPinned}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EpicTreeView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedYear, setSelectedYear] = useState('2026'); // Default to current year
  const [filterEpicId, setFilterEpicId] = useState(null); // number | null
  const [filterFeatureId, setFilterFeatureId] = useState(null); // number | null
  const [filterUserStoryId, setFilterUserStoryId] = useState(null); // number | null
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [childrenCache, setChildrenCache] = useState({});
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  
  // Pinned items
  const { pinnedIds, isPinned, togglePin } = usePinnedItems();
  
  // Tree root behavior:
  // - All: show Epic tree (expand to see all types)
  // - Otherwise: show that type at the top level
  const rootType = selectedType === 'All' ? 'Epic' : selectedType;
  
  // Year filter: 'All' means no filter, otherwise filter by year
  const yearFilter = selectedYear === 'All' ? undefined : selectedYear;

  const { data: rootData, loading, error, refetch } = useApi(
    () => getWorkItemsByType(rootType, { year: yearFilter }),
    [rootType, yearFilter],
    { cacheKey: `workitems-root-${rootType}-${yearFilter || 'all'}`, cacheDuration: 2 * 60 * 1000 }
  );
  
  const rootItems = rootData?.value || [];

  // Reset filters when type or year changes
  useEffect(() => {
    setFilterEpicId(null);
    setFilterFeatureId(null);
    setFilterUserStoryId(null);
    setExpandedItems(new Set());
    setChildrenCache({});
  }, [selectedType, selectedYear]);

  // Parent mapping support for filter dropdowns (only when needed)
  // Features: need parent Epic titles
  const featureParentEpicIds = useMemo(() => {
    if (selectedType !== 'Feature') return [];
    const ids = new Set();
    for (const f of rootItems) {
      const pid = getParentId(f);
      if (pid) ids.add(pid);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [rootItems, selectedType]);

  const { data: featureParentEpicsData } = useApi(
    () => featureParentEpicIds.length ? getWorkItemsBatch(featureParentEpicIds) : Promise.resolve({ value: [] }),
    [featureParentEpicIds.join(',')],
    { enabled: selectedType === 'Feature' && featureParentEpicIds.length > 0, cacheKey: `parents-epic-for-feature-${featureParentEpicIds.join(',')}` }
  );
  const featureParentEpicsMap = useMemo(() => buildIdMap(featureParentEpicsData?.value), [featureParentEpicsData]);

  // User Stories: need parent Features; for Epic filter, need each Feature's parent Epic
  const storyParentFeatureIds = useMemo(() => {
    if (selectedType !== 'User Story') return [];
    const ids = new Set();
    for (const s of rootItems) {
      const pid = getParentId(s);
      if (pid) ids.add(pid);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [rootItems, selectedType]);

  const { data: storyParentFeaturesData } = useApi(
    () => storyParentFeatureIds.length ? getWorkItemsBatch(storyParentFeatureIds) : Promise.resolve({ value: [] }),
    [storyParentFeatureIds.join(',')],
    { enabled: selectedType === 'User Story' && storyParentFeatureIds.length > 0, cacheKey: `parents-feature-for-story-${storyParentFeatureIds.join(',')}` }
  );
  const storyParentFeaturesMap = useMemo(() => buildIdMap(storyParentFeaturesData?.value), [storyParentFeaturesData]);

  const storyGrandparentEpicIds = useMemo(() => {
    if (selectedType !== 'User Story') return [];
    const ids = new Set();
    for (const f of storyParentFeaturesData?.value || []) {
      const pid = getParentId(f);
      if (pid) ids.add(pid);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [storyParentFeaturesData, selectedType]);

  const { data: storyGrandparentEpicsData } = useApi(
    () => storyGrandparentEpicIds.length ? getWorkItemsBatch(storyGrandparentEpicIds) : Promise.resolve({ value: [] }),
    [storyGrandparentEpicIds.join(',')],
    { enabled: selectedType === 'User Story' && storyGrandparentEpicIds.length > 0, cacheKey: `grandparents-epic-for-story-${storyGrandparentEpicIds.join(',')}` }
  );
  const storyGrandparentEpicsMap = useMemo(() => buildIdMap(storyGrandparentEpicsData?.value), [storyGrandparentEpicsData]);

  // Tasks: need parent User Stories (for dropdown)
  const taskParentStoryIds = useMemo(() => {
    if (selectedType !== 'Task') return [];
    const ids = new Set();
    for (const t of rootItems) {
      const pid = getParentId(t);
      if (pid) ids.add(pid);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [rootItems, selectedType]);

  const { data: taskParentStoriesData } = useApi(
    () => taskParentStoryIds.length ? getWorkItemsBatch(taskParentStoryIds) : Promise.resolve({ value: [] }),
    [taskParentStoryIds.join(',')],
    { enabled: selectedType === 'Task' && taskParentStoryIds.length > 0, cacheKey: `parents-story-for-task-${taskParentStoryIds.join(',')}` }
  );
  const taskParentStoriesMap = useMemo(() => buildIdMap(taskParentStoriesData?.value), [taskParentStoriesData]);
  
  // Debounced search - respects selected type (All searches across all types)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchWorkItems(searchQuery, selectedType);
        setSearchResults(results.value || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, selectedType]);
  
  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const loadChildren = async (parentId) => {
    setChildrenCache(prev => ({ ...prev, [parentId]: 'loading' }));
    try {
      const result = await getChildren(parentId);
      setChildrenCache(prev => ({ ...prev, [parentId]: result.value || [] }));
    } catch (err) {
      setChildrenCache(prev => ({ ...prev, [parentId]: [] }));
    }
  };
  
  const expandAll = () => {
    const allIds = new Set(rootItems.map(e => e.id));
    setExpandedItems(allIds);
    rootItems.forEach(item => {
      if (!childrenCache[item.id]) loadChildren(item.id);
    });
  };
  
  // Determine what to show
  const isSearching = !!searchQuery.trim();
  const showSearchResults = isSearching && searchResults !== null;
  
  // Helper for type label
  const getTypeLabel = (type) => {
    if (type === 'All') return 'all work items';
    if (type === 'User Story') return 'User Stories';
    return `${type}s`;
  };

  // Build filter dropdown options and filtered root items
  const epicOptionsForFeature = useMemo(() => {
    if (selectedType !== 'Feature') return [];
    const opts = featureParentEpicIds
      .map(id => ({ id, label: getTitle(featureParentEpicsMap.get(id)) }))
      .filter(o => o.label);
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [featureParentEpicIds, featureParentEpicsMap, selectedType]);

  const epicOptionsForStory = useMemo(() => {
    if (selectedType !== 'User Story') return [];
    const opts = storyGrandparentEpicIds
      .map(id => ({ id, label: getTitle(storyGrandparentEpicsMap.get(id)) }))
      .filter(o => o.label);
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [storyGrandparentEpicIds, storyGrandparentEpicsMap, selectedType]);

  const featureOptionsForStory = useMemo(() => {
    if (selectedType !== 'User Story') return [];

    // If epic filter is set, restrict features to those under that epic
    const opts = [];
    for (const f of storyParentFeaturesData?.value || []) {
      const epicId = getParentId(f);
      if (filterEpicId && epicId !== filterEpicId) continue;
      opts.push({ id: f.id, label: getTitle(f) });
    }
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [storyParentFeaturesData, selectedType, filterEpicId]);

  const storyOptionsForTask = useMemo(() => {
    if (selectedType !== 'Task') return [];
    const opts = (taskParentStoriesData?.value || []).map(s => ({ id: s.id, label: getTitle(s) }));
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [taskParentStoriesData, selectedType]);

  const filteredRootItems = useMemo(() => {
    if (selectedType === 'Feature') {
      if (!filterEpicId) return rootItems;
      return rootItems.filter(f => getParentId(f) === filterEpicId);
    }
    if (selectedType === 'User Story') {
      return rootItems.filter(s => {
        const featureId = getParentId(s);
        if (filterFeatureId && featureId !== filterFeatureId) return false;
        if (filterEpicId) {
          const feature = storyParentFeaturesMap.get(featureId);
          const epicId = getParentId(feature);
          if (epicId !== filterEpicId) return false;
        }
        return true;
      });
    }
    if (selectedType === 'Task') {
      if (!filterUserStoryId) return rootItems;
      return rootItems.filter(t => getParentId(t) === filterUserStoryId);
    }
    return rootItems;
  }, [filterEpicId, filterFeatureId, filterUserStoryId, rootItems, selectedType, storyParentFeaturesMap]);

  // Keep filters consistent (cascading UX)
  useEffect(() => {
    if (selectedType !== 'User Story') return;
    if (!filterFeatureId) return;
    const feature = storyParentFeaturesMap.get(filterFeatureId);
    if (!feature) return;
    const epicId = getParentId(feature);
    if (epicId && filterEpicId && epicId !== filterEpicId) {
      // Feature selection contradicts epic selection -> align epic to feature's epic
      setFilterEpicId(epicId);
    } else if (epicId && !filterEpicId) {
      setFilterEpicId(epicId);
    }
  }, [selectedType, filterFeatureId, filterEpicId, storyParentFeaturesMap]);

  useEffect(() => {
    // If epic changes, clear feature filter if it no longer matches available options
    if (selectedType !== 'User Story') return;
    if (!filterFeatureId) return;
    const stillValid = featureOptionsForStory.some(o => o.id === filterFeatureId);
    if (!stillValid) setFilterFeatureId(null);
  }, [selectedType, filterEpicId, filterFeatureId, featureOptionsForStory]);
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-800 space-y-3">
        {/* Filters row */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <FilterLabel>Type</FilterLabel>
            <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              {workItemTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <FilterLabel>Created</FilterLabel>
            <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {yearOptions.map(year => (
                <option key={year} value={year}>{year === 'All' ? 'All time' : `${year}+`}</option>
              ))}
            </Select>
          </div>

          {/* Parent filters (contextual) */}
          {selectedType === 'Feature' && (
            <div className="flex items-center gap-2">
              <FilterLabel>Epic</FilterLabel>
              <Select
                value={filterEpicId ?? ''}
                onChange={(e) => setFilterEpicId(e.target.value ? Number(e.target.value) : null)}
                className="min-w-[220px]"
              >
                <option value="">All</option>
                {epicOptionsForFeature.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </Select>
            </div>
          )}

          {selectedType === 'User Story' && (
            <>
              <div className="flex items-center gap-2">
                <FilterLabel>Epic</FilterLabel>
                <Select
                  value={filterEpicId ?? ''}
                  onChange={(e) => setFilterEpicId(e.target.value ? Number(e.target.value) : null)}
                  className="min-w-[220px]"
                >
                  <option value="">All</option>
                  {epicOptionsForStory.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <FilterLabel>Feature</FilterLabel>
                <Select
                  value={filterFeatureId ?? ''}
                  onChange={(e) => setFilterFeatureId(e.target.value ? Number(e.target.value) : null)}
                  className="min-w-[220px]"
                >
                  <option value="">All</option>
                  {featureOptionsForStory.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </Select>
              </div>
            </>
          )}

          {selectedType === 'Task' && (
            <div className="flex items-center gap-2">
              <FilterLabel>User Story</FilterLabel>
              <Typeahead
                options={storyOptionsForTask}
                valueId={filterUserStoryId}
                onChangeId={setFilterUserStoryId}
                placeholder="Search stories..."
              />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-3 ml-auto text-xs">
            <span className="text-slate-500">{filteredRootItems.length} items</span>
            <button onClick={expandAll} className="text-slate-400 hover:text-white transition-colors">
              expand
            </button>
            <button onClick={() => setExpandedItems(new Set())} className="text-slate-400 hover:text-white transition-colors">
              collapse
            </button>
            <IconButton onClick={refetch} title="Refresh">
              <Icons.Refresh />
            </IconButton>
          </div>
        </div>

        {/* Search row */}
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${getTypeLabel(selectedType)}...`}
          searching={searching}
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {loading && !showSearchResults ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Spinner /> <span className="ml-3 text-sm">Loading {getTypeLabel(rootType)}...</span>
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm p-4 bg-red-900/20 rounded-lg border border-red-800">
            Error: {error}
            <button onClick={refetch} className="ml-3 text-indigo-400 hover:underline">Retry</button>
          </div>
        ) : showSearchResults ? (
          // Search results view (expandable tree nodes)
          <div>
            <div className="text-xs text-slate-500 px-3 py-2 mb-2 flex items-center justify-between">
              <span>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                {selectedType !== 'All' && ` in ${getTypeLabel(selectedType)}`}
              </span>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-indigo-400 hover:text-indigo-300"
              >
                Clear search
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-slate-500 text-sm p-6 text-center">
                No {selectedType === 'All' ? 'work items' : getTypeLabel(selectedType)} found matching "{searchQuery}"
              </div>
            ) : (
              <div>
                {searchResults.map(item => (
                  <TreeNode
                    key={item.id}
                    item={item}
                    level={0}
                    openWorkItem={openWorkItem}
                    expandedItems={expandedItems}
                    toggleExpand={toggleExpand}
                    childrenCache={childrenCache}
                    loadChildren={loadChildren}
                    checkPinned={isPinned}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <PinnedAndTreeView
            items={filteredRootItems}
            pinnedIds={pinnedIds}
            isPinned={isPinned}
            togglePin={togglePin}
            openWorkItem={openWorkItem}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
            childrenCache={childrenCache}
            loadChildren={loadChildren}
            emptyMessage={`No ${getTypeLabel(rootType)} found`}
          />
        )}
      </div>
    </div>
  );
}
