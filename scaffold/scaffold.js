import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const ADO_ORG = process.env.ADO_ORG;
const ADO_PROJECT = process.env.ADO_PROJECT;
const ADO_PAT = process.env.ADO_PAT;
const ADO_TEAM = process.env.ADO_TEAM || `${ADO_PROJECT} Team`;

if (!ADO_ORG || !ADO_PROJECT || !ADO_PAT) {
  console.error('Missing required env vars: ADO_ORG, ADO_PROJECT, ADO_PAT');
  process.exit(1);
}

const BASE_URL = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis`;
const authHeader = {
  'Authorization': `Basic ${Buffer.from(':' + ADO_PAT).toString('base64')}`,
  'Content-Type': 'application/json-patch+json'
};

// Helper to make API calls
async function adoFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...authHeader, ...options.headers }
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }
  
  return response.json();
}

// Create a work item
async function createWorkItem(type, title, fields = {}) {
  const ops = [
    { op: 'add', path: '/fields/System.Title', value: title },
  ];
  
  // Add optional fields
  if (fields.description) {
    ops.push({ op: 'add', path: '/fields/System.Description', value: fields.description });
  }
  if (fields.iterationPath) {
    ops.push({ op: 'add', path: '/fields/System.IterationPath', value: fields.iterationPath });
  }
  if (fields.areaPath) {
    ops.push({ op: 'add', path: '/fields/System.AreaPath', value: fields.areaPath });
  }
  if (fields.state) {
    ops.push({ op: 'add', path: '/fields/System.State', value: fields.state });
  }
  if (fields.assignedTo) {
    ops.push({ op: 'add', path: '/fields/System.AssignedTo', value: fields.assignedTo });
  }
  if (fields.parentId) {
    ops.push({
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'System.LinkTypes.Hierarchy-Reverse',
        url: `https://dev.azure.com/${ADO_ORG}/_apis/wit/workItems/${fields.parentId}`
      }
    });
  }
  
  const url = `${BASE_URL}/wit/workitems/$${encodeURIComponent(type)}?api-version=7.1`;
  const result = await adoFetch(url, {
    method: 'POST',
    body: JSON.stringify(ops)
  });
  
  console.log(`  Created ${type}: "${title}" (ID: ${result.id})`);
  return result;
}

// Create iteration (sprint)
async function createIteration(name, startDate, finishDate) {
  const url = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/wit/classificationnodes/Iterations?api-version=7.1`;
  
  try {
    const result = await adoFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        attributes: {
          startDate: startDate.toISOString(),
          finishDate: finishDate.toISOString()
        }
      })
    });
    console.log(`  Created Iteration: "${name}"`);
    return result;
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('already in use') || err.message.includes('409')) {
      console.log(`  Iteration "${name}" already exists, skipping`);
      return null;
    }
    throw err;
  }
}

// Add iteration to team's backlog
async function addIterationToTeam(iterationPath) {
  const url = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/${encodeURIComponent(ADO_TEAM)}/_apis/work/teamsettings/iterations?api-version=7.1`;
  
  try {
    await adoFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: iterationPath })
    });
    console.log(`  Added iteration to team backlog`);
  } catch (err) {
    // Often fails if already added, ignore
    console.log(`  (Iteration may already be in team backlog)`);
  }
}

