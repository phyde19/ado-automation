# ADO Scaffold

Creates test data in Azure DevOps for testing the dashboard.

## What It Creates

**4 Iterations (Sprints):**
- Sprint 1 (past)
- Sprint 2 (past)
- Sprint 3 (current - includes today)
- Sprint 4 (future)

**Work Item Hierarchy:**
```
Epic: ML Platform Infrastructure
├── Feature: GPU Cluster Setup
│   ├── User Story: Configure Kubernetes GPU node pool
│   └── User Story: Set up NVIDIA device plugin
│       ├── Task: Install NVIDIA drivers on nodes
│       └── Task: Deploy device plugin daemonset
└── Feature: Model Registry
    ├── User Story: Deploy MLflow tracking server
    └── User Story: Configure Azure Blob storage backend

Epic: MLOps CI/CD Pipeline
├── Feature: Training Pipeline
│   ├── User Story: Create data validation step (Resolved)
│   │   ├── Task: Implement schema validation (Closed)
│   │   └── Task: Add data drift detection (Closed)
│   └── User Story: Implement hyperparameter tuning
└── Feature: Model Deployment Pipeline
    ├── User Story: Create canary deployment workflow
    └── User Story: Implement A/B testing framework

Epic: ML Monitoring & Observability
└── Feature: Model Performance Monitoring
    ├── User Story: Set up Prometheus metrics collection
    └── User Story: Create Grafana dashboards
```

## Prerequisites

Your PAT token needs **Work Items (Read & Write)** scope, not just Read.

Update your `.env` if needed:
```bash
ADO_PAT=your-pat-with-write-scope
```

Optionally set a specific team:
```bash
ADO_TEAM=Your Team Name
```

## Usage

```bash
cd scaffold
npm install

# Create test data
npm run scaffold

# Clean up (deletes created work items)
npm run clean
```

## Notes

- The scaffold is idempotent for iterations (won't duplicate)
- Work items are created fresh each time (will duplicate if run multiple times)
- Clean only deletes work items matching scaffold patterns
- Iterations are NOT deleted by clean (do manually if needed)
