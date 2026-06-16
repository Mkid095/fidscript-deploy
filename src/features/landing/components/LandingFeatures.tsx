import React from 'react';
import { Server, Layers, Shield } from 'lucide-react';

export default function LandingFeatures() {
  return (
    <div className="border-t border-slate-900 pt-16 mb-24">
      <h2 className="text-center text-xs font-bold font-mono tracking-wider text-slate-500 uppercase mb-12">
        INTEGRATED CLUSTER INFRASTRUCTURE
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#0d1015]/80 border border-slate-850 hover:border-red-500/20 transition group">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 group-hover:scale-105 transition-transform">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base mb-2">Application Hosting</h3>
          <p className="text-slate-450 text-xs leading-relaxed">
            Compile and run web apps on a private Docker system automatically. Standard reverse-proxy configuration ensures zero downtime via Traefik.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-[#0d1015]/80 border border-slate-850 hover:border-red-500/20 transition group">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base mb-2">Realtime & Event Bus</h3>
          <p className="text-slate-450 text-xs leading-relaxed">
            Utilize integrated NATS pub/sub state engines to deliver reactive live notifications, database triggers, and message streams out of the box.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-[#0d1015]/80 border border-slate-850 hover:border-red-500/20 transition group">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base mb-2">Stalwart Mail Integration</h3>
          <p className="text-slate-450 text-xs leading-relaxed">
            Send transactional client emails and handle inbox pipelines securely using an embedded secure Stalwart SMTP mail system.
          </p>
        </div>
      </div>
    </div>
  );
}
