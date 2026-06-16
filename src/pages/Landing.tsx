import React, { useState } from 'react';
import { 
  Zap, Server, Shield, Sparkles, Terminal, Copy, Check, ChevronRight, 
  Monitor, Layers, Plus, DollarSign, Database, HelpCircle, ArrowRight,
  TrendingUp, RefreshCw, Cpu, Activity, Globe, CheckCircle2, ChevronDown
} from 'lucide-react';

interface LandingProps {
  onNavigate: (route: string) => void;
}

export default function Landing({ onNavigate }: LandingProps) {
  const [copied, setCopied] = useState(false);
  const [selectedCostConfig, setSelectedCostConfig] = useState<'startup' | 'scale' | 'custom'>('startup');
  
  // Custom interactive savings slider states
  const [appsCount, setAppsCount] = useState<number>(3);
  const [dbCount, setDbCount] = useState<number>(1);
  const [eventsCount, setEventsCount] = useState<number>(1); // Millions of messages / month
  
  // Accordion active state for FAQ
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const copyCommand = () => {
    navigator.clipboard.writeText('curl -sSL https://fidscript.dev/install.sh | bash');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cost calculation engine
  const calculateCosts = () => {
    let cloudCost = 0;
    if (selectedCostConfig === 'startup') {
      // 3 Apps, 1 DB, low traffic
      cloudCost = 155; // Vercel ($20/seat), Render DB ($20), Heroku Dynos ($50), Sendgrid transactional ($35), Pusher ($30)
    } else if (selectedCostConfig === 'scale') {
      // 8 Apps, 2 DB, high throughput
      cloudCost = 480; // Vercel Pro ($100), AWS RDS ($150), Redis Labs ($80), Postmark ($90), PubNub ($60)
    } else {
      // Custom config based on interactive sliders
      cloudCost = (appsCount * 25) + (dbCount * 45) + (eventsCount * 30) + 15;
    }
    
    // Constant minimal self-hosted VPS average cost (e.g. Hetzner / DigitalOcean 4GB machine)
    const vpsCost = 12;
    const savings = Math.max(0, cloudCost - vpsCost);
    return { cloudCost, vpsCost, savings };
  };

  const { cloudCost, vpsCost, savings } = calculateCosts();

  return (
    <div className="relative min-h-screen bg-[#080a0d] text-[#e2e8f0] overflow-hidden">
      {/* Background radial soft light gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-40 left-10 w-[400px] h-[400px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#13161c_1px,transparent_1px),linear-gradient(to_bottom,#13161c_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-35 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 py-12 sm:py-20 relative z-10">
        
        {/* Navigation Indicator / Hero Tagline */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/40 border border-red-500/20 text-red-500 text-xs font-semibold tracking-wide animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transform any clean VPS into a private application cloud</span>
          </div>
        </div>

        {/* Core Display Typography */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-7xl font-extrabold tracking-tight text-white mb-6 leading-none font-sans">
            Self-Hosted Developer <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-600">
              Operating System
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-lg mb-8 leading-relaxed font-sans max-w-2xl mx-auto">
            Host applications, run real-time databases, configure mail server routines, and process deep queue events instantly on your own private hardware server. Simple, durable, and fully independent.
          </p>
        </div>

        {/* Dynamic Realtime System Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-14">
          <div className="bg-[#0b0e14]/90 border border-slate-900 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">TRAEFIK ROUTER</div>
              <div className="text-xs text-white font-mono font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 100% ONLINE
              </div>
            </div>
          </div>
          <div className="bg-[#0b0e14]/90 border border-slate-900 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">AVERAGE PING</div>
              <div className="text-xs text-white font-mono font-bold">1.2ms latency</div>
            </div>
          </div>
          <div className="bg-[#0b0e14]/90 border border-slate-900 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">ACTIVE DAEMONS</div>
              <div className="text-xs text-white font-mono font-bold">6/6 Isolation</div>
            </div>
          </div>
          <div className="bg-[#0b0e14]/90 border border-slate-900 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono font-bold uppercase">SECURITY STATE</div>
              <div className="text-xs text-white font-mono font-bold">TLS ACME Activated</div>
            </div>
          </div>
        </div>

        {/* Installation Script Element */}
        <div className="max-w-xl mx-auto bg-[#0c0f14]/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-2xl mb-12 relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="text-xs text-slate-400 font-mono ml-2">bootstrap_cloud.sh</span>
            </div>
            <button 
              onClick={copyCommand}
              className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white flex items-center gap-1.5 transition border border-slate-700"
              title="Copy shell script"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied script' : 'Copy installer'}</span>
            </button>
          </div>
          <div className="font-mono text-sm px-2 py-1 select-all text-slate-200">
            <span className="text-red-500 font-bold">ubuntu@your-vps:~$</span> curl -sSL https://fidscript.dev/install.sh | bash
          </div>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-sm sm:max-w-md mx-auto mb-24">
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

        {/* Feature Grid with minimal labels */}
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

        {/* VPS Cloud Architecture Blueprint visualization */}
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
                By routing external ingress through a high-performance **Traefik** reverse-proxy, your client websites, application backends, PostgreSQL databases, Redis systems, NATS events, and SMTP relays exist safely in sandboxed Docker networks on a single server machine.
              </p>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded bg-red-500"></span>
                  <span>ACME automated Let's Encrypt keys validation</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded bg-rose-500"></span>
                  <span>Internal system network telemetry isolation</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded bg-amber-500"></span>
                  <span>Configured nightly cluster backups directly to S3</span>
                </div>
              </div>
            </div>

            {/* Visual network architecture diagram */}
            <div className="lg:col-span-3 bg-black/60 rounded-xl border border-slate-900 p-6 font-mono text-[11px] text-slate-300 overflow-x-auto select-none">
              <div className="text-[10px] text-slate-550 mb-4 border-b border-slate-900 pb-2 flex justify-between font-bold">
                <span>VPS INGRESS BRIDGE PROTOCOL</span>
                <span>STATE: ACTIVE</span>
              </div>
              
              <div className="space-y-4">
                {/* External Request */}
                <div className="flex justify-center">
                  <div className="px-4 py-2 rounded bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 text-center font-bold min-w-[200px]">
                    🌐 Client Request (HTTPS)
                  </div>
                </div>

                {/* Connection Line */}
                <div className="flex justify-center text-red-500 animate-pulse h-4">-↓-</div>

                {/* Traefik proxy router */}
                <div className="flex justify-center">
                  <div className="px-5 py-2.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-center font-bold min-w-[220px]">
                    🛡️ Traefik Reverse-Proxy
                    <div className="text-[9px] text-slate-450 font-normal">Automated TLS SSL Resolver</div>
                  </div>
                </div>

                {/* Dynamic connection lines mapping paths */}
                <div className="flex justify-center font-bold text-slate-600">
                  /─────────────┼─────────────\
                </div>

                {/* Swarm containers */}
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

        {/* Interactive Self-Hosted Hosting Savings Calculator */}
        <div className="bg-[#0c0f14]/80 border border-slate-850 rounded-2xl p-6 sm:p-8 mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-red-500 w-5 h-5" />
              <span>Hosting Expense Calculator</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Traditional cloud providers charge heavy premium fees on compute, bandwidth, databases, mailers, and websockets. See what you could save by hosting on a secure virtual machine setup.
            </p>

            <div className="flex gap-2 p-1.5 bg-slate-950 border border-slate-850 rounded-xl w-fit">
              <button
                onClick={() => setSelectedCostConfig('startup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  selectedCostConfig === 'startup' ? 'bg-red-650 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Startup Node
              </button>
              <button
                onClick={() => setSelectedCostConfig('scale')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  selectedCostConfig === 'scale' ? 'bg-red-650 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Scale Swarm
              </button>
              <button
                onClick={() => setSelectedCostConfig('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  selectedCostConfig === 'custom' ? 'bg-red-650 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Custom Tuned
              </button>
            </div>

            {selectedCostConfig === 'custom' && (
              <div className="space-y-4 pt-2 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1 text-slate-400">
                    <span>Active Containers (Hosted Apps)</span>
                    <span className="text-white font-bold">{appsCount} deamons</span>
                  </div>
                  <input 
                    type="range" min={1} max={20} 
                    value={appsCount} 
                    onChange={(e) => setAppsCount(Number(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-slate-400">
                    <span>Databases (PostgreSQL / Redis)</span>
                    <span className="text-white font-bold">{dbCount} instances</span>
                  </div>
                  <input 
                    type="range" min={1} max={5} 
                    value={dbCount} 
                    onChange={(e) => setDbCount(Number(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-slate-400">
                    <span>Events/Month (NATS queues)</span>
                    <span className="text-white font-bold">{eventsCount}M triggers</span>
                  </div>
                  <input 
                    type="range" min={1} max={10} 
                    value={eventsCount} 
                    onChange={(e) => setEventsCount(Number(e.target.value))}
                    className="w-full accent-red-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results Comparison Grid Panel */}
          <div className="lg:col-span-6 bg-slate-950 p-6 rounded-2xl border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-4 rounded-xl bg-[#0d0f14]/50 border border-slate-900 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">Estimated Cloud Cost</span>
              <div className="my-3 text-2xl sm:text-3xl font-extrabold text-red-400 font-mono">
                ${cloudCost}<span className="text-xs font-normal">/mo</span>
              </div>
              <span className="text-[9px] text-slate-500 leading-tight">Vercel, AWS, Postmark</span>
            </div>

            <div className="p-4 rounded-xl bg-[#0d0f14]/50 border border-slate-900 flex flex-col justify-between">
              <span className="text-[10px] text-slate-550 font-mono font-bold uppercase">Average VPS Fee</span>
              <div className="my-3 text-2xl sm:text-3xl font-extrabold text-slate-300 font-mono">
                ${vpsCost}<span className="text-xs font-normal">/mo</span>
              </div>
              <span className="text-[9px] text-slate-500 leading-tight">Private hardware hosting</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 flex flex-col justify-between">
              <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Your Monthly Savings</span>
              <div className="my-3 text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                ${savings}<span className="text-xs font-normal">/mo</span>
              </div>
              <span className="text-[9px] text-emerald-500 leading-tight">Saved directly dynamically</span>
            </div>
          </div>

        </div>

        {/* Five-minute Quick Setup Steps Progress Map */}
        <div className="border-t border-slate-900 pt-16 mb-24">
          <h2 className="text-center text-xs font-bold font-mono tracking-wider text-slate-500 uppercase mb-12">
            FIVE-MINUTE CLUSTER SETUP ROUTINE
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Provision Host VPS', desc: 'Secure any clean Debian or Ubuntu virtual machine from Hetzner, AWS, or DigitalOcean.' },
              { step: '02', title: 'Run Setup Command', desc: 'Execute the automated curl installer script over SSH to configure the docker runtime framework.' },
              { step: '03', title: 'Map TLS Domains', desc: 'Traefik manages Let\'s Encrypt SSL protocols automatically when pointing domains inside.' },
              { step: '04', title: 'Operate Securely', desc: 'Compile microservices, run SQL scripts, send transactional SMTP mail, and deploy instantly.' }
            ].map((item, idx) => (
              <div key={idx} className="relative group">
                <div className="text-xs font-bold font-mono text-red-500 mb-3 block">{item.step}.</div>
                <h3 className="text-base font-bold text-white mb-2 font-sans group-hover:text-red-400 transition-colors">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-[6px] right-0 translate-x-[45px] text-slate-800">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Developer FAQ Section Accordion styling */}
        <div className="max-w-3xl mx-auto border-t border-slate-900 pt-16">
          <h2 className="text-center text-xs font-bold font-mono tracking-wider text-slate-500 uppercase mb-12">
            FREQUENTLY ASKED INQUIRIES
          </h2>

          <div className="space-y-4">
            {[
              {
                q: "How does FIDScript compare to Dokku or CapRover platform structures?",
                a: "Dokku is heavily opinionated on Heroku-like buildpacks and uses Git push workflows. CapRover has heavy web visual configurations. FIDScript is built specifically for fullstack developers wanting a secure backend ecosystem. It packages a pre-installed, pre-configured Stalwart SMTP transactional mail relay, NATS event streams, and real-time clustering out of the box in light, lightning-fast packages."
              },
              {
                q: "What host operating systems and hardware configurations are recommended?",
                a: "Any fresh installation of Ubuntu 22.04 LTS or Debian 12 is supported. For basic workloads, a single-core VPS with 2GB of RAM is sufficient. For heavy production clustering, 4 vCPUs and 8GB RAM with high nvme write speeds is best, providing ample memory for database index caching."
              },
              {
                q: "Are database backups and recovery procedures handled automatically?",
                a: "Yes. Part of the default stack compose files mounts automated daily backup timers. These bundle your PostgreSQL dumps, secure stalwart databases, and queue indices, saving them to external object storage (S3 or MinIO) with strict encryption standards."
              },
              {
                q: "How does Traefik handle automatic domain SSL keys with Let's Encrypt?",
                a: "When you register a hostname domain in the setup screen, Traefik routes dynamic ACME HTTP-01 or DNS-01 validation scripts automatically. This ensures every container you map instantly secures real browser HTTPS without manually configuring nginx config paths."
              }
            ].map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="rounded-xl border border-slate-900 bg-[#0d1015]/60 hover:border-slate-850 transition overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left font-sans text-xs sm:text-sm font-bold text-white outline-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen && 'rotate-180 text-red-500'}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed font-sans border-t border-slate-950">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
