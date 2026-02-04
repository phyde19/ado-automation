# ADO Dashboard

A minimal, dense dashboard for quickly viewing Azure DevOps work items. Designed for MLOps engineers who need fast access to epics, features, user stories, and sprint information.

## Features

### Work Item Tree View
- View all epics in your project at a glance
- Expand to see the full hierarchy (Epic → Feature → User Story → Task)
- Case-insensitive search across all work items
- Click any item to open it directly in Azure DevOps

### Sprint View
- View work items for one or multiple sprints simultaneously
- Filter by team member to see individual workloads
- Filter by work item type (Epic, Feature, User Story, Task)
- Toggle between flat view and grouped-by-type view
- Current sprint is auto-selected and highlighted

## Quick Start

### Prerequisites
- Node.js 18+ 
- Azure DevOps Personal Access Token (PAT) with Work Items Read scope

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Azure DevOps details:

```bash
ADO_ORG=your-organization      # From: dev.azure.com/{org}
ADO_PROJECT=your-project       # Your project name
ADO_PAT=your-pat-token         # Create at: dev.azure.com/{org}/_usersSettings/tokens
```

### 2. Create PAT Token

1. Go to `https://dev.azure.com/{your-org}/_usersSettings/tokens`
2. Click "New Token"
3. Name: "ADO Dashboard" (or whatever you like)
4. Scopes: Select "Work Items" → "Read"
5. Click "Create" and copy the token to your `.env` file

### 3. Install & Run

```bash
# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies  
cd frontend && npm install && cd ..

# Run both (in separate terminals)
# Terminal 1 - Backend:
cd backend && npm run dev

# Terminal 2 - Frontend:
cd frontend && npm run dev
```

Open http://localhost:5173

## Usage

### Answering Common Questions

| Question | How to Find |
|----------|-------------|
| "Don't we have an epic for this?" | Use search in Work Item Tree |
| "Which epic did we just create?" | Work Item Tree shows epics by creation date (newest first) |
| "What features/stories under this WI?" | Expand the work item in tree view |
| "What's assigned to me this sprint?" | Sprint View → filter by your name |
| "What about a teammate?" | Sprint View → filter by their name |
| "What's the status of sprint items?" | Sprint View shows state badges for all items |

### Keyboard Shortcuts

- Search work items: Just start typing in the search box
- Click any work item ID (e.g., #12345) to open in ADO

### Tips

- **Multiple Sprints**: In Sprint View, click multiple sprint buttons to see work across sprints
- **Dense View**: The UI is intentionally compact—you can see many items at once
- **Caching**: Data is cached for 2-5 minutes to keep things fast. Click "Refresh" to force reload.

## Architecture

```
ado-dashboard/
├── backend/           # Express.js API proxy
│   └── server.js      # Handles ADO API calls with auth
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── components/
│       │   ├── EpicTreeView.jsx   # Hierarchical work item browser
│       │   ├── SprintView.jsx     # Sprint/iteration viewer
│       │   └── WorkItemBadge.jsx  # Reusable UI components
│       ├── hooks/
│       │   └── useApi.js          # Data fetching hooks
│       └── services/
│           └── api.js             # API client
└── .env               # Your configuration
```

### Why a Backend?

Azure DevOps API requires authentication. The backend:
1. Keeps your PAT token secure (not exposed to browser)
2. Proxies API requests with proper auth headers
3. Could be extended for caching, rate limiting, etc.

## Troubleshooting

### "Not Connected" Error

1. Make sure backend is running (`cd backend && npm run dev`)
2. Check your `.env` file has correct values
3. Verify your PAT token hasn't expired
4. Check PAT has "Work Items - Read" scope

### No Epics/Items Showing

1. Verify ADO_PROJECT matches your project name exactly
2. Check the project has epics (some use different work item types)
3. Try the search to see if any items appear

### "401 Unauthorized" in Console

Your PAT token is invalid or expired. Create a new one.

## Future Enhancements

This is a read-only v1. Potential additions:
- [ ] Quick edit state/assignment from dashboard
- [ ] Burndown/progress charts
- [ ] Board view (kanban-style)
- [ ] Saved filters/views
- [ ] Dark/light theme toggle
