import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const ADO_ORG = process.env.ADO_ORG;
const ADO_PROJECT = process.env.ADO_PROJECT_PRS || process.env.ADO_PROJECT;
const ADO_PAT = process.env.ADO_PAT;

if (!ADO_ORG || !ADO_PROJECT || !ADO_PAT) {
  console.error('Missing required env vars: ADO_ORG, ADO_PROJECT (or ADO_PROJECT_PRS), ADO_PAT');
  process.exit(1);
}

const BASE_URL = `https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_apis`;
const authHeader = {
  'Authorization': `Basic ${Buffer.from(':' + ADO_PAT).toString('base64')}`,
  'Content-Type': 'application/json'
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

// Get or create a test repository
async function getOrCreateRepo(repoName) {
  // List existing repos
  const repos = await adoFetch(`${BASE_URL}/git/repositories?api-version=7.1`);
  const existing = repos.value?.find(r => r.name === repoName);
  
  if (existing) {
    console.log(`Using existing repo: ${repoName}`);
    return existing;
  }
  
  console.log(`Creating repo: ${repoName}`);
  const repo = await adoFetch(`${BASE_URL}/git/repositories?api-version=7.1`, {
    method: 'POST',
    body: JSON.stringify({ name: repoName })
  });
  
  return repo;
}

// Initialize repo with a README if empty
async function initializeRepoIfEmpty(repo) {
  try {
    // Check if repo has any refs
    const refs = await adoFetch(`${BASE_URL}/git/repositories/${repo.id}/refs?api-version=7.1`);
    
    if (refs.value && refs.value.length > 0) {
      console.log(`Repo already has content`);
      return;
    }
  } catch (e) {
    // Refs might fail if repo is empty, that's ok
  }
  
  console.log(`Initializing repo with README...`);
  
  // Create initial commit with README
  const push = {
    refUpdates: [
      { name: 'refs/heads/main', oldObjectId: '0000000000000000000000000000000000000000' }
    ],
    commits: [
      {
        comment: 'Initial commit',
        changes: [
          {
            changeType: 'add',
            item: { path: '/README.md' },
            newContent: {
              content: `# ${repo.name}\n\nThis is a test repository for PR scaffolding.\n`,
              contentType: 'rawtext'
            }
          }
        ]
      }
    ]
  };
  
  await adoFetch(`${BASE_URL}/git/repositories/${repo.id}/pushes?api-version=7.1`, {
    method: 'POST',
    body: JSON.stringify(push)
  });
  
  console.log(`Repo initialized with README`);
}

// Create a branch and add a file
async function createBranchWithChanges(repo, branchName, fileName, fileContent, commitMessage) {
  // Get main branch
  const refs = await adoFetch(`${BASE_URL}/git/repositories/${repo.id}/refs?filter=heads/main&api-version=7.1`);
  const mainRef = refs.value?.[0];
  
  if (!mainRef) {
    throw new Error('No main branch found');
  }
  
  const mainCommitId = mainRef.objectId;
  
  // Check if branch already exists
  const branchRefs = await adoFetch(`${BASE_URL}/git/repositories/${repo.id}/refs?filter=heads/${branchName}&api-version=7.1`);
  
  if (branchRefs.value?.length > 0) {
    console.log(`Branch ${branchName} already exists, skipping`);
    return branchRefs.value[0];
  }
  
  console.log(`Creating branch: ${branchName}`);
  
  // Create branch with a new file
  const push = {
    refUpdates: [
      { name: `refs/heads/${branchName}`, oldObjectId: '0000000000000000000000000000000000000000' }
    ],
    commits: [
      {
        comment: commitMessage,
        changes: [
          {
            changeType: 'add',
            item: { path: `/${fileName}` },
            newContent: {
              content: fileContent,
              contentType: 'rawtext'
            }
          }
        ],
        parents: [mainCommitId]
      }
    ]
  };
  
  await adoFetch(`${BASE_URL}/git/repositories/${repo.id}/pushes?api-version=7.1`, {
    method: 'POST',
    body: JSON.stringify(push)
  });
  
  // Get the created branch ref
  const newRefs = await adoFetch(`${BASE_URL}/git/repositories/${repo.id}/refs?filter=heads/${branchName}&api-version=7.1`);
  return newRefs.value?.[0];
}

// Create a pull request
async function createPullRequest(repo, sourceBranch, title, description) {
  // Check if PR already exists
  const existingPrs = await adoFetch(
    `${BASE_URL}/git/repositories/${repo.id}/pullrequests?searchCriteria.sourceRefName=refs/heads/${sourceBranch}&searchCriteria.status=active&api-version=7.1`
  );
  
  if (existingPrs.value?.length > 0) {
    console.log(`PR already exists for branch ${sourceBranch}`);
    return existingPrs.value[0];
  }
  
  console.log(`Creating PR: ${title}`);
  
  const pr = await adoFetch(`${BASE_URL}/git/repositories/${repo.id}/pullrequests?api-version=7.1`, {
    method: 'POST',
    body: JSON.stringify({
      sourceRefName: `refs/heads/${sourceBranch}`,
      targetRefName: 'refs/heads/main',
      title,
      description
    })
  });
  
  return pr;
}

// Main scaffolding
async function main() {
  console.log(`\nScaffolding PRs in ${ADO_ORG}/${ADO_PROJECT}...\n`);
  
  // Create or get test repo
  const repo = await getOrCreateRepo('test-pr-repo');
  await initializeRepoIfEmpty(repo);
  
  // Sample PRs to create
  const prTemplates = [
    {
      branch: 'feature/add-authentication',
      file: 'src/auth.py',
      content: `"""Authentication module"""

def authenticate(username: str, password: str) -> bool:
    """Authenticate a user."""
    # TODO: Implement actual auth
    return True

def get_token(user_id: str) -> str:
    """Generate JWT token."""
    return f"token_{user_id}"
`,
      commit: 'Add authentication module',
      title: 'Add user authentication',
      description: 'Implements basic authentication with JWT tokens.\n\n- Adds authenticate() function\n- Adds get_token() function'
    },
    {
      branch: 'feature/update-pipeline',
      file: 'azure-pipelines.yml',
      content: `trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: echo "Building..."
    displayName: 'Build'
  
  - script: echo "Testing..."
    displayName: 'Test'
  
  - script: echo "Deploying..."
    displayName: 'Deploy'
`,
      commit: 'Update CI/CD pipeline',
      title: 'Update Azure Pipeline configuration',
      description: 'Updates the CI/CD pipeline with new build and deploy steps.'
    },
    {
      branch: 'bugfix/fix-data-loading',
      file: 'src/data_loader.py',
      content: `"""Data loading utilities"""
import pandas as pd

def load_csv(path: str) -> pd.DataFrame:
    """Load CSV file with proper error handling."""
    try:
        return pd.read_csv(path)
    except FileNotFoundError:
        raise ValueError(f"File not found: {path}")

def validate_data(df: pd.DataFrame) -> bool:
    """Validate dataframe."""
    return len(df) > 0 and not df.isnull().all().any()
`,
      commit: 'Fix data loading issues',
      title: 'Fix data loading error handling',
      description: 'Fixes issue where missing files caused crashes.\n\nCloses #123'
    },
    {
      branch: 'feature/add-monitoring',
      file: 'src/monitoring.py',
      content: `"""Monitoring and observability"""
import logging

logger = logging.getLogger(__name__)

def setup_logging(level: str = "INFO"):
    """Configure logging."""
    logging.basicConfig(level=level)
    logger.info("Logging configured")

def track_metric(name: str, value: float):
    """Track a metric."""
    logger.info(f"Metric: {name}={value}")
`,
      commit: 'Add monitoring utilities',
      title: 'Add monitoring and logging utilities',
      description: 'Adds basic monitoring infrastructure for MLOps.\n\n- Logging setup\n- Metric tracking'
    },
    {
      branch: 'docs/update-readme',
      file: 'docs/CONTRIBUTING.md',
      content: `# Contributing

## Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Code Style

- Follow PEP 8
- Add type hints
- Write docstrings
`,
      commit: 'Add contributing guide',
      title: 'Add contribution guidelines',
      description: 'Documents the contribution process for new developers.'
    }
  ];
  
  // Create branches and PRs
  for (const template of prTemplates) {
    try {
      await createBranchWithChanges(
        repo, 
        template.branch, 
        template.file, 
        template.content, 
        template.commit
      );
      
      const pr = await createPullRequest(
        repo,
        template.branch,
        template.title,
        template.description
      );
      
      console.log(`  Created PR #${pr.pullRequestId}: ${pr.title}`);
    } catch (error) {
      console.error(`  Error creating PR for ${template.branch}:`, error.message);
    }
  }
  
  console.log(`\nScaffolding complete!`);
  console.log(`View PRs at: https://dev.azure.com/${ADO_ORG}/${ADO_PROJECT}/_git/test-pr-repo/pullrequests\n`);
}

main().catch(console.error);
