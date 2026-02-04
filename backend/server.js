import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Azure DevOps config
const ADO_ORG = process.env.ADO_ORG;
const ADO_PROJECT = process.env.ADO_PROJECT;
const ADO_PAT = process.env.ADO_PAT;

const BASE_URL = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis`;
const ORG_URL = `https://dev.azure.com/${ADO_ORG}/_apis`;

// Auth header for ADO API
const authHeader = {
  'Authorization': `Basic ${Buffer.from(':' + ADO_PAT).toString('base64')}`,
  'Content-Type': 'application/json'
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    configured: !!(ADO_ORG && ADO_PROJECT && ADO_PAT),
    org: ADO_ORG,
    project: ADO_PROJECT
  });
});

// Get all iterations (sprints)
app.get('/api/iterations', async (req, res) => {
  try {
    const team = req.query.team || `${ADO_PROJECT} Team`;
    const url = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations?api-version=7.1`;
    
    const response = await fetch(url, { headers: authHeader });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching iterations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current iteration
app.get('/api/iterations/current', async (req, res) => {
  try {
    const team = req.query.team || `${ADO_PROJECT} Team`;
    const url = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/${encodeURIComponent(team)}/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.1`;
    
    const response = await fetch(url, { headers: authHeader });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching current iteration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get team members
app.get('/api/teams/:teamId/members', async (req, res) => {
  try {
    const url = `${ORG_URL}/projects/${ADO_PROJECT}/teams/${encodeURIComponent(req.params.teamId)}/members?api-version=7.1`;
    
    const response = await fetch(url, { headers: authHeader });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const url = `${ORG_URL}/projects/${ADO_PROJECT}/teams?api-version=7.1`;
    
    const response = await fetch(url, { headers: authHeader });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute WIQL query
app.post('/api/wiql', async (req, res) => {
  try {
    const url = `${BASE_URL}/wit/wiql?api-version=7.1`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ query: req.body.query })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error executing WIQL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get work items by IDs (batch)
app.post('/api/workitems/batch', async (req, res) => {
  try {
    const ids = req.body.ids;
    if (!ids || ids.length === 0) {
      return res.json({ value: [] });
    }
    
    // ADO API limits to 200 items per request
    const chunks = [];
    for (let i = 0; i < ids.length; i += 200) {
      chunks.push(ids.slice(i, i + 200));
    }
    
    const allWorkItems = [];
    for (const chunk of chunks) {
      const url = `${BASE_URL}/wit/workitems?ids=${chunk.join(',')}&$expand=relations&api-version=7.1`;
      
      const response = await fetch(url, { headers: authHeader });
      const data = await response.json();
      if (data.value) {
        allWorkItems.push(...data.value);
      }
    }
    
    res.json({ value: allWorkItems });
  } catch (error) {
    console.error('Error fetching work items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single work item
app.get('/api/workitems/:id', async (req, res) => {
  try {
    const url = `${BASE_URL}/wit/workitems/${req.params.id}?$expand=relations&api-version=7.1`;
    
    const response = await fetch(url, { headers: authHeader });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching work item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get work items by type (for tree root)
// type: All|Epic|Feature|User Story|Task (defaults to Epic)
app.get('/api/workitems', async (req, res) => {
  try {
    const type = req.query.type || 'Epic';

    let typeFilter;
    if (type === 'All') {
      typeFilter = `[System.WorkItemType] IN ('Epic', 'Feature', 'User Story', 'Task')`;
    } else {
      typeFilter = `[System.WorkItemType] = '${type}'`;
    }

    const query = `
      SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.AreaPath], [System.IterationPath]
      FROM WorkItems
      WHERE ${typeFilter}
      AND [System.State] <> 'Removed'
      ORDER BY [System.WorkItemType], [System.CreatedDate] DESC
    `;

    const wiqlUrl = `${BASE_URL}/wit/wiql?api-version=7.1`;
    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ query })
    });
    const wiqlData = await wiqlResponse.json();

    if (!wiqlData.workItems || wiqlData.workItems.length === 0) {
      return res.json({ value: [] });
    }

    const ids = wiqlData.workItems.map(wi => wi.id);

    // Reuse the same chunking logic as batch endpoint (ADO limit ~200 per request)
    const chunks = [];
    for (let i = 0; i < ids.length; i += 200) {
      chunks.push(ids.slice(i, i + 200));
    }

    const allWorkItems = [];
    for (const chunk of chunks) {
      const workItemsUrl = `${BASE_URL}/wit/workitems?ids=${chunk.join(',')}&$expand=relations&api-version=7.1`;
      const workItemsResponse = await fetch(workItemsUrl, { headers: authHeader });
      const workItemsData = await workItemsResponse.json();
      if (workItemsData.value) {
        allWorkItems.push(...workItemsData.value);
      }
    }

    res.json({ value: allWorkItems });
  } catch (error) {
    console.error('Error fetching workitems by type:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all epics (for tree view root)
app.get('/api/epics', async (req, res) => {
  try {
    const query = `
      SELECT [System.Id], [System.Title], [System.State], [System.AreaPath], [System.IterationPath]
      FROM WorkItems
      WHERE [System.WorkItemType] = 'Epic'
      AND [System.State] <> 'Removed'
      ORDER BY [System.CreatedDate] DESC
    `;
    
    const wiqlUrl = `${BASE_URL}/wit/wiql?api-version=7.1`;
    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ query })
    });
    const wiqlData = await wiqlResponse.json();
    
    if (!wiqlData.workItems || wiqlData.workItems.length === 0) {
      return res.json({ value: [] });
    }
    
    const ids = wiqlData.workItems.map(wi => wi.id);

    const chunks = [];
    for (let i = 0; i < ids.length; i += 200) {
      chunks.push(ids.slice(i, i + 200));
    }

    const allWorkItems = [];
    for (const chunk of chunks) {
      const workItemsUrl = `${BASE_URL}/wit/workitems?ids=${chunk.join(',')}&$expand=relations&api-version=7.1`;
      const workItemsResponse = await fetch(workItemsUrl, { headers: authHeader });
      const workItemsData = await workItemsResponse.json();
      if (workItemsData.value) {
        allWorkItems.push(...workItemsData.value);
      }
    }

    res.json({ value: allWorkItems });
  } catch (error) {
    console.error('Error fetching epics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get work items for an iteration (sprint)
app.get('/api/iterations/:iterationPath/workitems', async (req, res) => {
  try {
    const iterationPath = decodeURIComponent(req.params.iterationPath);
    const assignedTo = req.query.assignedTo;
    const workItemType = req.query.type;
    
    let query = `
      SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
      FROM WorkItems
      WHERE [System.IterationPath] = '${iterationPath}'
      AND [System.State] <> 'Removed'
    `;
    
    if (assignedTo) {
      query += ` AND [System.AssignedTo] = '${assignedTo}'`;
    }
    
    if (workItemType) {
      query += ` AND [System.WorkItemType] = '${workItemType}'`;
    }
    
    query += ` ORDER BY [System.WorkItemType], [System.State]`;
    
    const wiqlUrl = `${BASE_URL}/wit/wiql?api-version=7.1`;
    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ query })
    });
    const wiqlData = await wiqlResponse.json();
    
    if (!wiqlData.workItems || wiqlData.workItems.length === 0) {
      return res.json({ value: [] });
    }
    
    const ids = wiqlData.workItems.map(wi => wi.id);
    const workItemsUrl = `${BASE_URL}/wit/workitems?ids=${ids.slice(0, 200).join(',')}&$expand=relations&api-version=7.1`;
    
    const workItemsResponse = await fetch(workItemsUrl, { headers: authHeader });
    const workItemsData = await workItemsResponse.json();
    
    res.json(workItemsData);
  } catch (error) {
    console.error('Error fetching iteration work items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sprint work items + all ancestors needed to build a parent-chain tree
// Returns { value: WorkItem[], sprintIds: number[] }
app.get('/api/iterations/:iterationPath/tree', async (req, res) => {
  try {
    const iterationPath = decodeURIComponent(req.params.iterationPath);
    const assignedTo = req.query.assignedTo;

    let query = `
      SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType]
      FROM WorkItems
      WHERE [System.IterationPath] = '${iterationPath}'
      AND [System.State] <> 'Removed'
    `;

    if (assignedTo) {
      query += ` AND [System.AssignedTo] = '${assignedTo}'`;
    }

    query += ` ORDER BY [System.WorkItemType], [System.State]`;

    // 1) Fetch sprint items via WIQL
    const wiqlUrl = `${BASE_URL}/wit/wiql?api-version=7.1`;
    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ query })
    });
    const wiqlData = await wiqlResponse.json();

    const sprintIds = (wiqlData.workItems || []).map(wi => wi.id);
    if (sprintIds.length === 0) {
      return res.json({ value: [], sprintIds: [] });
    }

    // Helper: fetch work items by ids with relations (chunked)
    async function fetchWorkItemsByIds(ids) {
      const chunks = [];
      for (let i = 0; i < ids.length; i += 200) {
        chunks.push(ids.slice(i, i + 200));
      }
      const items = [];
      for (const chunk of chunks) {
        const url = `${BASE_URL}/wit/workitems?ids=${chunk.join(',')}&$expand=relations&api-version=7.1`;
        const r = await fetch(url, { headers: authHeader });
        const d = await r.json();
        if (d.value) items.push(...d.value);
      }
      return items;
    }

    // 2) Fetch sprint items (with relations)
    const allById = new Map();
    const sprintItems = await fetchWorkItemsByIds(sprintIds);
    for (const it of sprintItems) allById.set(it.id, it);

    // 3) Walk parents until exhaustion
    const getParentId = (item) => {
      const rel = item?.relations?.find(r => r.rel === 'System.LinkTypes.Hierarchy-Reverse');
      if (!rel?.url) return null;
      const m = rel.url.match(/(\d+)\s*$/);
      return m ? Number(m[1]) : null;
    };

    let frontier = new Set();
    for (const it of sprintItems) {
      const pid = getParentId(it);
      if (pid && !allById.has(pid)) frontier.add(pid);
    }

    // Safety caps to avoid runaway graphs
    const MAX_TOTAL = 4000;
    const MAX_LOOPS = 50;
    let loops = 0;

    while (frontier.size > 0 && allById.size < MAX_TOTAL && loops < MAX_LOOPS) {
      loops += 1;
      const idsToFetch = Array.from(frontier);
      frontier = new Set();

      const parents = await fetchWorkItemsByIds(idsToFetch);
      for (const p of parents) {
        if (!allById.has(p.id)) allById.set(p.id, p);
      }

      for (const p of parents) {
        const pid = getParentId(p);
        if (pid && !allById.has(pid)) frontier.add(pid);
      }
    }

    res.json({ value: Array.from(allById.values()), sprintIds });
  } catch (error) {
    console.error('Error building iteration tree:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get children of a work item
app.get('/api/workitems/:id/children', async (req, res) => {
  try {
    const parentId = req.params.id;
    
    const query = `
      SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo]
      FROM WorkItemLinks
      WHERE ([Source].[System.Id] = ${parentId})
      AND ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward')
      MODE (MustContain)
    `;
    
    const wiqlUrl = `${BASE_URL}/wit/wiql?api-version=7.1`;
    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ query })
    });
    const wiqlData = await wiqlResponse.json();
    
    if (!wiqlData.workItemRelations || wiqlData.workItemRelations.length === 0) {
      return res.json({ value: [] });
    }
    
    // Filter out the source (parent) item - we only want targets (children)
    const childIds = wiqlData.workItemRelations
      .filter(rel => rel.target && rel.target.id !== parseInt(parentId))
      .map(rel => rel.target.id);
    
    if (childIds.length === 0) {
      return res.json({ value: [] });
    }
    
    const workItemsUrl = `${BASE_URL}/wit/workitems?ids=${childIds.slice(0, 200).join(',')}&$expand=relations&api-version=7.1`;
    
    const workItemsResponse = await fetch(workItemsUrl, { headers: authHeader });
    const workItemsData = await workItemsResponse.json();
    
    res.json(workItemsData);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search work items
app.get('/api/search', async (req, res) => {
  try {
    const searchText = req.query.q || '';
    const type = req.query.type || 'All';
    
    // Build type filter
    let typeFilter = '';
    if (type !== 'All') {
      typeFilter = `AND [System.WorkItemType] = '${type}'`;
    }
    
    const query = `
      SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo]
      FROM WorkItems
      WHERE [System.Title] CONTAINS '${searchText}'
      AND [System.State] <> 'Removed'
      ${typeFilter}
      ORDER BY [System.WorkItemType], [System.ChangedDate] DESC
    `;
    
    const wiqlUrl = `${BASE_URL}/wit/wiql?api-version=7.1`;
    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ query })
    });
    const wiqlData = await wiqlResponse.json();
    
    if (!wiqlData.workItems || wiqlData.workItems.length === 0) {
      return res.json({ value: [] });
    }
    
    const ids = wiqlData.workItems.map(wi => wi.id).slice(0, 100);
    const workItemsUrl = `${BASE_URL}/wit/workitems?ids=${ids.join(',')}&api-version=7.1`;
    
    const workItemsResponse = await fetch(workItemsUrl, { headers: authHeader });
    const workItemsData = await workItemsResponse.json();
    
    res.json(workItemsData);
  } catch (error) {
    console.error('Error searching work items:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ADO Dashboard backend running on port ${PORT}`);
  console.log(`Configured for org: ${ADO_ORG}, project: ${ADO_PROJECT}`);
});
