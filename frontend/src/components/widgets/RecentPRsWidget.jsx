import React from 'react';
import { useApi } from '../../hooks/useApi';
import { getPullRequests } from '../../services/api';
import { Widget, WidgetLink, WidgetEmpty, Spinner, getTimeAgo } from '../shared/ui';

// PR status badge
function PRStatusBadge({ status }) {
  const styles = {
    active: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    abandoned: 'bg-slate-500/20 text-slate-400',
  };
  
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

// Vote status indicator
function VoteIndicator({ vote }) {
  // ADO vote values: 10=approved, 5=approved with suggestions, 0=no vote, -5=waiting, -10=rejected
  if (vote >= 10) return <span className="w-2 h-2 rounded-full bg-green-500" title="Approved" />;
  if (vote >= 5) return <span className="w-2 h-2 rounded-full bg-green-400" title="Approved with suggestions" />;
  if (vote <= -10) return <span className="w-2 h-2 rounded-full bg-red-500" title="Rejected" />;
  if (vote <= -5) return <span className="w-2 h-2 rounded-full bg-yellow-500" title="Waiting for author" />;
  return <span className="w-2 h-2 rounded-full bg-slate-600" title="No vote" />;
}

export default function RecentPRsWidget({ className = '' }) {
  const { data, loading, error } = useApi(
    () => getPullRequests({ status: 'active', top: 10 }),
    [],
    { cacheKey: 'recent-prs', cacheDuration: 60 * 1000 } // 1 min cache
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
    <Widget 
      title="Recent Pull Requests" 
      action={<WidgetLink to="/prs">View All</WidgetLink>}
      className={className}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full py-8">
          <Spinner className="w-5 h-5" />
        </div>
      ) : error ? (
        <WidgetEmpty message={`Error: ${error}`} />
      ) : prs.length === 0 ? (
        <WidgetEmpty 
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
          message="No active pull requests" 
        />
      ) : (
        <div className="divide-y divide-slate-800">
          {prs.map(pr => {
            const createdDate = new Date(pr.creationDate);
            const timeAgo = getTimeAgo(createdDate);
            
            return (
              <button
                key={pr.pullRequestId}
                onClick={() => openPR(pr)}
                className="w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-500 font-mono">#{pr.pullRequestId}</span>
                      <PRStatusBadge status={pr.status} />
                      <span className="text-xs text-slate-500">{timeAgo}</span>
                    </div>
                    <div className="text-sm text-slate-200 truncate" title={pr.title}>
                      {pr.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-slate-500">
                        {pr.repository?.name}
                      </span>
                      <span className="text-xs text-slate-600">
                        {pr.createdBy?.displayName}
                      </span>
                    </div>
                  </div>
                  
                  {/* Reviewer votes */}
                  {pr.reviewers && pr.reviewers.length > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {pr.reviewers.slice(0, 3).map((r, i) => (
                        <VoteIndicator key={i} vote={r.vote} />
                      ))}
                      {pr.reviewers.length > 3 && (
                        <span className="text-xs text-slate-500">+{pr.reviewers.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Widget>
  );
}
