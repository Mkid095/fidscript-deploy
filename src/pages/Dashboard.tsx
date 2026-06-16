import React from 'react';
import { Server, Database, Globe, Terminal, Activity } from 'lucide-react';

const tabs = [
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'projects', label: 'Projects', icon: Server },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'domains', label: 'Domains', icon: Globe },
  { id: 'system', label: 'System', icon: Terminal },
];

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Service Console</h1>
        <p className="text-sm text-slate-400">FIDScript Deploy Control Plane</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="bg-[#0f1217] border border-slate-800 rounded-xl p-4 flex items-center gap-3"
          >
            <tab.icon className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-white">{tab.label}</span>
          </div>
        ))}
      </div>
      <div className="bg-[#0f1217] border border-slate-800 rounded-xl p-6">
        <p className="text-slate-400 text-sm">
          Dashboard components will be implemented in Phase 01 when the backend API is ready.
        </p>
      </div>
    </div>
  );
}
