import React from 'react';
import { Database, Play } from 'lucide-react';

interface InstallerStepConfigProps {
  onBack: () => void;
  onRun: () => void;
}

const services = [
  { name: 'PostgreSQL Database Cluster', ver: 'v16.3', desc: 'Saves master metadata logs and persistent service configurations.' },
  { name: 'Redis Cache Memory Pool', ver: 'v7.2', desc: 'Enables responsive websocket buffers and fast index caching.' },
  { name: 'Stalwart SMTP Mail Service', ver: 'v0.10', desc: 'Secure transactional mailer and IMAP inbox server.' },
  { name: 'NATS Queue Message Bus', ver: 'v2.10', desc: 'Durable, fast event distribution broker for real-time applications.' }
];

export default function InstallerStepConfig({ onBack, onRun }: InstallerStepConfigProps) {
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
        <Database className="text-red-500 w-5 h-5" />
        <span>3. Configure Infrastructure Modules</span>
      </h3>
      <p className="text-xs text-slate-400 mb-6 font-medium">
        We deploy independent services isolated inside virtual docker networks. Select standard services to pack inside this install:
      </p>
      <div className="space-y-3 mb-8">
        {services.map((srv, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 flex items-start gap-3">
            <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 rounded accent-red-500 cursor-pointer" />
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span>{srv.name}</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">{srv.ver}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{srv.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-4 border-t border-slate-800">
        <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition">Back</button>
        <button
          onClick={onRun}
          className="px-6 py-3 rounded-lg bg-red-650 hover:bg-red-700 text-white font-bold transition shadow-lg hover:shadow-red-500/10 flex items-center gap-2 text-sm animate-pulse"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Run Automated Setup Boot</span>
        </button>
      </div>
    </div>
  );
}
