import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const ADO_ORG = process.env.ADO_ORG;
const ADO_PROJECT = process.env.ADO_PROJECT;
const ADO_PAT = process.env.ADO_PAT;

if (!ADO_ORG || !ADO_PROJECT || !ADO_PAT) {
  console.error('Missing required env vars: ADO_ORG, ADO_PROJECT, ADO_PAT');
  process.exit(1);
}

const BASE_URL = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis`;
const authHeader = {
  'Authorization': `Basic ${Buffer.from(':' + ADO_PAT).toString('base64')}`,
  'Content-Type': 'application/json'
};

async function adoFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...authHeader, ...options.headers }
  });
  
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }
  
  if (response.status === 204 || response.status === 404) {
    return null;
  }
  
  return response.json();
}

// Delete a work item (moves to recycle bin)
async function deleteWorkItem(id) {
  const url = `${BASE_URL}/wit/workitems/${id}?api-version=7.1`;
  await adoFetch(url, { method: 'DELETE' });
  console.log(`  Deleted work item ${id}`);
}

// Get all work items created by scaffold (by title patterns)
async function getScaffoldWorkItems() {
  const titles = [
    'ML Platform Infrastructure',
    'MLOps CI/CD Pipeline', 
    'ML Monitoring & Observability',
    'GPU Cluster Setup',
    'Model Registry',
    'Training Pipeline',
    'Model Deployment Pipeline',
    'Model Performance Monitoring'
  ];
  
  const query = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.TeamProject] = '${ADO_PROJECT}'
    AND (
      ${titles.map(t => `[System.Title] = '${t}'`).join(' OR ')}
      OR [System.Title] CONTAINS 'Configure Kubernetes'
      OR [System.Title] CONTAINS 'NVIDIA'
      OR [System.Title] CONTAINS 'MLflow'
      OR [System.Title] CONTAINS 'Azure Blob'
      OR [System.Title] CONTAINS 'data validation'
      OR [System.Title] CONTAINS 'hyperparameter'
      OR [System.Title] CONTAINS 'canary deployment'
      OR [System.Title] CONTAINS 'A/B testing'
      OR [System.Title] CONTAINS 'Prometheus'
      OR [System.Title] CONTAINS 'Grafana'
      OR [System.Title] CONTAINS 'schema validation'
      OR [System.Title] CONTAINS 'drift detection'
    )
  `;
  
  const url = `${BASE_URL}/wit/wiql?api-version=7.1`;
  const result = await adoFetch(url, {
    method: 'POST',
    body: JSON.stringify({ query })
  });
  
  return result?.workItems?.map(wi => wi.id) || [];
}

async function clean() {
  console.log(`\nCleaning scaffold data from: ${ADO_ORG}/${ADO_PROJECT}\n`);
  
  console.log('Finding scaffolded work items...');
  const ids = await getScaffoldWorkItems();
  
  if (ids.length === 0) {
    console.log('No scaffold work items found.');
    return;
  }
  
  console.log(`Found ${ids.length} work items to delete.\n`);
  
  console.log('Deleting work items...');
  for (const id of ids) {
    try {
      await deleteWorkItem(id);
    } catch (err) {
      console.log(`  Failed to delete ${id}: ${err.message}`);
    }
  }
  
  console.log('\n✅ Clean complete!');
  console.log('Note: Iterations are not deleted (they may contain other work).');
  console.log('Delete them manually in Project Settings > Boards > Team configuration if needed.');
}

clean().catch(err => {
  console.error('Clean failed:', err.message);
  process.exit(1);
});
