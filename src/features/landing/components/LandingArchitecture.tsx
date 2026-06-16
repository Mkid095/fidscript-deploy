import React from 'react';

export default function LandingArchitecture() {
  return (
    <div className="bg-[#0b0d12]/90 border border-slate-850/80 rounded-2xl p-6 sm:p-8 mb-24 relative">
      <div className="absolute top-0 right-10 -translate-y-1/2 bg-red-650 text-white text-[9px] font-mono font-bold px-3 py-1 rounded-full border border-red-500">
        SYSTEM ARCHITECTURE BLUEPRINT
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        <div className="lg:col-span-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
            Structured Single-Host Isolation
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
            Most cloud providers compartmentalize architectures to inflate billing structures. FIDScript takes an alternative approach.
          </p>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
            By routing external ingress through a high-performance Traefik reverse-proxy, your client websites, application backends, PostgreSQL databases, Redis systems, NATS events, and SMTP relays exist safely in sandboxed Docker networks on a single server machine.
          </p>
          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded bg-red-500" />
              <span>ACME automated Let's Encrypt keys validation</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded bg-rose-500" />
              <span>Internal system network telemetry isolation</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded bg-amber-500" />
              <span>Configured nightly cluster backups directly to S3</span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 bg-black/60 rounded-xl border border-slate-900 p-6 font-mono text-[11px] text-slate-300 overflow-x-auto select-none">
          <div className="text-[10px] text-slate-550 mb-4 border-b border-slate-900 pb-2 flex justify-between font-bold">
            <span>VPS INGRESS BRIDGE PROTOCOL</span>
            <span>STATE: ACTIVE</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="px-4 py-2 rounded bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 text-center font-bold min-w-[200px]">
                Client Request (HTTPS)
              </div>
            </div>
            <div className="flex justify-center text-red-500 animate-pulse h-4">-↓-</div>
            <div className="flex justify-center">
              <div className="px-5 py-2.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-center font-bold min-w-[220px]">
                Traefik Reverse-Proxy
                <div className="text-[9px] text-slate-450 font-normal">Automated TLS SSL Resolver</div>
              </div>
            </div>
            <div className="flex justify-center font-bold text-slate-600">
              /─────────────┼─────────────\
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded bg-slate-950 border border-slate-850">
                <div className="text-white font-bold mb-1 flex items-center gap-1.5">
                  <code className="text-emerald-400 font-bold">App Containers</code>
                </div>
                <div className="text-[10px] text-slate-500">React SPAs & Flask/Node API deamons isolated dynamically.</div>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-850">
                <div className="text-white font-bold mb-1 flex items-center gap-1.5">
                  <code className="text-amber-400 font-bold">PostgreSQL Stack</code>
                </div>
                <div className="text-[10px] text-slate-500">Storage pool mapped on Docker volumes with encryption.</div>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-850">
                <div className="text-white font-bold mb-1 flex items-center gap-1.5">
                  <code className="text-cyan-400 font-bold">NATS Messaging</code>
                </div>
                <div className="text-[10px] text-slate-500">Real-time dynamic cluster websocket data transfer.</div>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-850">
                <div className="text-white font-bold mb-1 flex items-center gap-1.5">
                  <code className="text-rose-400 font-bold">Stalwart Mail</code>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">Full DKIM & SPF validated secure transactional SMTP.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
