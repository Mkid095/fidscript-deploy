import React from 'react';
import { Globe, Cpu, Database, Shield } from 'lucide-react';

const metrics = [
  { icon: Globe, label: 'TRAEFIK ROUTER', value: '100% ONLINE', color: 'emerald' },
  { icon: Cpu, label: 'AVERAGE PING', value: '1.2ms latency', color: 'red' },
  { icon: Database, label: 'ACTIVE DAEMONS', value: '6/6 Isolation', color: 'indigo' },
  { icon: Shield, label: 'SECURITY STATE', value: 'TLS ACME Activated', color: 'amber' }
];

const colorClasses = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
};

export default function LandingMetrics() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-14">
      {metrics.map((metric, idx) => (
        <div key={idx} className="bg-[#0b0e14]/90 border border-slate-900 rounded-xl p-3 flex items-center gap-3">
          <div className={`p-2 rounded ${colorClasses[metric.color as keyof typeof colorClasses]}`}>
            <metric.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">{metric.label}</div>
            <div className="text-xs text-white font-mono font-bold flex items-center gap-1">
              {metric.label === 'TRAEFIK ROUTER' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              {metric.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
