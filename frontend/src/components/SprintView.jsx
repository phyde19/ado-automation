import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getIterations, getIterationTree, getTeams, getTeamMembers, getChildren } from '../services/api';
import { useApi } from '../hooks/useApi';
import { usePinnedItems } from '../hooks/usePinnedItems';
import { WorkItemTypeBadge, WorkItemStateBadge, WorkItemId } from './WorkItemBadge';
import { Spinner, FilterLabel, Select, IconButton, Icons, PinButton } from './shared/ui';

function getParentId(item) {
  const url = item?.relations?.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse')?.url;
  if (!url) return null;
  const m = url.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

function getChildIds(item) {
  const rels = item?.relations || [];
  return rels
    .filter(r => r.rel === 'System.LinkTypes.Hierarchy-Forward' && r.url)
    .map(r => {
      const m = r.url.match(/(\d+)\s*$/);
      return m ? Number(m[1]) : null;
    })
    .filter(Boolean);
}

function IterationTypeahead({ iterations, valuePath, onChangePath, currentPath }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = useMemo(
    () => iterations.find(i => i.path === valuePath) || null,
    [iterations, valuePath]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return iterations.slice(0, 100);
    return iterations
      .filter(i => (i.name || '').toLowerCase().includes(query) || (i.path || '').toLowerCase().includes(query))
      .slice(0, 100);
  }, [iterations, q]);

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  // Format date range concisely: "Jan 6 – Jan 19"
  const formatRange = (iter) => {
    const start = iter.attributes?.startDate;
    const end = iter.attributes?.finishDate;
    if (!start || !end) return '';
    const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  return (
    <div className="relative w-72">
      {/* Input with chevron */}
      <div className="relative">
        <input
          value={open ? q : (selected ? selected.name : '')}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search sprints..."
          className="w-full pl-3 pr-8 py-2 text-sm rounded-md border border-slate-700 text-slate-200 focus:border-slate-600 focus:outline-none"
          style={{ background: '#1e2028' }}
        />
        <svg 
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-md border border-slate-700 shadow-xl" style={{ background: '#1a1d24' }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">No matches</div>
          ) : (
            filtered.map(iter => {
              const isSelected = iter.path === valuePath;
              const isCurrent = currentPath && iter.path === currentPath;
              const dateRange = formatRange(iter);

              return (
                <button
                  key={iter.id}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                    isSelected 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  } ${isCurrent ? 'border-l-2 border-emerald-500' : 'border-l-2 border-transparent'}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChangePath(iter.path)}
                >
                  {/* Checkmark for selected */}
                  <span className={`w-4 flex-shrink-0 ${isSelected ? 'text-indigo-400' : 'text-transparent'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  
                  {/* Sprint name */}
                  <span className="flex-1 truncate font-medium">{iter.name}</span>
                  
                  {/* Date range - subtle */}
                  {dateRange && (
                    <span className="text-xs text-slate-500 flex-shrink-0">{dateRange}</span>
                  )}
                  
                  {/* Current indicator - small dot */}
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Current sprint" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function TreeNode({ item, level = 0, onOpen, expandedItems, toggleExpand, childrenCache, loadChildren, sprintIds, childrenByParent, byId, checkPinned, onTogglePin }) {
  const fields = item.fields || {};
  const id = item.id;
  const title = fields['System.Title'] || 'Untitled';
  const type = fields['System.WorkItemType'] || 'Unknown';
  const state = fields['System.State'] || 'Unknown';
  const assignedTo = fields['System.AssignedTo']?.displayName || '';
  const pinned = checkPinned ? checkPinned(id) : false;
  
  const inSprint = sprintIds.has(id);
  const isExpanded = expandedItems.has(id);
  const children = childrenCache[id];

  const inlineChildIds = childrenByParent.get(id) ? Array.from(childrenByParent.get(id)) : [];
  const hasInlineChildren = inlineChildIds.length > 0;
  const hasApiChildren = item.relations?.some(r => r.rel === 'System.LinkTypes.Hierarchy-Forward') ?? false;
  const hasChildren = hasInlineChildren || hasApiChildren;
  
  const handleToggle = async () => {
    if (!hasChildren) return;
    // Only fetch from API when we don't already have inline children
    if (!isExpanded && !hasInlineChildren && !children) {
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
          className={`flex items-center gap-3 flex-1 min-w-0 py-2 px-2 rounded-lg cursor-pointer hover:bg-slate-800/50 ${
            inSprint ? '' : 'opacity-70'
          }`}
          onClick={() => onOpen(id)}
        >
          <WorkItemTypeBadge type={type} compact />
          
          <span className="text-sm font-medium text-slate-200 truncate flex-1 min-w-0" title={title}>
            {title}
          </span>
          
          {assignedTo && (
            <span className="text-xs text-slate-500 truncate max-w-[100px]">
              {assignedTo}
            </span>
          )}
          
          <WorkItemStateBadge state={state} />
          <WorkItemId id={id} onClick={(e) => { e.stopPropagation(); onOpen(id); }} />
          
          {/* Pin button - PinButton handles both display and toggle */}
          {onTogglePin && <PinButton isPinned={pinned} onToggle={() => onTogglePin(id)} />}
        </div>
      </div>
      
      {isExpanded && (
        <div>
          {/* Prefer inline children from the precomputed tree (keeps parent-chain visible) */}
          {hasInlineChildren ? (
            inlineChildIds.map(cid => {
              const child = byId.get(cid);
              if (!child) return null;
              return (
                <TreeNode
                  key={child.id}
                  item={child}
                  level={level + 1}
                  onOpen={onOpen}
                  expandedItems={expandedItems}
                  toggleExpand={toggleExpand}
                  childrenCache={childrenCache}
                  loadChildren={loadChildren}
                  sprintIds={sprintIds}
                  childrenByParent={childrenByParent}
                  byId={byId}
                  checkPinned={checkPinned}
                  onTogglePin={onTogglePin}
                />
              );
            })
          ) : children === 'loading' ? (
            <div className="text-sm text-slate-500 py-2" style={{ paddingLeft: `${indent + 54}px` }}>
              Loading...
            </div>
          ) : Array.isArray(children) && children.length > 0 ? (
            children.map(child => (
              <TreeNode
                key={child.id}
                item={child}
                level={level + 1}
                onOpen={onOpen}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
                childrenCache={childrenCache}
                loadChildren={loadChildren}
                sprintIds={sprintIds}
                childrenByParent={childrenByParent}
                byId={byId}
                checkPinned={checkPinned}
                onTogglePin={onTogglePin}
              />
            ))
          ) : (
            <div className="text-sm text-slate-500 py-2 italic" style={{ paddingLeft: `${indent + 54}px` }}>
              No children
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SprintView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTeam = searchParams.get('team') || '';
  const urlIteration = searchParams.get('iter') || '';
  const urlAssigned = searchParams.get('assigned') || 'All';

  const selectedMember = urlAssigned;
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [childrenCache, setChildrenCache] = useState({});
  
  // Pinned items (shared across views)
  const { isPinned, togglePin } = usePinnedItems();
  
  const setParam = (key, value, { dropIf } = {}) => {
    const next = new URLSearchParams(searchParams);
    const shouldDrop = value == null || value === '' || (dropIf != null && value === dropIf);
    if (shouldDrop) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const { data: teamsData, loading: loadingTeams } = useApi(() => getTeams(), [], { cacheKey: 'teams' });
  const teams = teamsData?.value || [];
  const activeTeam = urlTeam || teams[0]?.name || '';

  // Ensure URL has a team once loaded (bookmarkable / reload-safe)
  useEffect(() => {
    if (!teams.length) return;
    if (!urlTeam) setParam('team', teams[0].name);
  }, [teams.length]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const { data: iterationsData, loading: loadingIterations } = useApi(
    () => activeTeam ? getIterations(activeTeam) : Promise.resolve({ value: [] }),
    [activeTeam],
    { enabled: !!activeTeam }
  );
  const iterations = iterationsData?.value || [];
  
  const currentIteration = useMemo(() => {
    const now = new Date();
    return iterations.find(iter => {
      const start = iter.attributes?.startDate ? new Date(iter.attributes.startDate) : null;
      const end = iter.attributes?.finishDate ? new Date(iter.attributes.finishDate) : null;
      return start && end && now >= start && now <= end;
    });
  }, [iterations]);
  
  const activeIteration = urlIteration || currentIteration?.path || iterations[0]?.path || '';

  // Ensure URL has an iteration once loaded (bookmarkable / reload-safe)
  useEffect(() => {
    if (!iterations.length) return;
    if (!urlIteration) {
      const pick = currentIteration?.path || iterations[0].path;
      if (pick) setParam('iter', pick);
    }
  }, [iterations.length, currentIteration?.path]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const { data: membersData } = useApi(
    () => activeTeam ? getTeamMembers(activeTeam) : Promise.resolve({ value: [] }),
    [activeTeam],
    { enabled: !!activeTeam, cacheKey: `members-${activeTeam}` }
  );
  const members = membersData?.value?.map(m => m.identity) || [];
  
  const { data: treeData, loading: loadingWorkItems, refetch } = useApi(
    () => activeIteration ? getIterationTree(activeIteration, { assignedTo: selectedMember }) : Promise.resolve({ value: [], sprintIds: [] }),
    [activeIteration, selectedMember],
    { enabled: !!activeIteration }
  );

  const allItems = treeData?.value || [];
  const sprintIds = useMemo(() => new Set(treeData?.sprintIds || []), [treeData]);

  const byId = useMemo(() => {
    const m = new Map();
    for (const it of allItems) m.set(it.id, it);
    return m;
  }, [allItems]);

  // Build a tree that shows the full parent chain for sprint items.
  // Roots are top-most ancestors of sprint items.
  const { roots, childrenByParent, autoExpand } = useMemo(() => {
    const childrenMap = new Map(); // parentId -> Set(childId)
    const expand = new Set();
    const rootSet = new Set();

    // Build parent->child edges from items we have (fallback from child relations if present)
    for (const it of allItems) {
      const pid = getParentId(it);
      if (pid && byId.has(pid)) {
        if (!childrenMap.has(pid)) childrenMap.set(pid, new Set());
        childrenMap.get(pid).add(it.id);
      }
    }

    // Ensure we include all roots for sprint items by walking parent chain
    const sprintList = Array.from(sprintIds);
    for (const sid of sprintList) {
      let cur = byId.get(sid);
      if (!cur) continue;
      let parentId = getParentId(cur);
      while (parentId && byId.has(parentId)) {
        expand.add(parentId); // auto-expand ancestors so chain is visible
        cur = byId.get(parentId);
        parentId = getParentId(cur);
      }
      rootSet.add(cur.id);
    }

    return { roots: Array.from(rootSet), childrenByParent: childrenMap, autoExpand: expand };
  }, [allItems, byId, sprintIds]);

  // Initialize expanded state when data changes: show full chain by default.
  useEffect(() => {
    // Merge autoExpand with current expansion to not fight user interaction too hard.
    setExpandedItems(prev => {
      if (prev.size) return prev;
      return new Set(autoExpand);
    });
  }, [autoExpand]);
  
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
  
  const onOpenWorkItem = (id) => {
    const org = localStorage.getItem('ado_org');
    const project = localStorage.getItem('ado_project');
    if (org && project) {
      window.open(`https://dev.azure.com/${org}/${project}/_workitems/edit/${id}`, '_blank');
    }
  };
  
  const isLoading = loadingTeams || loadingIterations || loadingWorkItems;
  
  // When filters change, reset expansion/cached children for clean view
  useEffect(() => {
    setExpandedItems(new Set());
    setChildrenCache({});
  }, [activeIteration, selectedMember]);
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Sprint selector */}
          <div className="flex items-center gap-2">
            <FilterLabel>Sprint</FilterLabel>
            {loadingIterations ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Spinner /> <span className="text-sm">Loading...</span>
              </div>
            ) : iterations.length === 0 ? (
              <span className="text-sm text-slate-500">None</span>
            ) : (
              <IterationTypeahead
                iterations={iterations}
                valuePath={activeIteration}
                currentPath={currentIteration?.path || null}
                onChangePath={(path) => {
                  setParam('iter', path);
                  setExpandedItems(new Set());
                  setChildrenCache({});
                }}
              />
            )}
          </div>
          
          {/* Assignee filter */}
          <div className="flex items-center gap-2">
            <FilterLabel>Assignee</FilterLabel>
            <Select
              value={selectedMember}
              onChange={(e) => setParam('assigned', e.target.value, { dropIf: 'All' })}
            >
              <option value="All">All</option>
              {members.map(member => (
                <option key={member.id} value={member.displayName}>{member.displayName}</option>
              ))}
            </Select>
          </div>
          
          {/* Spacer + count + refresh */}
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-xs text-slate-500">
              {treeData?.sprintIds?.length || 0} items
            </span>
            <IconButton onClick={refetch} title="Refresh">
              <Icons.Refresh />
            </IconButton>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Spinner /> <span className="ml-3 text-sm">Loading...</span>
          </div>
        ) : !activeIteration ? (
          <div className="text-slate-500 text-sm p-6 text-center">No sprints available</div>
        ) : roots.length === 0 ? (
            <div className="text-slate-500 text-sm p-6 text-center">No work items in this sprint</div>
        ) : (
          <div>
            {roots.map(rootId => {
              const root = byId.get(rootId);
              if (!root) return null;
              return (
                <TreeNode
                  key={root.id}
                  item={root}
                  level={0}
                  onOpen={onOpenWorkItem}
                  expandedItems={expandedItems}
                  toggleExpand={toggleExpand}
                  childrenCache={childrenCache}
                  loadChildren={loadChildren}
                  sprintIds={sprintIds}
                  childrenByParent={childrenByParent}
                  byId={byId}
                  checkPinned={isPinned}
                  onTogglePin={togglePin}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
