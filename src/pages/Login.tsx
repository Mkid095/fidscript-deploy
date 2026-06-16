import React, { useState } from 'react';
import { Lock, Mail, ChevronRight, Zap, Play, Terminal } from 'lucide-react';

interface LoginProps {
  onNavigate: (route: string) => void;
}

export default function Login({ onNavigate }: LoginProps) {
  const [email, setEmail] = useState('admin@fidscript.local');
  const [password, setPassword] = useState('fire-red-password');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Standard transient authentication animation
    setTimeout(() => {
      setLoading(false);
      onNavigate('#/dashboard');
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20 relative">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-red-600/5 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="bg-[#0f1217] border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Floating top label badge */}
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-650 text-white font-mono font-bold text-[10px] uppercase tracking-wider px-3.5 py-1 rounded-full border border-red-500 shadow">
          SECURITY PROTOCOL
        </div>

        {/* Logotype Branding Header */}
        <div className="text-center mb-8 pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 mb-3">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-white mb-1">
            GATEWAY ACCESS PORTAL
          </h2>
          <p className="text-slate-400 text-xs font-sans">
            Authentication key check is requested to fetch server system matrices.
          </p>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-2">
              Operator Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-red-500 hover:border-slate-700 outline-none transition"
                placeholder="admin@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-2">
              Master Access Key
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-red-500 hover:border-slate-700 outline-none transition"
              />
            </div>
          </div>

          {/* Prompt action guidelines */}
          <div className="text-[10px] text-slate-400 font-mono flex items-start gap-1.5 p-2.5 rounded bg-slate-950 border border-slate-850">
            <Terminal className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <span>Note: Local demo contains pre-filled credentials. You can press unlock safely to enter.</span>
          </div>

          <button 
            type="submit"
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold transition flex items-center justify-center gap-2 text-xs shadow-md"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span> Checking...
              </span>
            ) : (
              <>
                <span>UNLOCK SYSTEM CONSOLE</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
