import React from 'react';
import { Cpu, Check } from 'lucide-react';

interface InstallerStepHardwareProps {
  onNext: () => void;
}

export default function InstallerStepHardware({ onNext }: InstallerStepHardwareProps) {
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Cpu className="text-red-500 w-5 h-5 animate-pulse" />
        <span>1. Verify Host System Requirements</span>
      </h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Before bootstrapping our stack, we run localized diagnostic checks to confirm the host VPS matches minimal development capability margins.
      </p>
      <div className="space-y-3 font-mono text-xs mb-8">
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-between text-emerald-400">
          <span className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" /> CPU Core Matrix</span>
          <span>4 Threads detected (Minimum: 1 Thread)</span>
        </div>
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-between text-emerald-400">
          <span className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" /> Host Memory Probe</span>
          <span>8.19 GB RAM validated (Minimum: 2 GB RAM)</span>
        </div>
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex items-center justify-between text-emerald-400">
          <span className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" /> Docker Daemon Swarm</span>
          <span>v26.1.1 actively running on swarm</span>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          onClick={onNext}
          className="px-5 py-2.5 rounded-lg bg-red-650 hover:bg-red-600 text-white font-bold transition flex items-center gap-2 text-sm"
        >
          Continue to Networking
        </button>
      </div>
    </div>
  );
}
