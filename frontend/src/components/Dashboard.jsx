import React from 'react';
import RecentPRsWidget from './widgets/RecentPRsWidget';
import SprintWidget from './widgets/SprintWidget';
import WorkItemSearchWidget from './widgets/WorkItemSearchWidget';
import PinnedWidget from './widgets/PinnedWidget';

export default function Dashboard() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Quick overview of your ADO activity</p>
      </div>
      
      {/* Widget Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full" style={{ minHeight: '600px' }}>
          {/* Row 1 */}
          <RecentPRsWidget className="min-h-[280px]" />
          <SprintWidget className="min-h-[280px]" />
          
          {/* Row 2 */}
          <WorkItemSearchWidget className="min-h-[280px]" />
          <PinnedWidget className="min-h-[280px]" />
        </div>
      </div>
    </div>
  );
}