// Get iteration ID by path
async function getIterationId(name) {
  const url = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis/wit/classificationnodes/Iterations/${encodeURIComponent(name)}?api-version=7.1`;
  try {
    const result = await adoFetch(url, {
      headers: { 'Content-Type': 'application/json' }
    });
    return result.identifier;
  } catch {
    return null;
  }
}

// Main scaffold function
async function scaffold() {
  console.log(`\nScaffolding ADO test data for: ${ADO_ORG}/${ADO_PROJECT}\n`);
  
  // ============================================
  // 1. Create Iterations (Sprints)
  // ============================================
  console.log('Creating iterations...');
  
  const today = new Date();
  const sprintLength = 14; // 2 weeks
  
  // Calculate sprint dates (past, current, future)
  const sprints = [
    {
      name: 'Sprint 1',
      start: new Date(today.getTime() - sprintLength * 2 * 24 * 60 * 60 * 1000),
      end: new Date(today.getTime() - sprintLength * 24 * 60 * 60 * 1000 - 1)
    },
    {
      name: 'Sprint 2',
      start: new Date(today.getTime() - sprintLength * 24 * 60 * 60 * 1000),
      end: new Date(today.getTime() - 1)
    },
    {
      name: 'Sprint 3',
      start: today,
      end: new Date(today.getTime() + sprintLength * 24 * 60 * 60 * 1000)
    },
    {
      name: 'Sprint 4',
      start: new Date(today.getTime() + sprintLength * 24 * 60 * 60 * 1000 + 1),
      end: new Date(today.getTime() + sprintLength * 2 * 24 * 60 * 60 * 1000)
    }
  ];
  
  for (const sprint of sprints) {
    await createIteration(sprint.name, sprint.start, sprint.end);
    const iterId = await getIterationId(sprint.name);
    if (iterId) {
      await addIterationToTeam(iterId);
    }
  }
  
  const currentSprint = `${ADO_PROJECT}\\Sprint 3`;
  const nextSprint = `${ADO_PROJECT}\\Sprint 4`;
  
  // ============================================
  // 2. Create Work Item Hierarchy
  // ============================================
  console.log('\nCreating work items...');
  
  // Epic 1: ML Platform Infrastructure
  const epic1 = await createWorkItem('Epic', 'ML Platform Infrastructure', {
    description: 'Core infrastructure for ML platform including compute, storage, and networking'
  });
  
  // Feature 1.1
  const feature1_1 = await createWorkItem('Feature', 'GPU Cluster Setup', {
    description: 'Set up GPU compute cluster for model training',
    parentId: epic1.id
  });
  
  await createWorkItem('User Story', 'Configure Kubernetes GPU node pool', {
    parentId: feature1_1.id,
    iterationPath: currentSprint
  });
  
  const story1_1_2 = await createWorkItem('User Story', 'Set up NVIDIA device plugin', {
    parentId: feature1_1.id,
    iterationPath: currentSprint
  });
  
  await createWorkItem('Task', 'Install NVIDIA drivers on nodes', {
    parentId: story1_1_2.id,
    iterationPath: currentSprint
  });
  
  await createWorkItem('Task', 'Deploy device plugin daemonset', {
    parentId: story1_1_2.id,
    iterationPath: currentSprint
  });
  
  // Feature 1.2
  const feature1_2 = await createWorkItem('Feature', 'Model Registry', {
    description: 'Centralized model registry for versioning and deployment',
    parentId: epic1.id
  });
  
  await createWorkItem('User Story', 'Deploy MLflow tracking server', {
    parentId: feature1_2.id,
    iterationPath: nextSprint
  });
  
  await createWorkItem('User Story', 'Configure Azure Blob storage backend', {
    parentId: feature1_2.id,
    iterationPath: nextSprint
  });
  
  // Epic 2: MLOps Pipeline
  const epic2 = await createWorkItem('Epic', 'MLOps CI/CD Pipeline', {
    description: 'Automated ML pipeline for training, validation, and deployment'
  });
  
  // Feature 2.1
  const feature2_1 = await createWorkItem('Feature', 'Training Pipeline', {
    description: 'Automated model training pipeline',
    parentId: epic2.id
  });
  
  const story2_1_1 = await createWorkItem('User Story', 'Create data validation step', {
    parentId: feature2_1.id,
    iterationPath: currentSprint
  });
  
  await createWorkItem('Task', 'Implement schema validation', {
    parentId: story2_1_1.id,
    iterationPath: currentSprint
  });
  
  await createWorkItem('Task', 'Add data drift detection', {
    parentId: story2_1_1.id,
    iterationPath: currentSprint
  });
  
  await createWorkItem('User Story', 'Implement hyperparameter tuning', {
    parentId: feature2_1.id,
    iterationPath: currentSprint
  });
  
  // Feature 2.2
  const feature2_2 = await createWorkItem('Feature', 'Model Deployment Pipeline', {
    description: 'Automated model deployment to production',
    parentId: epic2.id
  });
  
  await createWorkItem('User Story', 'Create canary deployment workflow', {
    parentId: feature2_2.id,
    iterationPath: nextSprint
  });
  
  await createWorkItem('User Story', 'Implement A/B testing framework', {
    parentId: feature2_2.id,
    iterationPath: nextSprint
  });
  
  // Epic 3: Monitoring & Observability
  const epic3 = await createWorkItem('Epic', 'ML Monitoring & Observability', {
    description: 'Monitoring, logging, and alerting for ML systems'
  });
  
  const feature3_1 = await createWorkItem('Feature', 'Model Performance Monitoring', {
    description: 'Real-time monitoring of model performance in production',
    parentId: epic3.id
  });
  
  await createWorkItem('User Story', 'Set up Prometheus metrics collection', {
    parentId: feature3_1.id,
    iterationPath: nextSprint
  });
  
  await createWorkItem('User Story', 'Create Grafana dashboards for model metrics', {
    parentId: feature3_1.id,
    iterationPath: nextSprint
  });
  
  console.log('\n✅ Scaffold complete!\n');
  console.log('Summary:');
  console.log('  - 4 Sprints (Sprint 1-4)');
  console.log('  - 3 Epics');
  console.log('  - 5 Features');
  console.log('  - 10 User Stories');
  console.log('  - 4 Tasks');
  console.log('\nYou can now start the dashboard to see the data.');
}

scaffold().catch(err => {
  console.error('Scaffold failed:', err.message);
  process.exit(1);
});
