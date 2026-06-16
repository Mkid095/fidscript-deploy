import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Globe, Database, Play, ChevronRight, Check, RefreshCw, Terminal, CheckCircle } from 'lucide-react';

interface InstallerProps {
  onNavigate: (route: string) => void;
}

export default function Installer({ onNavigate }: InstallerProps) {
  const [step, setStep] = useState<number>(1);
  const [hostname, setHostname] = useState<string>('fidscript.mycompany.dev');
  const [adminEmail, setAdminEmail] = useState<string>('admin@fidscript.local');
  const [adminPassword, setAdminPassword] = useState<string>('master-password-red');
  const [logs, setLogs] = useState<string[]>([]);
  const [installing, setInstalling] = useState<boolean>(false);
  
  const terminalLogsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalLogsEndRef.current) {
      terminalLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const runSystemSetup = () => {
    setInstalling(true);
    setStep(4);
    setLogs(['[DIAGNOSTICS] Starting hardware compatibility diagnostics...']);

    const steps = [
      '[DIAGNOSTICS] Operating System detected: Linux 6.8.0 x86_64 Ubuntu',
      '[DIAGNOSTICS] Core processor capabilities: 4 active physical threads [PASSED]',
      '[DIAGNOSTICS] Memory pool validation: 8.19 GB swap partition registered [PASSED]',
      '[DIAGNOSTICS] Docker engine daemon container status: active (v26.1.1) [PASSED]',
      '[BOOTSTRAP] Structuring cluster root path directory: /var/lib/fidscript',
      `[BOOTSTRAP] Registering routing domain: *.${hostname} on proxy config`,
      `[BOOTSTRAP] Requesting automated security keys from Let\'s Encrypt for root domain...`,
      '[BOOTSTRAP] Pulling shared service container templates standard library...',
      '[DOCKER-COMPOSE] Pulling postgresql:16 image database nodes... [OK]',
      '[DOCKER-COMPOSE] Pulling redis:7.2-alpine caching pools... [OK]',
      '[DOCKER-COMPOSE] Pulling stalwart-mailserver:v0.10 transactional SMTP server... [OK]',
      '[DOCKER-COMPOSE] Pulling nats:latest high speed event broker... [OK]',
      '[DOCKER-COMPOSE] Launching infrastructure stack bridge network...',
      `[DATABASE] Registering host administrator account credentials for: ${adminEmail}`,
      '[SYSTEMD] Mounting cluster logging agents with Loki standard streams...',
      `[SUCCESS] FIDScript Deploy successfully mounted. Control plane active at https://${hostname} ✅`
    ];

    steps.forEach((line, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, line]);
        if (index === steps.length - 1) {
          setInstalling(false);
        }
      }, (index + 1) * 350);
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Visual Title */}
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Self-Hosted VPS Setup Wizard
        </h2>
        <p className="text-slate-400 text-sm">
          A few steps to initialize and setup PostgreSQL, Redis, Stalwart Mail, NATS, and Traefik onto your server cluster.
        </p>
      </div>

      {/* Numerical Step Indicators */}
      <div className="grid grid-cols-4 gap-2 mb-8 text-center text-xs font-semibold">
        {[
          { num: 1, label: 'Host Hardware' },
          { num: 2, label: 'Network & Admin' },
          { num: 3, label: 'Cluster Config' },
          { num: 4, label: 'Live Server Boot' }
        ].map(item => (
          <div 
            key={item.num}
            className={`pb-3 border-b-2 transition ${
              step >= item.num ? 'border-red-500 text-red-500' : 'border-slate-800 text-slate-500'
            }`}
          >
            <div className="font-mono text-sm mb-1">{item.num}</div>
            <div className="hidden sm:block">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Interactive Card wrapper */}
      <div className="bg-[#0f1217] border border-slate-800 p-8 rounded-2xl shadow-xl relative">
        
        {/* STEP 1: Hardware Diagnostics */}
        {step === 1 && (
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
                <span className="flex items-center gap-2"><Check className="w-4 h-4 shrink-0" /> Docker Daemon Daemon Swarm</span>
                <span>v26.1.1 actively running on swarm</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button 
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-lg bg-red-650 hover:bg-red-600 text-white font-bold transition flex items-center gap-2 text-sm"
              >
                <span>Continue to Networking</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Network setup */}
        {step === 2 && (
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
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-lg bg-red-650 hover:bg-red-600 text-white font-bold transition flex items-center gap-2 text-sm"
              >
                <span>Continue to Services</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Config list */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Database className="text-red-500 w-5 h-5" />
              <span>3. Configure Infrastructure Modules</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">
              We deploy independent services isolated inside virtual docker networks. Select standard services to pack inside this install:
            </p>

            <div className="space-y-3 mb-8">
              {[
                { name: 'PostgreSQL Database Cluster', ver: 'v16.3', desc: 'Saves master metadata logs and persistent service configurations.' },
                { name: 'Redis Cache Memory Pool', ver: 'v7.2', desc: 'Enables responsive websocket buffers and fast index caching.' },
                { name: 'Stalwart SMTP Mail Service', ver: 'v0.10', desc: 'Secure transactional mailer and IMAP inbox server.' },
                { name: 'NATS Queue Message Bus', ver: 'v2.10', desc: 'Durable, fast event distribution broker for real-time applications.' }
              ].map((srv, idx) => (
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
              <button 
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition"
              >
                Back
              </button>
              <button 
                onClick={runSystemSetup}
                className="px-6 py-3 rounded-lg bg-red-650 hover:bg-gradient-to-r hover:from-red-650 hover:to-red-750 text-white font-bold transition shadow-lg hover:shadow-red-500/10 flex items-center gap-2 text-sm animate-pulse-slow"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Run Automated Setup Boot</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Shell logs */}
        {step === 4 && (
          <div className="text-left font-mono">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4 mb-4">
              <h3 className="font-sans text-white font-bold text-base flex items-center gap-2">
                <Terminal className="text-red-500 w-5 h-5 animate-spin" />
                <span>Executing Bash Installer Scripts</span>
              </h3>
              {installing ? (
                <span className="text-xs text-red-500 font-bold flex items-center gap-1.5 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Booting cluster...
                </span>
              ) : (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> SUCCESSFUL
                </span>
              )}
            </div>

            <div className="bg-black/70 rounded-xl p-4 h-[280px] overflow-y-auto text-xs text-slate-300 leading-relaxed border border-slate-850">
              {logs.map((log, index) => {
                const isSuccess = log.includes('[SUCCESS]');
                const isCheck = log.includes('[DIAGNOSTICS]');
                return (
                  <div 
                    key={index} 
                    className={`mb-1 transition-opacity ${
                      isSuccess ? 'text-emerald-400 font-bold' : isCheck ? 'text-cyan-400' : 'text-slate-300'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
              <div ref={terminalLogsEndRef} />
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button 
                onClick={() => {
                  setLogs([]);
                  setStep(1);
                  onNavigate('#/');
                }}
                className="text-xs text-slate-400 hover:text-white px-3 py-2 transition"
                disabled={installing}
              >
                Reset Setup
              </button>
              <button 
                onClick={() => onNavigate('#/login')}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 text-xs"
                disabled={installing}
              >
                <span>Launch Cloud OS Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
