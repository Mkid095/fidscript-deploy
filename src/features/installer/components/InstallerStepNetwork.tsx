import React from 'react';
import { Globe, ChevronRight } from 'lucide-react';

interface InstallerStepNetworkProps {
  hostname: string;
  setHostname: (v: string) => void;
  adminEmail: string;
  setAdminEmail: (v: string) => void;
  adminPassword: string;
  setAdminPassword: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function InstallerStepNetwork({
  hostname, setHostname,
  adminEmail, setAdminEmail,
  adminPassword, setAdminPassword,
  onBack, onNext
}: InstallerStepNetworkProps) {
  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Globe className="text-red-500 w-5 h-5" />
        <span>2. Cluster Networking & Identity Parameters</span>
      </h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Enter the parent domain name linked to your virtual private server's IP. Traefik coordinates ACME SSL routers instantly.
      </p>
      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Main VPS Domain Pointer</label>
          <input
            type="text"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-750 text-white font-mono text-sm focus:border-red-500 outline-none transition"
            placeholder="fidscript.company.com"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cluster Admin Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-750 text-white font-mono text-sm focus:border-red-500 outline-none transition"
              placeholder="admin@domain.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cluster Master Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-750 text-white font-mono text-sm focus:border-red-500 outline-none transition"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between pt-4 border-t border-slate-800">
        <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition">Back</button>
        <button
          onClick={onNext}
          className="px-5 py-2.5 rounded-lg bg-red-650 hover:bg-red-600 text-white font-bold transition flex items-center gap-2 text-sm"
        >
          <span>Continue to Services</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
