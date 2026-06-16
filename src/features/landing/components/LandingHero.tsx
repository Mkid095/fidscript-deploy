import React, { useState } from 'react';
import { Zap, Terminal, Monitor, Copy, Check } from 'lucide-react';

interface LandingHeroProps {
  onNavigate: (route: string) => void;
}

export default function LandingHero({ onNavigate }: LandingHeroProps) {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText('curl -sSL https://fidscript.dev/install.sh | bash');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center max-w-3xl mx-auto mb-10">
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-500/20 text-red-500 text-xs font-semibold tracking-wide animate-pulse">
          <Zap className="w-3.5 h-3.5" />
          <span>Transform any clean VPS into a private application cloud</span>
        </div>
      </div>
      <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-white mb-6 leading-none font-sans">
        Self-Hosted Developer <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
          Operating System
        </span>
      </h1>
      <p className="text-slate-400 text-sm sm:text-lg mb-8 leading-relaxed font-sans max-w-2xl mx-auto">
        Host applications, run real-time databases, configure mail server routines, and process deep queue events instantly on your own private hardware server. Simple, durable, and fully independent.
      </p>
      <div className="max-w-xl mx-auto bg-[#0c0f14]/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl mb-12 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs text-slate-400 font-mono ml-2">bootstrap_cloud.sh</span>
          </div>
          <button
            onClick={copyCommand}
            className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white flex items-center gap-1.5 transition border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied script' : 'Copy installer'}</span>
          </button>
        </div>
        <div className="font-mono text-sm px-2 py-1 select-all text-slate-200">
          <span className="text-red-500 font-bold">ubuntu@your-vps:~$</span> curl -sSL https://fidscript.dev/install.sh | bash
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-sm sm:max-w-md mx-auto">
        <button
          onClick={() => onNavigate('#/installer')}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold transition flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(239,68,68,0.2)]"
        >
          <Terminal className="w-4 h-4" />
          <span>Launch Virtual Setup Wizard</span>
        </button>
        <button
          onClick={() => onNavigate('#/dashboard')}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold transition flex items-center justify-center gap-2 text-sm"
        >
          <Monitor className="w-4 h-4" />
          <span>Open Service Console</span>
        </button>
      </div>
    </div>
  );
}
