const API_BASE = '/api';

// Helper for fetch with error handling
async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// Health check
export async function checkHealth() {
  return fetchJson(`${API_BASE}/health`);
}

// Get all epics (for tree view root)
export async function getEpics() {
  return fetchJson(`${API_BASE}/epics`);
}

// Get work items by type (for tree root)
export async function getWorkItemsByType(type = 'Epic') {
  const params = type ? `?type=${encodeURIComponent(type)}` : '';
  return fetchJson(`${API_BASE}/workitems${params}`);
}

// Get children of a work item
export async function getChildren(workItemId) {
  return fetchJson(`${API_BASE}/workitems/${workItemId}/children`);
}

// Get single work item
export async function getWorkItem(id) {
  return fetchJson(`${API_BASE}/workitems/${id}`);
}

// Get work items by IDs
export async function getWorkItemsBatch(ids) {
  return fetchJson(`${API_BASE}/workitems/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
}

// Get all iterations
export async function getIterations(team) {
  const params = team ? `?team=${encodeURIComponent(team)}` : '';
  return fetchJson(`${API_BASE}/iterations${params}`);
}

// Get current iteration
export async function getCurrentIteration(team) {
  const params = team ? `?team=${encodeURIComponent(team)}` : '';
  return fetchJson(`${API_BASE}/iterations/current${params}`);
}

// Get work items for iteration
export async function getIterationWorkItems(iterationPath, { assignedTo, type } = {}) {
  const params = new URLSearchParams();
  if (assignedTo) params.append('assignedTo', assignedTo);
  if (type) params.append('type', type);
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return fetchJson(`${API_BASE}/iterations/${encodeURIComponent(iterationPath)}/workitems${queryString}`);
}

// Get iteration tree (sprint items + ancestors)
export async function getIterationTree(iterationPath, { assignedTo } = {}) {
  const params = new URLSearchParams();
  if (assignedTo && assignedTo !== 'All') params.append('assignedTo', assignedTo);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return fetchJson(`${API_BASE}/iterations/${encodeURIComponent(iterationPath)}/tree${queryString}`);
}

// Get all teams
export async function getTeams() {
  return fetchJson(`${API_BASE}/teams`);
}

// Get team members
export async function getTeamMembers(teamId) {
  return fetchJson(`${API_BASE}/teams/${encodeURIComponent(teamId)}/members`);
}

// Search work items (optionally filter by type)
export async function searchWorkItems(query, type = 'All') {
  const params = new URLSearchParams({ q: query });
  if (type && type !== 'All') {
    params.append('type', type);
  }
  return fetchJson(`${API_BASE}/search?${params.toString()}`);
}

// Execute custom WIQL query
export async function executeWiql(query) {
  return fetchJson(`${API_BASE}/wiql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
}

// Build ADO URL for work item
export function getWorkItemUrl(orgUrl, projectName, workItemId) {
  // orgUrl stored in localStorage from health check
  const org = localStorage.getItem('ado_org') || '';
  const project = localStorage.getItem('ado_project') || '';
  return `https://dev.azure.com/${org}/${project}/_workitems/edit/${workItemId}`;
}

// Get sprint work items (simple list for widget)
export async function getSprintWorkItems(iterationPath, { assignedTo } = {}) {
  const params = new URLSearchParams();
  if (assignedTo) params.append('assignedTo', assignedTo);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return fetchJson(`${API_BASE}/iterations/${encodeURIComponent(iterationPath)}/workitems${queryString}`);
}

// Get pull requests
export async function getPullRequests({ status = 'active', top = 20 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (top) params.append('$top', top);
  return fetchJson(`${API_BASE}/prs?${params.toString()}`);
}
