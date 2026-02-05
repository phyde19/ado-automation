import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { getPullRequests } from '../services/api';
import { Spinner, FilterLabel, Select, IconButton, Icons } from './shared/ui';

// PR status badge
function PRStatusBadge({ status }) {
  const styles = {
    active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    abandoned: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

// Vote status indicator with label
function VoteIndicator({ vote, showLabel = false }) {
  let color = 'bg-slate-600';
  let label = 'No vote';
  
  if (vote >= 10) { color = 'bg-green-500'; label = 'Approved'; }
  else if (vote >= 5) { color = 'bg-green-400'; label = 'Approved with suggestions'; }
  else if (vote <= -10) { color = 'bg-red-500'; label = 'Rejected'; }
  else if (vote <= -5) { color = 'bg-yellow-500'; label = 'Waiting for author'; }
  
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {showLabel && <span className="text-xs text-slate-500">{label}</span>}
    </div>
  );
}

// Reviewer avatar
function ReviewerAvatar({ reviewer }) {
  const initials = (reviewer.displayName || '?')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  
  return (
    <div 
      className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 border border-slate-600"
      title={`${reviewer.displayName}: ${reviewer.vote >= 10 ? 'Approved' : reviewer.vote <= -10 ? 'Rejected' : 'Pending'}`}
    >
      {initials}
    </div>
  );
}

function PRRow({ pr, onOpen }) {
  const createdDate = new Date(pr.creationDate);
  const timeAgo = getTimeAgo(createdDate);
  
  return (
    <button
      onClick={() => onOpen(pr)}
      className="w-full text-left px-5 py-4 hover:bg-slate-800/50 transition-colors border-b border-slate-800 last:border-b-0"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-slate-500 font-mono">#{pr.pullRequestId}</span>
            <PRStatusBadge status={pr.status} />
            {pr.isDraft && (
              <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">Draft</span>
            )}
          </div>
          
          {/* Title */}
          <h3 className="text-sm font-medium text-slate-200 mb-2 line-clamp-2" title={pr.title}>
            {pr.title}
          </h3>
          
          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {pr.repository?.name}
            </span>
            <span>{pr.createdBy?.displayName}</span>
            <span>{timeAgo}</span>
            <span className="text-slate-600">
              {pr.sourceRefName?.replace('refs/heads/', '')} → {pr.targetRefName?.replace('refs/heads/', '')}
            </span>
          </div>
        </div>
        
        {/* Reviewers */}
        {pr.reviewers && pr.reviewers.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex -space-x-2">
              {pr.reviewers.slice(0, 4).map((r, i) => (
                <div key={i} className="relative">
                  <ReviewerAvatar reviewer={r} />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                    r.vote >= 10 ? 'bg-green-500' : r.vote <= -10 ? 'bg-red-500' : r.vote <= -5 ? 'bg-yellow-500' : 'bg-slate-600'
                  }`} />
                </div>
              ))}
            </div>
            {pr.reviewers.length > 4 && (
              <span className="text-xs text-slate-500">+{pr.reviewers.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function PRsView() {
  const [status, setStatus] = useState('active');
  
  const { data, loading, error, refetch } = useApi(
    () => getPullRequests({ status, top: 50 }),
    [status],
    { cacheKey: `prs-${status}`, cacheDuration: 60 * 1000 }
  );
  
  const prs = data?.value || [];
  
  const openPR = (pr) => {
    const org = localStorage.getItem('ado_org');
    const prProject = localStorage.getItem('ado_project_prs') || localStorage.getItem('ado_project');
    if (org && prProject && pr.repository?.name) {
      window.open(
        `https://dev.azure.com/${org}/${prProject}/_git/${pr.repository.name}/pullrequest/${pr.pullRequestId}`,
        '_blank'
      );
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <FilterLabel>Status</FilterLabel>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
              <option value="all">All</option>
            </Select>
          </div>
          
          {/* Spacer + count + refresh */}
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-xs text-slate-500">
              {prs.length} pull requests
            </span>
            <IconButton onClick={refetch} title="Refresh">
              <Icons.Refresh />
            </IconButton>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Spinner /> <span className="ml-3 text-sm">Loading pull requests...</span>
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm p-6 text-center">Error: {error}</div>
        ) : prs.length === 0 ? (
          <div className="text-slate-500 text-sm p-6 text-center">
            No {status !== 'all' ? status : ''} pull requests found
          </div>
        ) : (
          <div>
            {prs.map(pr => (
              <PRRow key={pr.pullRequestId} pr={pr} onOpen={openPR} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
