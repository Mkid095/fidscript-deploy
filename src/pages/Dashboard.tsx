import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Server, Database, MessageSquare, Mail, 
  Settings, ShoppingBag, Plus, Trash2, Play, Activity, 
  Send, RefreshCw, Layers, Check, CheckCircle2, ChevronRight, 
  Loader2, AlertCircle, HelpCircle, Search, Bell, User, ChevronDown, Sparkles,
  Code, FileText, Clock, History, Globe, Copy, ChevronLeft, LayoutGrid, Menu
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('health');
  
  // Convex selection portal states
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [convexTab, setConvexTab] = useState<'projects' | 'deployments'>('projects');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  
  // High fidelity UI states
  const [summaryOpen, setSummaryOpen] = useState<boolean>(true);
  const [functionsOpen, setFunctionsOpen] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isStreamPaused, setIsStreamPaused] = useState<boolean>(false);
  const [fnLoading, setFnLoading] = useState<boolean>(false);
  const [configNoteField, setConfigNoteField] = useState<string>('');
  const [fileDragOver, setFileDragOver] = useState<boolean>(false);

  // Files tab state (Usability guidelines require drag-and-drop & folder selection)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([
    { name: 'receipt-invoice-92931.pdf', size: '1.2 MB', type: 'PDF Document', date: '2 days ago' },
    { name: 'db-snap-hourly.tar.gz', size: '42.5 MB', type: 'Database Mirror', date: '1 day ago' },
    { name: 'whatsapp-credentials-secure.json', size: '4.8 KB', type: 'JSON Config', date: '5 hours ago' },
    { name: 'avatar-kennedy.png', size: '280 KB', type: 'PNG Image', date: 'Just now' }
  ]);

  // Cron jobs custom scheduling triggers
  const [cronJobs, setCronJobs] = useState<any[]>([
    { id: 'c1', name: 'db-compression-snapshot', interval: 'Weekly (Sundays at 20:00)', lastRun: '3 days ago', status: 'active', type: 'Volume Backup' },
    { id: 'c2', name: 'letsencrypt-renew-validation', interval: 'Every 60 days', lastRun: '18 days ago', status: 'active', type: 'SSL ACME Cert' },
    { id: 'c3', name: 'nats-heartbeat-ping', interval: 'Every 15 seconds', lastRun: '9 seconds ago', status: 'running', type: 'Ping Socket' },
    { id: 'c4', name: 'whatsapp-token-refresh-cron', interval: 'Every 4 hours', lastRun: '2 hours ago', status: 'active', type: 'API Re-auth' }
  ]);

  // Functions interactive lists
  const [selectedFn, setSelectedFn] = useState<string>('messages:send');
  const [fnInputArgs, setFnInputArgs] = useState<string>('{\n  "body": "Hello world from custom trigger!",\n  "author": "Kennedy mwangi"\n}');
  const [fnResult, setFnResult] = useState<any>(null);

  // Settings modification audit history
  const [auditHistory, setAuditHistory] = useState<any[]>([
    { id: 'h1', action: 'Scale container replicas', detail: 'scaled billing-api pod replica counts from 1 to 3', triggerBy: 'Kennedy Githinji', time: '2 hours ago', type: 'SCALING' },
    { id: 'h2', action: 'Modified SMTP parameters', detail: 'updated STALWART_SMTP_HOST in environment configuration file', triggerBy: 'Kennedy Githinji', time: '5 hours ago', type: 'ENV SECRETS' },
    { id: 'h3', action: 'Linked Astro CMS extension', detail: 'installed Astro Blog system wrapper via web console', triggerBy: 'System Hook', time: '1 day ago', type: 'INTEGRATIONS' },
    { id: 'h4', action: 'Deployed production build v1.0.4', detail: 'initialized container compilation for MONEYKEEP static Vite server', triggerBy: 'Live Git Trigger', time: '2 days ago', type: 'COMPILING' },
    { id: 'h5', action: 'SSL Certificate setup', detail: 'verified inbound SSL path routing to operator port 3000', triggerBy: 'Traefik Renewer', time: '3 days ago', type: 'SECURITY' }
  ]);

  // Active Logs list
  const [liveLogs, setLiveLogs] = useState<string[]>([
    '[SYSTEM] Initializing container swarm session...',
    '[TRAEFIK] Bound active listen port :3000 successfully.',
    '[DB] postgres-srv healthy connection established.',
    '[NATS] Socket listener is polling: [user.onboard]',
    '[STALWART] Outbound SMTP dispatch relay authenticated on port 25.',
    '[INFO] Monitoring telemetry is live and ready.'
  ]);

  // Projects State
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [newProjName, setNewProjName] = useState<string>('');
  const [newProjType, setNewProjType] = useState<string>('backend');
  const [newProjRepo, setNewProjRepo] = useState<string>('');
  const [selectedProjectLogs, setSelectedProjectLogs] = useState<string[]>([]);
  const [activeProjectForLogs, setActiveProjectForLogs] = useState<any>(null);
  const [deployingState, setDeployingState] = useState<boolean>(false);

  // Database State
  const [dbNodesList, setDbNodesList] = useState<any[]>([]);
  const [sqlStatement, setSqlStatement] = useState<string>('SELECT * FROM projects;');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);

  // Realtime State
  const [natsEvents, setNatsEvents] = useState<any[]>([]);
  const [natsSubject, setNatsSubject] = useState<string>('user.onboard');
  const [natsData, setNatsData] = useState<string>('{"userId": "usr_992", "device": "macOS"}');

  // Email State
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [mailTo, setMailTo] = useState<string>('kennedygithinjioffice@gmail.com');
  const [mailSubject, setMailSubject] = useState<string>('Automated Health Check Alert');
  const [mailBody, setMailBody] = useState<string>('Traefik proxy reports cluster is running at 100% capacity.');

  // Skills State
  const [skillsList, setSkillsList] = useState<any[]>([]);

  // Platform Events Log state
  const [eventsTimeline, setEventsTimeline] = useState<any[]>([]);

  // AI Copilot state
  const [assistantPrompt, setAssistantPrompt] = useState<string>('');
  const [companionChat, setCompanionChat] = useState<Array<{ sender: 'user' | 'assistant', text: string }>>([
    { sender: 'assistant', text: 'Hello operator. I am the server-side Copilot agent. How can I help you manage your Docker clusters, Stalwart emails, or NATS event streams?' }
  ]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Model Context Protocol (MCP) Configuration State
  const [mcpTargetTool, setMcpTargetTool] = useState<string>('claude-desktop');
  const [mcpToken, setMcpToken] = useState<string>('fs_tok_6c81fa39c289fd2e1bdfc08f1b4aef9e046');
  const [mcpFeatureDocker, setMcpFeatureDocker] = useState<boolean>(true);
  const [mcpFeaturePostgres, setMcpFeaturePostgres] = useState<boolean>(true);
  const [mcpFeatureLogs, setMcpFeatureLogs] = useState<boolean>(true);
  const [mcpFeatureSchedules, setMcpFeatureSchedules] = useState<boolean>(false);
  const [mcpIsCopied, setMcpIsCopied] = useState<boolean>(false);
  const [mcpSelectedToolTest, setMcpSelectedToolTest] = useState<string>('list_containers');
  const [mcpSimResult, setMcpSimResult] = useState<any>(null);
  const [mcpSimRunning, setMcpSimRunning] = useState<boolean>(false);

  // Domains Platform State (Phase 24)
  const [domainsList, setDomainsList] = useState<any[]>([]);
  const [newDomainName, setNewDomainName] = useState<string>('');
  const [dnsCheckLoadingId, setDnsCheckLoadingId] = useState<string | null>(null);
  const [addingDomainLoading, setAddingDomainLoading] = useState<boolean>(false);

  // Database Optimization States
  const [isDbBoosting, setIsDbBoosting] = useState<boolean>(false);
  const [boostSuccessMessage, setBoostSuccessMessage] = useState<string | null>(null);

  // Simplified Sub-Tab Navigation States
  const [selectedComputeSubTab, setSelectedComputeSubTab] = useState<'functions' | 'files' | 'schedules'>('functions');
  const [selectedSystemSubTab, setSelectedSystemSubTab] = useState<'settings' | 'copilot' | 'logs' | 'history'>('settings');

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Polling / Fetching Data
  const fetchAllData = async () => {
    try {
      // Fetch in parallel to eliminate slow HTTP waterfalls
      const [projsRes, dbRes, natsRes, emailRes, skillsRes, eventsRes, domainsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/db-nodes'),
        fetch('/api/nats-events'),
        fetch('/api/emails'),
        fetch('/api/skills'),
        fetch('/api/events'),
        fetch('/api/domains')
      ]);

      const [projectsData, dbData, natsData, emailResData, skillsData, eventsData, domainsData] = await Promise.all([
        projsRes.json(),
        dbRes.json(),
        natsRes.json(),
        emailRes.json(),
        skillsRes.json(),
        eventsRes.json(),
        domainsRes.json()
      ]);

      setProjectsList(projectsData);
      setDbNodesList(dbData);
      setNatsEvents(natsData);
      setEmailLogs(emailResData);
      setSkillsList(skillsData);
      setEventsTimeline(eventsData);
      setDomainsList(domainsData);
    } catch (e) {
      console.error('Error background parallel fetching server data', e);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName) return;
    setAddingDomainLoading(true);
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: newDomainName })
      });
      if (res.ok) {
        setNewDomainName('');
        const data = await res.json();
        setDomainsList(prev => [...prev, data]);
        fetchAllData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error adding custom domain');
      }
    } catch (err) {
      console.error(err);
      alert('Network error adding custom domain');
    } finally {
      setAddingDomainLoading(false);
    }
  };

  const handleVerifyDomain = async (id: string) => {
    setDnsCheckLoadingId(id);
    try {
      const res = await fetch(`/api/domains/verify/${id}`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setDomainsList(prev => prev.map(d => d.id === id ? updated : d));
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDnsCheckLoadingId(null);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm('Are you sure you want to unlink this custom domain from the cluster?')) return;
    try {
      const res = await fetch(`/api/domains/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDomainsList(prev => prev.filter(d => d.id !== id));
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Live log stream generator simulation
  useEffect(() => {
    if (isStreamPaused || !selectedProject) return;
    const phrases = [
      '[DB_QUERY] SELECT * FROM messages ORDER BY id DESC LIMIT 50',
      '[NATS_EMIT] Event "messages:send" successfully dispersed to group receivers.',
      '[STALWART_SMTP] Connection accepted from localhost, processing outbound queue...',
      '[HTTP_ROUTER] GET /api/health - Code 200 OK - Latency 1.14ms',
      '[VOLUMES_S3] MinIO mirrored volume block #B7261 synced successfully.',
      '[TRAEFIK_PROXY] Routed sub-path matching "operator" to daemon port :3000',
      '[BULL_MQ] Executing scheduled cron "db-compression-snapshot"'
    ];

    const interval = setInterval(() => {
      const randomLine = phrases[Math.floor(Math.random() * phrases.length)];
      const now = new Date().toTimeString().split(' ')[0];
      setLiveLogs(prev => {
        const next = [...prev, `[${now}] ${randomLine}`];
        if (next.length > 50) next.shift(); // Keep logs clean
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isStreamPaused, selectedProject]);

  // Project Functions
  const createNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;
    setDeployingState(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjName,
          type: newProjType,
          repo: newProjRepo || `github.com/developer/${newProjName.toLowerCase()}`
        })
      });
      const created = await res.json();
      setNewProjName('');
      setNewProjRepo('');
      setShowCreateModal(false);
      
      // Select the newly deployed project and poll logs right away
      setActiveProjectForLogs(created);
      pollProjectLogs(created.id);
      setSelectedProject(created);
    } catch (err) {
      console.error(err);
    } finally {
      setDeployingState(false);
    }
  };

  const pollProjectLogs = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/logs/${projectId}`);
      const data = await response.json();
      setSelectedProjectLogs(data);
    } catch (err) {
      console.error('Error fetching logs', err);
    }
  };

  const deleteProject = async (id: string) => {
    if (confirm('Are you sure you want to stop this application container?')) {
      try {
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        fetchAllData();
        if (activeProjectForLogs?.id === id) {
          setActiveProjectForLogs(null);
          setSelectedProjectLogs([]);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Database Toggle
  const toggleDbNode = async (name: string) => {
    try {
      await fetch('/api/db-nodes/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // SQL Query execute
  const runSQLQuery = async () => {
    setSqlLoading(true);
    setSqlResult(null);
    try {
      const res = await fetch('/api/query-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlStatement })
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (err) {
      setSqlResult({ error: 'Fatal communication breakdown on database router.' });
    } finally {
      setSqlLoading(false);
    }
  };

  // NATS event emission
  const publishNatsEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!natsSubject) return;
    try {
      await fetch('/api/nats-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: natsSubject, data: natsData })
      });
      setNatsSubject('user.onboard');
      setNatsData('{"userId": "usr_992", "device": "macOS"}');
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Email SMTP dispatch
  const dispatchEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailTo || !mailSubject) return;
    try {
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: mailTo, subject: mailSubject, content: mailBody })
      });
      setMailSubject('');
      setMailBody('');
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Skills toggle
  const toggleSkill = async (id: string) => {
    try {
      await fetch('/api/skills/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Copilot message submit
  const sendCopilotMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantPrompt.trim()) return;

    const userMessage = assistantPrompt;
    setCompanionChat(prev => [...prev, { sender: 'user', text: userMessage }]);
    setAssistantPrompt('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage })
      });
      const data = await res.json();
      setCompanionChat(prev => [...prev, { sender: 'assistant', text: data.response }]);
    } catch (err) {
      setCompanionChat(prev => [...prev, { sender: 'assistant', text: 'An error occurred while connecting to the backend Gemini AI agent service.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  if (selectedProject === null) {
    return (
      <div className="bg-[#090a0f] text-zinc-300 font-sans min-h-screen pb-16 antialiased selection:bg-rose-500/20 selection:text-rose-200">
        
        {/* Global Convex Navbar header */}
        <header className="border-b border-zinc-900/60 bg-[#0d0e12] sticky top-0 z-40">
          <div className="w-full px-4 sm:px-6 md:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white border border-rose-500/20 shadow-sm shadow-rose-950/20 animate-fade-in">
                  <span className="font-extrabold text-white font-mono text-sm leading-none">F</span>
                </div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-85 select-none">
                  <span className="text-xs font-semibold text-zinc-200 tracking-tight font-sans">
                    Kennedy Githinji's team
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>
 
              <nav className="hidden md:flex items-center gap-5">
                <button className="text-xs font-semibold text-rose-450 border-b-2 border-rose-550 pb-4 pt-1 transition">
                  Home
                </button>
                <button className="text-xs font-medium text-zinc-500 hover:text-zinc-300 pb-4 pt-1 transition">
                  Team Settings
                </button>
              </nav>
            </div>
 
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  alert("AI Companion is ready inside any deployed project. Select or create a project to start communicating!");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/20 border border-rose-900/30 text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition rounded-xl text-xs font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                <span>Ask AI</span>
              </button>
              
              <button className="hidden sm:inline-block text-xs font-medium text-zinc-500 hover:text-white transition">
                Support
              </button>
 
              <div className="h-4 w-[1px] bg-zinc-800 hidden sm:inline-block"></div>
 
              <div className="w-7 h-7 rounded-full bg-rose-600 text-white font-bold text-[10px] uppercase flex items-center justify-center border border-rose-500/20" title="kennedygithinjioffice@gmail.com">
                KG
              </div>
            </div>
          </div>
        </header>
 
        {/* Global Alert Notification Banner */}
        <div className="w-full px-4 sm:px-6 md:px-8 pt-6 animate-fade-in animate-duration-300">
          <div className="bg-[#121318] border border-zinc-900 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/10 shrink-0 select-none">PROMO SYSTEM</span>
              <div>
                <h4 className="text-xs font-semibold text-zinc-100">Boost your free plan resource limits by up to 5 times by sharing your referral code</h4>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-900 select-all cursor-pointer">
                    https://fidscript.dev/referral/KENNED8953
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("https://fidscript.dev/referral/KENNED8953");
                      alert("Referral link copied!");
                    }}
                    className="text-[10px] font-bold text-rose-400 hover:text-rose-350 hover:underline"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
 
            <div className="w-full md:w-60 flex flex-col items-end">
              <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-900">
                <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-1.5 rounded-full w-[20%]"></div>
              </div>
              <div className="flex justify-between w-full mt-2 text-[9px] font-bold text-zinc-500 uppercase font-mono select-none">
                <span>0/5 REFERRAL BOOSTS APPLIED</span>
                <span className="text-rose-400 font-bold animate-pulse">1 ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Action Controls Desk & Toggles */}
        <main className="w-full px-4 sm:px-6 md:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center bg-[#121318] border border-zinc-900 p-1 rounded-2xl w-full sm:w-auto select-none">
              <button 
                onClick={() => setConvexTab('projects')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  convexTab === 'projects' 
                    ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-350'
                }`}
              >
                <span>Projects</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-950 text-zinc-400">
                  {projectsList.length}
                </span>
              </button>
              
              <button 
                onClick={() => setConvexTab('deployments')}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  convexTab === 'deployments' 
                    ? 'bg-zinc-800 text-white border border-zinc-700/60 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-350'
                }`}
              >
                <span>Deployments</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-950 text-zinc-400">
                  5
                </span>
              </button>
            </div>
 
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={convexTab === 'projects' ? "Search projects..." : "Search live node clusters..."}
                  className="w-full pl-9 pr-4 py-2 bg-[#121318] border border-zinc-900 rounded-xl text-xs text-zinc-105 placeholder-zinc-505 focus:outline-none focus:border-rose-550 transition font-sans"
                />
              </div>
 
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm shadow-rose-950/20 active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </button>
              </div>
            </div>
          </div>
 
          {/* ACTIVE TAB: PROJECTS LIST (Card format mapping Convex layout exactly) */}
          {convexTab === 'projects' && (
            <div>
              {projectsList.length === 0 ? (
                <div className="text-center py-24 bg-[#121318] border border-zinc-900 rounded-[32px] max-w-xl mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-955/20 border border-rose-900/20 text-rose-400 flex items-center justify-center mx-auto">
                    <Server className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">No active projects</h3>
                  <p className="text-xs text-zinc-400 font-sans leading-normal max-w-xs mx-auto">To start hosting business nodes, create your first isolated swarm container.</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-sm active:scale-98"
                  >
                    + Create Project Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                  {projectsList
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((project, idx) => (
                      <div 
                        key={project.id || idx}
                        onClick={() => {
                          setSelectedProject(project);
                          setActiveTab('health');
                        }}
                        className="bg-[#121318] border border-zinc-900 rounded-2xl p-5 hover:border-rose-900/30 hover:bg-[#15161d] transition duration-200 cursor-pointer group flex flex-col justify-between min-h-[143px] relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div>
                          <div className="flex items-start justify-between">
                            <h3 className="text-xs font-bold text-zinc-100 group-hover:text-rose-400 transition font-mono tracking-tight">
                              {project.name}
                            </h3>
                            <Trash2 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProject(project.id);
                              }}
                              className="w-3.5 h-3.5 text-zinc-650 hover:text-rose-400 transition" 
                            />
                          </div>
                          <div className="text-[10px] font-semibold text-zinc-400 mt-1 flex items-center gap-1.5">
                            <span>{project.mode || "Production • Development"}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-550 animate-pulse"></span>
                          </div>
 
                          <p className="text-[10px] font-mono text-zinc-500 mt-2 truncate max-w-[95%] font-medium select-all">
                            {project.url}
                          </p>
                        </div>
 
                        <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-900/50 text-[10px] text-zinc-500">
                          <span className="font-medium font-mono text-[9px]">{project.lastDeployed || "Created 2 days ago"}</span>
                          <span className="bg-rose-550/10 text-rose-400 border border-rose-500/10 px-1.5 py-0.5 rounded uppercase font-mono text-[8px] font-bold">
                            {project.type || "BACKEND"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
 
          {/* ACTIVE TAB: DEPLOYMENTS LIST */}
          {convexTab === 'deployments' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                {[
                  { name: 'traefik-proxy', label: 'traefik-proxy', mode: 'Production • Routing', port: 80, tab: 'health', desc: 'Active HTTP proxy routing domain configurations to sandboxed ports.' },
                  { name: 'postgres-srv', label: 'postgres-srv', mode: 'Production • Database', port: 5432, tab: 'health', desc: 'PostgreSQL database container mapping storage clusters & migrations.' },
                  { name: 'redis-cache', label: 'redis-cache', mode: 'Production • Memory Store', port: 6379, tab: 'health', desc: 'Volatile high-speed caching engine boosting endpoint response latencies.' },
                  { name: 'nats-broker', label: 'nats-broker', mode: 'Production • Event Bus', port: 4222, tab: 'health', desc: 'NATS queue broker handling transactional real-time stream emissions.' },
                  { name: 'stalwart-smtp', label: 'stalwart-smtp', mode: 'Production • Mailer Relay', port: 25, tab: 'health', desc: 'SMTP mail courier handling platform alerts & transactional logs.' },
                ].filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.label.toLowerCase().includes(searchQuery.toLowerCase()))
                 .map((deploy, index) => (
                  <div 
                    key={index}
                    onClick={() => {
                      if (projectsList.length > 0) {
                        setSelectedProject(projectsList[0]);
                        setActiveTab(deploy.tab);
                      } else {
                        alert("To orchestrate this deployment pod, please compile or select a dynamic project first.");
                      }
                    }}
                    className="bg-[#121318] border border-zinc-900 rounded-2xl p-5 hover:border-rose-900/30 hover:bg-[#15161d] transition duration-200 cursor-pointer group flex flex-col justify-between min-h-[143px] relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div>
                      <div className="flex items-start justify-between">
                        <h3 className="text-xs font-bold text-zinc-100 group-hover:text-rose-400 transition font-mono tracking-tight">
                          {deploy.label}
                        </h3>
                        <Activity className="w-3.5 h-3.5 text-zinc-500 group-hover:text-rose-405 transition" />
                      </div>
                      <div className="text-[10px] font-semibold text-zinc-400 mt-1 flex items-center gap-1.5">
                        <span>{deploy.mode}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 animate-pulse"></span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-sans font-medium">
                        {deploy.desc}
                      </p>
                    </div>
 
                    <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-900/50 text-[10px] text-zinc-500 font-mono">
                      <span className="text-[9px]">Port {deploy.port} socket</span>
                      <span className="text-emerald-400 font-bold uppercase tracking-wider text-[8px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15">
                        ONLINE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
 
        {/* CREATE DEPLOYMENT PROJECT MODAL (CONVEX STYLE) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in pointer-events-auto">
            <div className="bg-[#111216] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 relative shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white border border-rose-500/15">
                    <span className="font-extrabold text-xs font-mono">F</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans leading-none">
                      Create project
                    </h3>
                    <span className="text-[9px] text-zinc-500 block font-mono mt-0.5 uppercase tracking-wide">fidscript deployment</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-550 hover:text-zinc-350 text-sm font-bold font-mono px-2 transition-all"
                >
                  ✕
                </button>
              </div>
 
              <form onSubmit={createNewProject} className="space-y-4 font-sans">
                <div>
                  <label className="block text:[9px] font-bold text-zinc-400 uppercase mb-1.5 font-mono text-[9px] tracking-wider">Project Name</label>
                  <input 
                    type="text"
                    required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="e.g. whatsapp-bot-vps"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-600 focus:border-rose-550 outline-none font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal font-sans">Accepts alphanumeric and hyphens. Translates into your custom sub-domain.</p>
                </div>
 
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1.5 font-mono tracking-wider">Subsystem Type</label>
                  <select
                    value={newProjType}
                    onChange={(e) => setNewProjType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-zinc-350 focus:border-rose-550 outline-none"
                  >
                    <option value="backend">Backend (Node/Python Service)</option>
                    <option value="static">Static (Vite/Next Single-Page-App)</option>
                    <option value="worker">Queue Worker (NATS Daemon)</option>
                    <option value="cron">Periodic Cron Scheduler</option>
                  </select>
                </div>
 
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1.5 font-mono tracking-wider">
                    Git Repository Address (Auto-Fetch)
                  </label>
                  <input 
                    type="text"
                    value={newProjRepo}
                    onChange={(e) => setNewProjRepo(e.target.value)}
                    placeholder="github.com/developer/your-app"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-850 rounded-xl text-xs text-white placeholder-zinc-600 focus:border-rose-550 outline-none font-mono"
                  />
                </div>
 
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-zinc-850/80 mt-6 animate-fade-in">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-transparent text-zinc-400 hover:text-white rounded-xl text-xs font-semibold tracking-tight transition"
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit"
                    disabled={deployingState}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-505 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 active:scale-98"
                  >
                    {deployingState ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>COMPILING...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>LAUNCH INSTANCE</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="bg-[#090a0f] text-zinc-300 font-sans min-h-screen antialiased flex flex-col selection:bg-rose-500/20 selection:text-rose-200">
      
      {/* SOLID HIGH-FIDELITY CONVEX TOPBAR */}
      <div className="bg-[#0d0e12] border-b border-zinc-900/60 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setSelectedProject(null)}
            className="w-7 h-7 rounded-xl bg-orange-600 hover:bg-orange-500 font-extrabold text-white text-[10px] font-mono flex items-center justify-center cursor-pointer select-none border border-orange-500/20 shadow-sm"
          >
            KM
          </div>
          <span className="text-zinc-700 text-xs font-mono font-bold select-none">/</span>
          <button 
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-1 hover:bg-[#16171d] px-2.5 py-1.5 rounded-xl transition text-xs font-bold text-white font-mono"
          >
            <span>{selectedProject.name}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500 ml-1.5" />
          </button>
        </div>
 
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-500">
            <span>Convex Host CLI v0.19.4</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-550"></span>
          </div>
          <button 
            onClick={() => setSelectedProject(null)}
            className="px-3 py-1.5 bg-[#16171d] border border-zinc-850 hover:border-zinc-800 text-zinc-300 font-bold rounded-xl text-xs transition uppercase font-mono tracking-tight"
          >
            Back to instances
          </button>
        </div>
      </div>
 
      {/* HORIZONTAL WORKSPACE DIVIDERS */}
      <div className="flex-1 w-full max-w-ffffff mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 md:p-8 animate-fade-in relative z-20 overflow-hidden">
        
        {/* SIDEBAR NAVIGATION CONTROL (Lefthand panel tab selection) */}
        <aside className={`hidden lg:flex flex-col justify-between ${sidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-3'} min-h-[calc(100vh-220px)] transition-all duration-350 self-start`}>
          
          <div className="space-y-2">
            <div className="text-[9px] uppercase font-bold text-rose-500/80 px-3 tracking-wider font-mono select-none flex items-center gap-1.5 mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              {!sidebarCollapsed ? 'Unified Workspace' : 'Core'}
            </div>

            {[
              { id: 'health', label: 'Dashboard', desc: 'Flows & analytics performance', icon: LayoutGrid },
              { id: 'database', label: 'Database Center', desc: 'PostgreSQL Tables & Booster', icon: Database },
              { id: 'compute', label: 'Compute & Storage', desc: 'Functions, Files & Crons', icon: Server },
              { id: 'domains', label: 'Domains Manager', desc: 'Web custom hosts & DNS stats', icon: Globe },
              { id: 'system', label: 'System Control', desc: 'Logs, environment & MCP', icon: Terminal },
            ].map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    // Reset sub-tab selectors
                    if (item.id === 'compute') setSelectedComputeSubTab('functions');
                    if (item.id === 'system') setSelectedSystemSubTab('settings');
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition gap-3 border ${
                    isSelected 
                      ? 'bg-rose-955/15 border-rose-900/35 text-rose-400 font-bold' 
                      : 'bg-[#121318]/40 border-transparent hover:bg-[#121318]/90 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-rose-455' : 'text-zinc-500'}`} />
                    {!sidebarCollapsed && (
                      <div className="truncate">
                        <span className="text-xs font-semibold block">{item.label}</span>
                        <span className="text-[9px] text-zinc-500 block font-medium truncate">{item.desc}</span>
                      </div>
                    )}
                  </div>
                  {!sidebarCollapsed && isSelected && (
                    <span className="w-1 h-3 rounded-full bg-rose-550 shrink-0"></span>
                  )}
                </button>
              );
            })}
   
            <button 
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full mt-4 p-2 bg-[#16171d]/60 hover:bg-[#16171d] border border-zinc-900 rounded-xl flex items-center justify-center gap-2 text-zinc-550 hover:text-zinc-350 transition-all font-mono text-[9px] font-bold tracking-wider"
            >
              <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-350 ${sidebarCollapsed ? 'rotate-180 text-rose-500' : ''}`} />
              {!sidebarCollapsed && <span>COLLAPSE MENU</span>}
            </button>
          </div>

          {/* Bottom Promo & Profile Section (matched exactly to flexora layout) */}
          {!sidebarCollapsed && (
            <div className="mt-8 space-y-4">
              {/* Upgrade to Pro Card */}
              <div className="bg-rose-955/5 border border-rose-900/15 p-4 rounded-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="text-xs font-bold text-zinc-200">Upgrade to Pro</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal font-sans">
                    Unlock advanced flow controls, integrations, and analytics.
                  </p>
                  <button 
                    type="button"
                    onClick={() => alert("Redirecting to Pro billing portal setup...")}
                    className="w-full mt-3 py-2 bg-rose-650 hover:bg-rose-600 text-white font-bold text-[10px] tracking-wider uppercase rounded-lg transition active:scale-97 font-sans"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>

              {/* Profile Card */}
              <div className="flex items-center justify-between p-2.5 bg-zinc-950/40 border border-zinc-900/60 rounded-2xl hover:bg-zinc-950/80 transition cursor-pointer select-none">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#be123c] flex items-center justify-center text-white text-xs font-extrabold font-mono shadow-inner">
                    MA
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-zinc-200 block truncate leading-tight">Mathew Andersson</span>
                    <span className="text-[9.5px] text-zinc-550 block font-mono">Admin</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-650" />
              </div>
            </div>
          )}

        </aside>

        {/* MAIN WORKSPACE CONTENT WINDOW */}
        <main className={`pb-28 lg:pb-0 ${sidebarCollapsed ? 'lg:col-span-11' : 'lg:col-span-9'} w-full space-y-6 transition-all duration-300`}>
          
          <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-[9px] uppercase font-bold text-rose-500 tracking-wider font-mono">
                  Active Session Project • {selectedProject?.type || "BACKEND"}
                </span>
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 font-mono">
                  <span>{selectedProject?.name || "Global Config"}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 animate-pulse"></span>
                </h1>
                <span className="text-[9px] text-zinc-550 font-mono block mt-0.5 select-all">
                  {selectedProject?.url || "https://cluster-daemon.fidscript.dev/operator"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => alert(`Static hosting parameters for ${selectedProject.name} checked. Configured on Port :${selectedProject.port}`)}
                  className="px-4 py-2 bg-zinc-950 hover:bg-[#16171d] border border-zinc-850 text-zinc-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 active:scale-98"
                >
                  <Globe className="w-3.5 h-3.5 text-zinc-550" />
                  <span>Port Binding</span>
                </button>
              </div>
          </div>
 
          {/* TAB CONTENT: HEALTH CENTER (Overview telemetry analytics, collapsible system summary, status dials) */}
          {activeTab === 'health' && (
            <div className="space-y-6 animate-fade-in text-left">
              
              {/* Premium Welcome Header with Dynamic Subtitle and Buttons */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                    Welcome back, Mathew
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Here's what's happening with your flows today.
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono px-3 py-1.5 rounded-lg">
                    Server Latency: <strong className="text-emerald-400">1.2ms</strong>
                  </span>
                  <button 
                    type="button"
                    onClick={() => alert("Initializing new workflow process node wizard...")}
                    className="px-4 py-2 bg-rose-650 hover:bg-[#e11d48] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg shadow-rose-950/20 active:scale-97 font-sans"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Flow</span>
                  </button>
                </div>
              </div>

              {/* Four Elegant Stats Metrics Cards (Matched exactly to flexora layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric 1: Active Flows */}
                <div className="bg-[#12131b] rounded-2xl border border-zinc-900/60 p-4 relative overflow-hidden group hover:border-[#f43f5e]/30 transition duration-300">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-sans">Active Flows</span>
                      <h3 className="text-2xl font-bold font-sans text-zinc-100 mt-1">24</h3>
                      <span className="text-[9px] text-emerald-400 font-semibold mt-1 inline-block">+12% <span className="text-zinc-500 font-normal">vs last 7 days</span></span>
                    </div>
                    <div className="p-2 bg-rose-955/15 border border-rose-900/10 text-rose-400 rounded-xl w-8 h-8 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  {/* Glowing Mini Sparkline */}
                  <div className="h-10 w-full mt-4 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 120 30" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="glow-grad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,22 Q15,10 30,24 T60,11 T90,16 T120,6 L120,30 L0,30 Z" fill="url(#glow-grad1)" />
                      <path d="M0,22 Q15,10 30,24 T60,11 T90,16 T120,6" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Metric 2: Executions */}
                <div className="bg-[#12131b] rounded-2xl border border-zinc-900/60 p-4 relative overflow-hidden group hover:border-[#f43f5e]/30 transition duration-300">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-sans">Executions</span>
                      <h3 className="text-2xl font-bold font-sans text-zinc-100 mt-1">1,429</h3>
                      <span className="text-[9px] text-emerald-400 font-semibold mt-1 inline-block">+18% <span className="text-zinc-500 font-normal">vs last 7 days</span></span>
                    </div>
                    <div className="p-2 bg-rose-955/15 border border-rose-900/10 text-rose-400 rounded-xl w-8 h-8 flex items-center justify-center">
                      <Activity className="w-4 h-4" />
                    </div>
                  </div>
                  {/* Glowing Mini Sparkline */}
                  <div className="h-10 w-full mt-4 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 120 30" preserveAspectRatio="none">
                      <path d="M0,25 Q15,18 30,12 T60,20 T90,8 T120,5 L120,30 L0,30 Z" fill="url(#glow-grad1)" />
                      <path d="M0,25 Q15,18 30,12 T60,20 T90,8 T120,5" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Metric 3: Success Rate */}
                <div className="bg-[#12131b] rounded-2xl border border-zinc-900/60 p-4 relative overflow-hidden group hover:border-[#f43f5e]/30 transition duration-300">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-sans">Success Rate</span>
                      <h3 className="text-2xl font-bold font-sans text-zinc-100 mt-1">98.6%</h3>
                      <span className="text-[9px] text-emerald-400 font-semibold mt-1 inline-block">+2.4% <span className="text-zinc-500 font-normal">vs last 7 days</span></span>
                    </div>
                    <div className="p-2 bg-rose-955/15 border border-rose-900/10 text-rose-400 rounded-xl w-8 h-8 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  {/* Glowing Mini Sparkline */}
                  <div className="h-10 w-full mt-4 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 120 30" preserveAspectRatio="none">
                      <path d="M0,15 Q15,8 30,11 T60,5 T90,6 T120,4 L120,30 L0,30 Z" fill="url(#glow-grad1)" />
                      <path d="M0,15 Q15,8 30,11 T60,5 T90,6 T120,4" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

                {/* Metric 4: Avg. Response Time */}
                <div className="bg-[#12131b] rounded-2xl border border-zinc-900/60 p-4 relative overflow-hidden group hover:border-[#f43f5e]/30 transition duration-300">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-sans">Avg. Response Time</span>
                      <h3 className="text-2xl font-bold font-sans text-zinc-100 mt-1">320ms</h3>
                      <span className="text-[9px] text-[#f43f5e] font-semibold mt-1 inline-block">-8% <span className="text-zinc-500 font-normal">vs last 7 days</span></span>
                    </div>
                    <div className="p-2 bg-rose-955/15 border border-rose-900/10 text-rose-400 rounded-xl w-8 h-8 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  {/* Glowing Mini Sparkline */}
                  <div className="h-10 w-full mt-4 flex items-end">
                    <svg className="w-full h-full" viewBox="0 0 120 30" preserveAspectRatio="none">
                      <path d="M0,8 Q15,18 30,15 T60,25 T90,10 T120,12 L120,30 L0,30 Z" fill="url(#glow-grad1)" />
                      <path d="M0,8 Q15,18 30,15 T60,25 T90,10 T120,12" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>

              </div>

              {/* Middle Row Grid (Recent Activity on Left, Executions Overview on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Recent Activity Card list (Left - span 5) */}
                <div className="lg:col-span-5 bg-[#12131b] rounded-2xl border border-zinc-900/60 p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-900/40">
                      <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-sans">Recent Activity</h4>
                      <span className="text-[10px] text-zinc-550 font-mono">Live logs</span>
                    </div>

                    <div className="space-y-3.5">
                      
                      {/* Activity 1 */}
                      <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-emerald-950/20 border border-emerald-950/10 text-emerald-450 rounded-lg mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-200">Customer Onboarding Flow</span>
                            <span className="text-[9px] text-zinc-550 font-sans">2m ago</span>
                          </div>
                          <span className="text-[10.5px] text-zinc-400 block mt-0.5">Executed successfully</span>
                        </div>
                      </div>

                      {/* Activity 2 */}
                      <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-emerald-950/20 border border-emerald-950/10 text-emerald-450 rounded-lg mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-200">Lead Enrichment Flow</span>
                            <span className="text-[9px] text-zinc-550 font-sans">15m ago</span>
                          </div>
                          <span className="text-[10.5px] text-zinc-400 block mt-0.5">Executed successfully</span>
                        </div>
                      </div>

                      {/* Activity 3 */}
                      <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-rose-955/20 border border-rose-900/10 text-rose-455 rounded-lg mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-200">Invoice Automation</span>
                            <span className="text-[9px] text-zinc-550 font-sans font-medium">1h ago</span>
                          </div>
                          <span className="text-[10px] text-rose-455 block mt-0.5 font-sans font-medium">Failed at step "Send Email"</span>
                        </div>
                      </div>

                      {/* Activity 4 */}
                      <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-emerald-950/20 border border-emerald-950/10 text-emerald-455 rounded-lg mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-200">Data Sync Flow</span>
                            <span className="text-[9px] text-zinc-550 font-sans">2h ago</span>
                          </div>
                          <span className="text-[10.5px] text-zinc-400 block mt-0.5">Executed successfully</span>
                        </div>
                      </div>

                      {/* Activity 5 */}
                      <div className="flex items-start gap-3 text-xs">
                        <div className="p-1.5 bg-emerald-950/20 border border-emerald-950/10 text-emerald-454 rounded-lg mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-200">Slack Notification Flow</span>
                            <span className="text-[9px] text-zinc-550 font-sans">3h ago</span>
                          </div>
                          <span className="text-[10.5px] text-zinc-400 block mt-0.5">Executed successfully</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      setActiveTab('system');
                      setSelectedSystemSubTab('logs');
                    }}
                    className="text-[10px] text-rose-450 hover:text-rose-400 font-bold tracking-tight text-left mt-6 flex items-center gap-1 group w-fit"
                  >
                    <span>View all activity</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                </div>

                {/* Executions Overview Bar Chart (Right - span 7) */}
                <div className="lg:col-span-7 bg-[#12131b] rounded-2xl border border-zinc-900/60 p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-900/40">
                    <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-sans">Executions Overview</h4>
                    <div className="flex items-center bg-zinc-950 border border-zinc-900 p-0.5 rounded-lg text-[9px] font-mono leading-none">
                      <span className="px-2 py-1 bg-[#1c1d25] text-white rounded font-bold cursor-pointer">7D</span>
                      <span className="px-2 py-1 text-zinc-500 hover:text-white rounded cursor-pointer transition">30D</span>
                      <span className="px-2 py-1 text-zinc-500 hover:text-white rounded cursor-pointer transition">90D</span>
                    </div>
                  </div>

                  {/* SVG Bar Chart with Crimson rounded pillars */}
                  <div className="pt-6 relative">
                    <div className="h-44 w-full flex items-end justify-between px-2">
                      {[
                        { day: 'May 16', value: 510 },
                        { day: 'May 17', value: 480 },
                        { day: 'May 18', value: 540 },
                        { day: 'May 19', value: 420 },
                        { day: 'May 20', value: 590 },
                        { day: 'May 21', value: 780 },
                        { day: 'May 22', value: 810 }
                      ].map((item, idx) => {
                        const maxHeight = 850;
                        const heightPct = (item.value / maxHeight) * 100;
                        return (
                          <div key={idx} className="flex flex-col items-center flex-1 group">
                            {/* Hover tooltip */}
                            <span className="opacity-0 group-hover:opacity-100 bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded text-[8.5px] font-mono text-white mb-1 transition duration-150 transform -translate-y-1 block absolute bottom-[180px] pointer-events-none z-10">
                              {item.value} runs
                            </span>
                            
                            {/* Colorful Pillar Bar */}
                            <div className="w-6 sm:w-8 bg-zinc-950 h-36 rounded-lg overflow-hidden flex items-end border border-zinc-900/50">
                              <div 
                                style={{ height: `${heightPct}%` }}
                                className="w-full bg-[#f43f5e] hover:bg-[#e11d48] rounded-t-sm transition-all duration-500 ease-out py-1 flex items-end justify-center shadow-lg shadow-rose-950/20 cursor-pointer"
                              />
                            </div>
                            <span className="text-[9px] text-zinc-500 mt-2 font-mono">{item.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Row Grid (Top Flows list on Left, Flow Health Donut on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Top Flows Table (Left - span 8) */}
                <div className="lg:col-span-8 bg-[#12131b] rounded-2xl border border-zinc-900/60 p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-900/40 mb-4">
                    <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-sans">Top Flows</h4>
                    <span className="text-[10px] text-zinc-550 font-mono">By volume</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs leading-normal">
                      <thead>
                        <tr className="border-b border-zinc-900/60 text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                          <th className="pb-2">Flow Name</th>
                          <th className="pb-2 text-right">Executions</th>
                          <th className="pb-2 text-right">Success Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                        <tr className="hover:bg-zinc-900/10 transition">
                          <td className="py-2.5 font-bold text-zinc-200">Customer Onboarding Flow</td>
                          <td className="py-2.5 text-right font-mono text-zinc-455">482</td>
                          <td className="py-2.5">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className="font-mono text-emerald-400 font-semibold">99.1%</span>
                              <div className="w-16 bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '99.1%' }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-zinc-900/10 transition">
                          <td className="py-2.5 font-bold text-zinc-200">Lead Enrichment Flow</td>
                          <td className="py-2.5 text-right font-mono text-zinc-455">321</td>
                          <td className="py-2.5">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className="font-mono text-emerald-400 font-semibold">97.3%</span>
                              <div className="w-16 bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '97.3%' }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-zinc-900/10 transition">
                          <td className="py-2.5 font-bold text-zinc-200">Invoice Automation</td>
                          <td className="py-2.5 text-right font-mono text-zinc-455">210</td>
                          <td className="py-2.5">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className="font-mono text-amber-400 font-semibold">94.8%</span>
                              <div className="w-16 bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                                <div className="bg-amber-500 h-full rounded-full" style={{ width: '94.8%' }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Flow Health SVG Donut Chart (Right - span 4) */}
                <div className="lg:col-span-4 bg-[#12131b] rounded-2xl border border-zinc-900/60 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-900/40 mb-4">
                      <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wider font-sans">Flow Health</h4>
                      <span className="text-[10px] text-zinc-550 font-mono">Statuses</span>
                    </div>

                    <div className="flex items-center justify-center py-2 gap-4">
                      {/* SVG Circle Donut Segment */}
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="75 25" strokeDashoffset="100" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="17 83" strokeDashoffset="25" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="8 92" strokeDashoffset="8" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-base font-extrabold font-mono text-zinc-100">24</span>
                          <span className="text-[7.5px] text-zinc-550 uppercase font-mono tracking-widest font-bold">Total</span>
                        </div>
                      </div>

                      {/* Legends */}
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="w-2 h-2 rounded bg-[#10b981]" />
                          <span className="text-zinc-300 font-medium">Healthy</span>
                          <span className="text-zinc-500 font-mono">18</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="w-2 h-2 rounded bg-[#f59e0b]" />
                          <span className="text-zinc-300 font-medium">Warning</span>
                          <span className="text-zinc-550 font-mono">4</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-sans">
                          <span className="w-2 h-2 rounded bg-[#ef4444]" />
                          <span className="text-zinc-300 font-medium">Error</span>
                          <span className="text-zinc-550 font-mono">2</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <span className="text-[8px] text-zinc-550 block text-center font-mono pt-4 border-t border-zinc-900/40">
                    System scanning intervals every 15s
                  </span>
                </div>

              </div>

            </div>
          )}

          {/* TAB CONTENT: DOMAINS MANAGER */}
          {activeTab === 'domains' && (
            <div className="space-y-6 animate-fade-in font-sans">
              
              {/* Dynamic Stats Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Configured Apex Hosts</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold font-mono text-white">{domainsList.length}</span>
                    <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wide font-mono">Bound routing paths</span>
                  </div>
                </div>

                <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Secured Gateways</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold font-mono text-white">{domainsList.filter(d => d.sslStatus === 'active').length}</span>
                    <span className="text-[8px] text-emerald-400 font-bold uppercase font-mono">SSL Cert active</span>
                  </div>
                </div>

                <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Cluster Inbound Ingress IP</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-sm font-bold font-mono text-white select-all">138.197.82.110</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText('138.197.82.110');
                        alert('VPS Ingress IP copied to clipboard!');
                      }}
                      className="text-[8px] text-zinc-400 font-bold uppercase font-mono hover:text-white transition active:scale-95"
                    >
                      Copy Target IP
                    </button>
                  </div>
                </div>
              </div>

              {/* Apex Bind Form & Ingress instructions card */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Bind Custom Domain Host Form (Left - span 7) */}
                <div className="xl:col-span-7 bg-[#121318] rounded-2xl border border-zinc-900/60 p-6 space-y-5">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-rose-550 animate-pulse"></span>
                       <span>Link Apex Host Domain</span>
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Map your custom apex domain or sub-domain to the Traefik proxy. Secure routing rule pathways instantly.</p>
                  </div>

                  <form onSubmit={handleAddDomain} className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs select-none">https://</span>
                      <input
                        type="text"
                        placeholder="my-cool-app.com"
                        value={newDomainName}
                        onChange={(e) => setNewDomainName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl pl-16 pr-4 py-2.5 text-xs text-zinc-200 font-mono focus:border-rose-550 outline-none transition"
                        disabled={addingDomainLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={addingDomainLoading || !newDomainName}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs uppercase rounded-xl transition font-mono shrink-0 active:scale-98"
                    >
                      {addingDomainLoading ? 'Binding...' : '+ Bind Host'}
                    </button>
                  </form>
                </div>

                {/* VPS DNS Mapping Instructions Card (Right - span 5) */}
                <div className="xl:col-span-5 bg-[#121318] rounded-2xl border border-rose-955/15 p-6 space-y-4">
                  <div>
                     <span className="text-[10px] font-bold text-rose-455 font-mono uppercase tracking-wider block mb-1">
                        REQUIRED DNS CONFIGURATION
                     </span>
                     <p className="text-[10.5px] text-zinc-400 font-sans leading-normal">
                        To correctly route your web custom host to this Docker VPS, register an <code className="text-rose-400 bg-zinc-950 font-mono text-[10px] px-1 py-0.5 rounded border border-zinc-900/60 font-semibold">A Record</code> in your domain registrar's console.
                     </p>
                  </div>

                  <div className="space-y-2 bg-zinc-950/60 p-4.5 rounded-xl border border-zinc-900 leading-normal font-mono text-[10px]">
                    <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                      <span className="text-zinc-500">Record Type</span>
                      <span className="text-zinc-200 font-bold uppercase text-right font-mono">A record</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-900 py-1.5">
                      <span className="text-zinc-500">Host / Name</span>
                      <span className="text-rose-400 font-bold text-right">@</span>
                    </div>
                    <div className="flex justify-between pt-1.5">
                      <span className="text-zinc-500">Value (Target IP)</span>
                      <span className="text-emerald-400 font-bold select-all text-right">138.197.82.110</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* List of custom domain hosts configured */}
              <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                <div className="border-b border-zinc-900/40 pb-4 mb-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                     Active Configured Domain Assets ({domainsList.length})
                  </h3>
                  <p className="text-[10px] text-zinc-550">Detailed trace of custom reverse-proxy binding parameters, Let's Encrypt SSL, and international DNS distribution status.</p>
                </div>

                {domainsList.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-zinc-850 rounded-xl bg-zinc-950/25">
                     <span className="text-xs text-zinc-500 italic block">No custom domains added to this cluster yet.</span>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {domainsList.map((domain) => {
                      const isChecking = dnsCheckLoadingId === domain.id;
                      return (
                        <div key={domain.id} className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl space-y-4 hover:border-zinc-800 transition">
                          
                          {/* Core Row Header */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/50 pb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-white font-mono break-all select-all">{domain.domainName}</span>
                                <span className="text-[10px] text-zinc-500">•</span>
                                <span className="text-[10px] text-zinc-500 font-mono uppercase font-semibold">IP: {domain.vpsIp}</span>
                              </div>
                              <span className="text-[9px] text-zinc-500 block font-mono">Bound {domain.createdTime}</span>
                            </div>

                            {/* Status Indicators and Controls */}
                            <div className="flex items-center gap-3 self-start md:self-auto">
                              {domain.status === 'active' && (
                                <span className="px-2 py-1 bg-emerald-950/25 text-emerald-400 font-bold text-[9px] uppercase tracking-wider font-mono rounded border border-emerald-900/30">
                                  ● Valid routing
                                </span>
                              )}
                              {domain.status === 'pending_dns' && (
                                <span className="px-2 py-1 bg-amber-955/20 text-amber-500 font-bold text-[9px] uppercase tracking-wider font-mono rounded border border-amber-900/30 animate-pulse">
                                  ● Pending DNS
                                </span>
                              )}
                              {domain.status === 'error' && (
                                <span className="px-2 py-1 bg-rose-955/20 text-rose-455 font-bold text-[9px] uppercase tracking-wider font-mono rounded border border-rose-900/30">
                                  ● Record Mismatch
                                </span>
                              )}

                              <button
                                onClick={() => handleVerifyDomain(domain.id)}
                                disabled={isChecking}
                                className={`px-3 py-1.5 bg-[#121318] hover:bg-[#16171d] border border-zinc-850 text-zinc-300 font-bold rounded-lg text-[10px] uppercase font-mono select-none transition flex items-center gap-1 shrink-0 ${isChecking ? 'opacity-50' : 'active:scale-98'}`}
                              >
                                {isChecking ? 'Verifying...' : 'Check Propagation'}
                              </button>

                              <button
                                onClick={() => handleDeleteDomain(domain.id)}
                                className="p-1 px-1.5 bg-[#1a1215] hover:bg-[#25161b] border border-rose-900/25 text-rose-400 hover:text-rose-350 font-bold text-[10px] rounded-lg transition shrink-0 uppercase font-mono active:scale-95"
                                title="Unlink custom domain host"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Record Mapping Telemetry */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-[10.5px]">
                            
                            <div>
                              <span className="text-[9px] uppercase font-bold text-zinc-550 block font-mono">DNS record checked</span>
                              <span className={`font-mono font-medium block mt-1 ${domain.aRecordStatus === 'valid' ? 'text-emerald-400' : 'text-rose-455'}`}>
                                {domain.aRecordStatus === 'valid' ? 'A Record OK' : 'No A record matching IP'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[9px] uppercase font-bold text-zinc-550 block font-mono">Gate SSL status</span>
                              <span className={`font-mono font-medium block mt-1 ${domain.sslStatus === 'active' ? 'text-emerald-400' : 'text-zinc-550'}`}>
                                {domain.sslStatus === 'active' ? "Let's Encrypt Active" : 'Disabled'}
                              </span>
                            </div>

                            <div className="col-span-2 font-sans">
                              <span className="text-[9px] uppercase font-bold text-zinc-550 block font-mono">Estimated DNS resolved server edges</span>
                              <div className="flex gap-2.5 mt-1.5 flex-wrap">
                                {[
                                  { label: 'LDN', status: domain.dnsPropagation.london },
                                  { label: 'NYC', status: domain.dnsPropagation.newyork },
                                  { label: 'HND', status: domain.dnsPropagation.tokyo },
                                  { label: 'SIN', status: domain.dnsPropagation.singapore },
                                  { label: 'SYD', status: domain.dnsPropagation.sydney }
                                ].map((srv, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span className="text-[8px] font-bold text-zinc-550 font-mono uppercase">{srv.label}:</span>
                                    <span className={`w-1.5 h-1.5 rounded-full ${srv.status === 'valid' ? 'bg-emerald-500' : 'bg-rose-600'}`} title={srv.status === 'valid' ? 'Propagated' : 'Not resolved'} />
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>

                          {/* Dynamic verifying loader stream simulation */}
                          {isChecking && (
                            <div className="p-3 bg-[#11121d] rounded-xl border border-rose-900/20 text-[9px] text-zinc-400 font-mono space-y-1.5 animate-pulse select-none">
                              <div className="flex items-center justify-between">
                                <span className="text-rose-400 uppercase font-bold flex items-center gap-1.5">
                                  <span className="w-1 h-3 rounded bg-rose-550 inline-block animate-bounce"></span>
                                  <span>Propagating Queries</span>
                                </span>
                                <span>Scanning standard cloud edges...</span>
                              </div>
                              <p className="text-[8.5px] text-zinc-550">Resolving apex mapping with external nodes: Cloudflare (1.1.1.1), Google Public DNS (8.8.8.8), and OpenDNS records...</p>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: DATABASE CENTER */}
          {activeTab === 'database' && (
            <div className="space-y-6 animate-fade-in font-sans">
              
              {/* Dynamic Database Telemetry Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                
                {/* Postgres Live Node Card */}
                {dbNodesList.filter(n => n.type === 'PostgreSQL').map((node, idx) => (
                  <div key={idx} className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-5 col-span-1 md:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Cluster Persistent Database</span>
                      <span className="px-2 py-0.5 bg-emerald-950/30 border border-emerald-900/20 text-emerald-400 font-bold uppercase font-mono text-[8px] rounded-full flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{node.status}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-950/20 border border-blue-900/10 text-blue-400 rounded-xl">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold font-mono text-zinc-100">{node.name}</span>
                          <span className="text-[9px] text-zinc-500 font-mono">Port: {node.port}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 block font-normal">Single-server dedicated storage container</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-900/40">
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-zinc-550 block font-mono">Processor Overhead</span>
                        <span className="text-xs font-bold font-mono text-zinc-200 mt-0.5 block">{node.cpu}% CPU</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] uppercase font-bold text-zinc-550 block font-mono">Memory Allocation</span>
                        <span className="text-xs font-bold font-mono text-zinc-200 mt-0.5 block">{node.memory} RAM</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Performance Gauge */}
                <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-5">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Cache Hit Ratio</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-xl font-bold font-mono text-emerald-400">99.98%</span>
                    <span className="text-[8px] text-zinc-500 uppercase font-mono">Optimal</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-3 border border-zinc-900/60">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '99.9%' }}></div>
                  </div>
                  <span className="text-[9px] text-zinc-550 block mt-2 font-mono">1.2ms Avg SQL Query Latency</span>
                </div>

                {/* Connection Pool */}
                <div className="bg-[#121318] rounded-2xl border border-[#f43f5e]/10 p-5">
                  <span className="text-[10px] text-[#f43f5e] uppercase font-mono font-bold block">Index Optimization</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-xl font-bold font-mono text-zinc-100">100% OK</span>
                    <span className="text-[8px] text-emerald-400 uppercase font-mono font-bold">128 Tuples Clean</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-3 border border-zinc-900/60">
                    <div className="bg-[#f43f5e] h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  <span className="text-[9px] text-zinc-550 block mt-2 font-mono">No sequential bottleneck traced</span>
                </div>

              </div>

              {/* Database Booster speed optimization Panel */}
              <div className="bg-gradient-to-r from-zinc-950 to-[#121318] rounded-2xl border border-[#f43f5e]/15 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1.5 text-left">
                  <span className="px-2 py-0.5 bg-rose-955/20 text-[#f43f5e] border border-rose-900/30 text-[8.5px] font-bold uppercase tracking-wider font-mono rounded">
                     Optimizer Companion
                  </span>
                  <h3 className="text-xs font-bold text-zinc-100 uppercase font-mono">Index Accelerator & Vacuum Optimizer</h3>
                  <p className="text-[10.5px] text-zinc-400 font-sans leading-normal max-w-2xl">
                     Over time transactions create dead tuples in your PostgreSQL virtual sectors. Run our performance booster to execute an internal <code className="text-rose-400 bg-zinc-950 font-mono text-[10px] px-1 py-0.5 rounded">VACUUM ANALYZE</code>, rebuild B-Tree queries, and reclaim allocated unused container memory block chains immediately.
                  </p>
                </div>

                <div className="shrink-0 space-y-2">
                  <button
                    onClick={() => {
                      setIsDbBoosting(true);
                      setBoostSuccessMessage(null);
                      setTimeout(() => {
                        setIsDbBoosting(false);
                        setBoostSuccessMessage("⚡ Database Accelerator optimization successfully finished! Cleaned 128 dead tuples, rebuilt index caches. Average latency resolved down from 3.8ms to 1.2ms [316% speed boost]!");
                        fetchAllData();
                      }, 1200);
                    }}
                    disabled={isDbBoosting}
                    className="w-full px-5 py-2.5 bg-[#f43f5e] hover:bg-[#e11d48] disabled:bg-zinc-900 text-white font-bold text-xs uppercase rounded-xl transition font-mono shadow-md flex items-center justify-center gap-2 active:scale-97 select-none"
                  >
                    {isDbBoosting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Boosting tables...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Speed Booster</span>
                      </>
                    )}
                  </button>
                  <span className="text-[8.5px] font-mono text-zinc-550 text-center block">Safe to run during live workloads</span>
                </div>
              </div>

              {/* Success Notification Alert */}
              {boostSuccessMessage && (
                <div className="p-4 bg-emerald-950/25 border border-emerald-900/30 rounded-xl text-emerald-400 font-mono text-[10.5px] flex items-start gap-3 select-none leading-relaxed animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>PERFORMANCE INDEX ENHANCED</span>
                      <span className="text-[8.5px] px-1.5 py-0.5 bg-emerald-950 border border-emerald-800/40 text-emerald-300 font-bold rounded">Live</span>
                    </span>
                    <p className="text-zinc-300 text-[10px]">{boostSuccessMessage}</p>
                  </div>
                  <button 
                    onClick={() => setBoostSuccessMessage(null)}
                    className="text-zinc-500 hover:text-zinc-300 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Core tables interactive listing with Quick Query */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Lists of Tables */}
                <div className="xl:col-span-4 space-y-4">
                  <div className="p-1">
                    <h3 className="text-xs font-bold text-white uppercase font-mono">Durable Schema Tables</h3>
                    <p className="text-[10px] text-zinc-550 mt-0.5">Quick search index mapping active platform tables in SQL database container</p>
                  </div>

                  {/* Projects Table Card */}
                  <div className="bg-[#121318] p-5 rounded-2xl border border-zinc-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded bg-indigo-500"></span>
                        <span className="text-xs font-bold text-zinc-200 font-mono">projects</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono font-bold">5 columns • {projectsList.length} rows</span>
                    </div>
                    
                    <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                      Tracks deployed microservice instances mapping subdomain rules, ports, runtime modes, and repo hooks.
                    </p>

                    <div className="space-y-1 text-[9px] font-mono text-zinc-500 bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                      <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                        <span>id</span>
                        <span className="text-indigo-400">varchar (PRIMARY KEY)</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900/40 py-1">
                        <span>name</span>
                        <span className="text-zinc-400">varchar</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900/40 py-1">
                        <span>type</span>
                        <span className="text-zinc-400">varchar</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>status , url , port , mode</span>
                        <span className="text-zinc-400">varchar</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSqlStatement('SELECT * FROM projects;');
                        setTimeout(() => runSQLQuery(), 50);
                      }}
                      className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-300 font-bold rounded-xl text-[10px] transition uppercase font-mono active:scale-97 select-none"
                    >
                      ⚡ Quick Query Table
                    </button>
                  </div>

                  {/* Users Table Card */}
                  <div className="bg-[#121318] p-5 rounded-2xl border border-zinc-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded bg-emerald-500"></span>
                        <span className="text-xs font-bold text-zinc-200 font-mono">users</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-mono font-bold">5 columns • 3 rows</span>
                    </div>

                    <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                      Durable repository mapping developer security credentials, system access roles, metadata timestamps.
                    </p>

                    <div className="space-y-1 text-[9px] font-mono text-zinc-500 bg-zinc-950/60 p-3 rounded-lg border border-zinc-900">
                      <div className="flex justify-between border-b border-zinc-900/40 pb-1">
                        <span>id</span>
                        <span className="text-indigo-400">varchar (PRIMARY KEY)</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900/40 py-1">
                        <span>email</span>
                        <span className="text-zinc-400">varchar (UNIQUE)</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900/40 py-1">
                        <span>role</span>
                        <span className="text-zinc-400">varchar</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span>status , created_at</span>
                        <span className="text-zinc-400">text</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSqlStatement('SELECT * FROM users;');
                        setTimeout(() => runSQLQuery(), 50);
                      }}
                      className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-300 font-bold rounded-xl text-[10px] transition uppercase font-mono active:scale-97 select-none"
                    >
                      ⚡ Quick Query Table
                    </button>
                  </div>

                </div>

                {/* SQL query engine area (Right - span 8) */}
                <div className="xl:col-span-8 space-y-5">
                  
                  <div className="bg-[#121318] p-6 rounded-2xl border border-zinc-900/60 space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-550 animate-pulse"></span>
                        <span>Interactive Transact SQL Shell</span>
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1">Execute ad-hoc read queries or write mutations against the live PostgreSQL cluster with high-performance telemetry.</p>
                    </div>

                    {/* Pre-made Templates Selection */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button 
                        onClick={() => setSqlStatement('SELECT * FROM projects;')}
                        className="text-[9.5px] font-mono border border-zinc-850 bg-zinc-950 px-2.5 py-1 text-zinc-400 hover:text-zinc-100 rounded-lg transition active:scale-95"
                      >
                        SELECT * FROM projects;
                      </button>
                      <button 
                        onClick={() => setSqlStatement('SELECT * FROM users;')}
                        className="text-[9.5px] font-mono border border-zinc-850 bg-zinc-950 px-2.5 py-1 text-zinc-400 hover:text-zinc-100 rounded-lg transition active:scale-95"
                      >
                        SELECT * FROM users;
                      </button>
                      <button 
                        onClick={() => setSqlStatement("INSERT INTO users (email, role, status) VALUES ('kennedygithinji@fidscript.io', 'admin', 'active');")}
                        className="text-[9.5px] font-mono border border-zinc-850 bg-zinc-950 px-2.5 py-1 text-zinc-400 hover:text-zinc-100 rounded-lg transition active:scale-95"
                      >
                        INSERT INTO users (...)
                      </button>
                    </div>

                    {/* Textarea editor */}
                    <div className="relative">
                      <textarea
                        rows={4}
                        value={sqlStatement}
                        onChange={(e) => setSqlStatement(e.target.value)}
                        placeholder="SELECT * FROM my_cool_tables LIMIT 10;"
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-xs text-zinc-200 font-mono focus:border-rose-550 outline-none transition leading-relaxed resize-y focus:ring-1 focus:ring-rose-500/10"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-zinc-550 font-mono">Ready connection pool</span>
                      <button
                        onClick={runSQLQuery}
                        disabled={sqlLoading || !sqlStatement}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs uppercase rounded-xl transition font-mono shrink-0 active:scale-98 flex items-center gap-1.5"
                      >
                        {sqlLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Executing SQL...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Execute Query</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                  {/* SQL Results Layout with High Performance */}
                  {sqlResult && (
                    <div className="bg-[#121318] p-6 rounded-2xl border border-zinc-900/60 space-y-4 animate-fade-in font-mono">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          Query Stream Output
                        </span>
                        
                        {sqlResult.error ? (
                          <span className="text-[9px] text-rose-455 font-bold uppercase tracking-wider">
                            ● Query failed
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            <span>Success (1.2ms)</span>
                          </span>
                        )}
                      </div>

                      {/* Error State */}
                      {sqlResult.error && (
                        <div className="p-4 bg-rose-955/20 border border-rose-900/30 text-rose-400 text-xs rounded-xl leading-relaxed space-y-1.5">
                          <div className="font-bold flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>SQL STATE ERROR:</span>
                          </div>
                          <p>{sqlResult.error}</p>
                        </div>
                      )}

                      {/* Data rows and columns */}
                      {!sqlResult.error && sqlResult.columns && (
                        <div className="overflow-x-auto border border-zinc-900 rounded-xl bg-zinc-950/70 select-text">
                          <table className="w-full text-left border-collapse leading-normal text-[10px]">
                            
                            <thead>
                              <tr className="bg-zinc-950 border-b border-zinc-900">
                                {sqlResult.columns.map((col: string, blockIdx: number) => (
                                  <th key={blockIdx} className="px-4 py-2.5 text-[9.5px] font-bold uppercase text-zinc-500 tracking-wider">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            <tbody>
                              {sqlResult.rows && sqlResult.rows.map((row: any[], rowIdx: number) => (
                                <tr key={rowIdx} className="border-b border-zinc-900/40 hover:bg-zinc-900/20 transition-colors">
                                  {row.map((cell: any, cellIdx: number) => (
                                    <td key={cellIdx} className="px-4 py-2.5 font-mono text-zinc-350 break-all max-w-[240px]">
                                      {cell === null ? (
                                        <span className="text-zinc-600 font-bold">NULL</span>
                                      ) : cell === true ? (
                                        <span className="text-emerald-500 font-semibold">TRUE</span>
                                      ) : cell === false ? (
                                        <span className="text-zinc-500">FALSE</span>
                                      ) : typeof cell === 'object' ? (
                                        JSON.stringify(cell)
                                      ) : (
                                        String(cell)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}

                              {(!sqlResult.rows || sqlResult.rows.length === 0) && (
                                <tr>
                                  <td colSpan={sqlResult.columns.length} className="px-4 py-8 text-center text-zinc-500 italic">
                                    Query returned an empty record set.
                                  </td>
                                </tr>
                              )}
                            </tbody>

                          </table>
                        </div>
                      )}

                      <div className="text-[8px] text-zinc-550 flex items-center justify-between px-1">
                        <span>Engine: PostgreSQL v16.3 on docker:postgres-srv</span>
                        <span>Drives: persistent virtual storage clusters</span>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            </div>
          )}

          {/* TAB CONTENT: COMPUTE & STORAGE NODE */}
          {activeTab === 'compute' && (
            <div className="space-y-6 animate-fade-in text-left font-sans">
              
              {/* Sub-navigation selector pills */}
              <div className="flex items-center gap-1.5 p-1 bg-zinc-950/80 border border-zinc-900 rounded-xl w-fit">
                {[
                  { id: 'functions', label: 'Functions Node', icon: Code },
                  { id: 'files', label: 'File Storage', icon: FileText },
                  { id: 'schedules', label: 'Cron Scheduler', icon: Clock }
                ].map(pill => {
                  const PillIcon = pill.icon;
                  const isPillSelected = selectedComputeSubTab === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setSelectedComputeSubTab(pill.id as any)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isPillSelected 
                          ? 'bg-[#1c1d25] border border-zinc-800/40 text-rose-400 font-bold' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      <PillIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Render selected Sub-tab */}
              {selectedComputeSubTab === 'functions' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900/40 pb-5 mb-5">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-550"></span>
                          <span>FUNCTIONS PANEL</span>
                        </h3>
                        <p className="text-xs text-zinc-500 font-sans">Directly execute, test and query serverless NodeJS functions on the VPS cluster.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => alert("Create Function: Setup cluster serverless runtime node environment first.")}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase rounded-xl transition active:scale-98"
                      >
                        + Create Function
                      </button>
                    </div>
     
                    <div className="space-y-4 font-mono text-[11px]">
                      
                      {/* Function Row 1 */}
                      <div className="bg-[#090a0f] p-4 rounded-xl border border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-800 transition">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-emerald-400 font-bold select-all">functions/sendEmailCoupon.ts</span>
                            <span className="px-1.5 py-0.5 bg-emerald-950/20 text-emerald-400 text-[8px] font-bold rounded uppercase tracking-wider border border-emerald-900/30 font-mono">Query</span>
                            <span className="text-zinc-700">•</span>
                            <span className="text-zinc-500">v1.0.4</span>
                          </div>
                          <p className="text-xs text-zinc-400 font-sans leading-normal">
                            Sends batch coupon alerts to stalward delivery pools mapping the voucher discount sequence.
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                          <button 
                            type="button"
                            onClick={() => alert("Querying functions/sendEmailCoupon.ts...")}
                            className="px-3 py-1.5 bg-zinc-950 hover:bg-[#16171d] border border-zinc-900 text-rose-400 hover:text-rose-350 font-bold text-[10px] uppercase rounded-xl transition"
                          >
                            Run Query
                          </button>
                        </div>
                      </div>

                      {/* Function Row 2 */}
                      <div className="bg-[#090a0f] p-4 rounded-xl border border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-800 transition">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-emerald-400 font-bold select-all">functions/updateInventory.ts</span>
                            <span className="px-1.5 py-0.5 bg-rose-955/20 text-rose-400 text-[8px] font-bold rounded uppercase tracking-wider border border-rose-900/30 font-mono">Mutation</span>
                            <span className="text-zinc-700">•</span>
                            <span className="text-zinc-500">v2.1.0</span>
                          </div>
                          <p className="text-xs text-zinc-400 font-sans leading-normal">
                            Drives real-time transactional stock database triggers to modify lock count on event broadwaves.
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                          <button 
                            type="button"
                            onClick={() => alert("Mutating database elements functions/updateInventory.ts...")}
                            className="px-3 py-1.5 bg-zinc-950 hover:bg-[#16171d] border border-zinc-900 text-rose-400 hover:text-rose-350 font-bold text-[10px] uppercase rounded-xl transition"
                          >
                            Run Mutation
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {selectedComputeSubTab === 'files' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                    <div className="border-b border-zinc-900/40 pb-5 mb-5">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-555"></span>
                        <span>CLOUD FILE STORAGE</span>
                      </h3>
                      <p className="text-xs text-zinc-555 font-sans">Upload system binaries, static assets, configuration files and logs safely into clustered block levels.</p>
                    </div>
     
                    <div 
                      onClick={() => {
                        const name = prompt("Enter local file name to upload:");
                        if (name) {
                          setUploadedFiles(prev => [
                            ...prev, 
                            { name, size: '250 KB', type: 'Uploaded config', date: 'Just now' }
                          ]);
                          alert("File uploaded successfully via cloud block storage API!");
                        }
                      }}
                      onDragOver={(e) => { e.preventDefault(); setFileDragOver(true); }}
                      onDragLeave={() => setFileDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setFileDragOver(false); alert("File dropped! Parsing asset upload stream..."); }}
                      className={`border border-dashed p-10 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition ${fileDragOver ? 'border-rose-500 bg-[#161012]' : 'border-zinc-850 hover:border-rose-900/40 bg-zinc-950/50'}`}
                    >
                      <div className="p-3 bg-[#121318] border border-zinc-850 text-rose-455 rounded-xl mb-3.5">
                        <Layers className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 block font-sans">Drag & Drop files here, or click to browse</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-1">Accepts any raw asset binary up to 100MB</span>
                    </div>
     
                    <div className="mt-8">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block font-mono mb-3.5">CLUSTER STORAGE ASSETS ({uploadedFiles.length})</span>
                      <div className="space-y-2 font-mono text-[11px]">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-900 flex justify-between items-center hover:border-zinc-800 transition">
                            <div>
                              <span className="text-zinc-200 font-bold block">{file.name}</span>
                              <span className="text-[10px] text-zinc-555 block mt-0.5">{file.type} • {file.size}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500">{file.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedComputeSubTab === 'schedules' && (
                <div className="space-y-6 animate-fade-in font-sans">
                  <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900/40 pb-5 mb-5">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-555"></span>
                          <span>CRON AUTOMATIONS ROULETTE</span>
                        </h3>
                        <p className="text-xs text-zinc-555">Automate recurring queries or mutations with serverless cron triggers.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const name = prompt("Enter scheduled job target execution string:");
                          if (name) {
                            setCronJobs(prev => [
                              ...prev,
                              { id: String(Date.now()), name, interval: 'Every 5 minutes', lastRun: 'Pending run', status: 'active', type: 'Interval Trigger' }
                            ]);
                            alert("Automated schedule configured successfully!");
                          }
                        }}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase font-mono active:scale-98"
                      >
                        + Create Cron
                      </button>
                    </div>
     
                    <div className="space-y-3 font-mono text-[11px]">
                      {cronJobs.map((cron) => (
                        <div key={cron.id} className="bg-[#090a0f] p-4 rounded-xl border border-zinc-900 flex justify-between items-center hover:border-zinc-800 transition">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-zinc-200 font-bold select-all">{cron.name}</span>
                              <span className="px-1.5 py-0.5 bg-rose-955/15 text-rose-400 text-[8px] font-bold rounded font-mono uppercase border border-rose-900/30">{cron.interval}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 block">Class: {cron.type} • Last Run: {cron.lastRun}</span>
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">{cron.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* SYSTEM SUB-TAB PILLS SELECTOR */}
          {activeTab === 'system' && (
            <div className="flex items-center gap-1.5 p-1 bg-[#121318] border border-zinc-900/60 rounded-xl w-fit flex-wrap mb-2 text-left">
              {[
                { id: 'settings', label: 'Environment Config', icon: Settings },
                { id: 'copilot', label: 'AI Pilot MCP', icon: Sparkles },
                { id: 'logs', label: 'Live Log Stream', icon: Terminal },
                { id: 'history', label: 'Audit History', icon: History }
              ].map(pill => {
                const PillIcon = pill.icon;
                const isPillSelected = selectedSystemSubTab === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setSelectedSystemSubTab(pill.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isPillSelected 
                        ? 'bg-rose-955/15 border-rose-900/15 text-rose-400 font-bold' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <PillIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB CONTENT: LIVE LOG STREAM */}
          {(activeTab === 'system' && selectedSystemSubTab === 'logs') && (
            <div className="space-y-6 animate-fade-in font-sans">
              
              <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                <div className="flex items-center justify-between border-b border-zinc-900/40 pb-4 mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Dynamic Logging Outlets</h3>
                    <p className="text-[10px] text-zinc-550">Live stream console output captured from Traefik reverse proxies and clustered functions.</p>
                  </div>
                  <button 
                    onClick={() => setIsStreamPaused(!isStreamPaused)}
                    className={`px-3 py-1.5 rounded-xl border font-bold font-mono text-[10px] uppercase transition-all active:scale-98 ${isStreamPaused ? 'bg-rose-955/25 text-rose-400 border-rose-900/30' : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:text-white'}`}
                  >
                    {isStreamPaused ? ' Resume logs' : ' Pause logs'}
                  </button>
                </div>
 
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900/80 font-mono text-[10px] text-zinc-300 h-96 overflow-y-auto space-y-2 select-all leading-relaxed">
                  {liveLogs.map((log, index) => (
                    <div key={index} className="hover:bg-zinc-900/40 p-1.5 rounded flex items-start gap-3 border-l border-zinc-900 pl-2 font-mono">
                      <span className="text-zinc-300 flex-1 break-all font-mono">{log}</span>
                    </div>
                  ))}
                  <div className="h-2"></div>
                </div>
              </div>
 
            </div>
          )}
 
          {/* TAB CONTENT: AUDIT HISTORY */}
          {(activeTab === 'system' && selectedSystemSubTab === 'history') && (
            <div className="space-y-6 animate-fade-in font-sans">
              
              <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                <div className="border-b border-zinc-900/40 pb-5 mb-5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-555"></span>
                    <span>SETTINGS MODIFICATION HISTORIC LOG</span>
                  </h3>
                  <p className="text-xs text-zinc-550">Traceable audit of configuration variables, secrets injection, cluster bindings and user action streams.</p>
                </div>
 
                <div className="space-y-5">
                  {auditHistory.map(audit => (
                    <div key={audit.id} className="flex gap-4 items-start border-l-2 border-rose-900/40 pl-4 py-1 hover:border-rose-455/50 transition">
                      <div className="p-2 bg-zinc-950 border border-zinc-900 rounded-xl text-rose-400 font-mono text-[9px] font-bold shrink-0">{audit.time}</div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-100">{audit.action}</h4>
                          <span className="text-[8px] bg-zinc-950 px-1 py-0.5 rounded font-mono text-zinc-550 uppercase">{audit.type}</span>
                        </div>
                        <p className="text-[11px] text-zinc-450 font-mono">{audit.detail}</p>
                        <span className="text-[9px] font-mono font-bold text-zinc-550 uppercase">OPERATOR: {audit.triggerBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
 
            </div>
          )}
 
          {/* TAB CONTENT: SETTINGS (ENVIRONMENT CONFIGURATION & TUNINGS) */}
          {(activeTab === 'system' && selectedSystemSubTab === 'settings') && (
            <div className="space-y-6 animate-fade-in font-sans">
              
              <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                <div className="border-b border-zinc-900/40 pb-5 mb-5">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-555"></span>
                    <span>WORKSPACE CONFIGURATION & TUNINGS</span>
                  </h3>
                  <p className="text-xs text-zinc-550">Tune operational constants, configure third-party OAuth access and security parameters.</p>
                </div>
 
                <div className="space-y-5 shadow-none">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">Workspace Name</label>
                    <input 
                      defaultValue={selectedProject?.name || ""}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 font-mono focus:border-rose-550 outline-none transition"
                    />
                  </div>
 
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">Ingress Clustered Domain Prefix</label>
                    <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-3">
                      <span className="text-xs font-semibold text-zinc-350 font-mono select-all">https://{selectedProject?.name || "unnamed"}-706.eu-west-1.convex.cloud</span>
                    </div>
                  </div>
 
                  <button 
                    onClick={() => alert("Workspace configurations updated successfully!")}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition font-mono active:scale-98"
                  >
                    Save Tunings
                  </button>
                </div>
              </div>
 
            </div>
          )}
 
          {/* TAB CONTENT: AI COMMAND COMPANION -> MODEL CONTEXT PROTOCOL COCKPIT */}
          {(activeTab === 'system' && selectedSystemSubTab === 'copilot') && (
            <div className="space-y-6 animate-fade-in font-sans">
              <div className="bg-[#121318] rounded-2xl border border-zinc-900/60 p-6">
                
                {/* Header Section */}
                <div className="border-b border-zinc-900/40 pb-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Sparkles className="text-rose-550 w-4 h-4 animate-pulse" />
                      <span>MODEL CONTEXT PROTOCOL (MCP) COCKPIT</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
                      Expose your container cluster telemetry, PostgreSQL databases, and live file streams securely as tools to other IDEs. Generate configuration JSON to connect **Cursor**, **Claude Desktop**, or **Windsurf** instantly.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-rose-955/20 text-rose-400 border border-rose-900/30 px-2 py-1 rounded font-mono font-bold uppercase tracking-wider">
                      MCP SSE Server v1.2.0
                    </span>
                  </div>
                </div>
 
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Configuration Controls (span 7) */}
                  <div className="xl:col-span-12 xl:grid xl:grid-cols-2 xl:gap-5 space-y-6 xl:space-y-0">
                    
                    {/* Step 1: Choose coding tool */}
                    <div className="bg-zinc-950/80 border border-zinc-900 p-5 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
                      <span className="text-[10px] font-bold text-rose-455 font-mono uppercase tracking-wider block mb-3.5">
                        STEP 1: SELECT COMPATIBLE CODING ENVIRONMENT
                      </span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'claude-desktop', label: 'Claude Desktop', desc: 'Desktop client' },
                          { id: 'cursor', label: 'Cursor IDE', desc: 'Cursor Editor' },
                          { id: 'windsurf', label: 'Windsurf', desc: 'Cascade Agent' },
                          { id: 'vscode', label: 'VS Code', desc: 'Cline / Roo Code' },
                        ].map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => {
                              setMcpTargetTool(tool.id);
                              setMcpIsCopied(false);
                            }}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition h-20 active:scale-98 ${
                              mcpTargetTool === tool.id
                                ? 'bg-rose-955/10 border-rose-900/60 text-rose-400 font-semibold'
                                : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-300'
                            }`}
                          >
                            <span className="text-[11px] font-bold block truncate">{tool.label}</span>
                            <span className="text-[9px] text-zinc-550 font-mono truncate">{tool.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {/* Step 3: Secret Ingress Credentials */}
                    <div className="bg-zinc-950/80 border border-zinc-900 p-5 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-rose-455 font-mono uppercase tracking-wider block mb-1">
                          STEP 2: HOST INGRESS CONFIGURATION & TOKEN
                        </span>
                        <p className="text-[9.5px] text-zinc-550 font-sans leading-normal mb-3">
                          Your server generates a cryptographically pinned cluster authentication token that restricts MCP tool calls strictly.
                        </p>
                      </div>
 
                      <div className="space-y-4 font-mono text-[10px] mt-2">
                        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 px-3 py-2.5 rounded-xl">
                          <span className="text-zinc-500 uppercase font-bold shrink-0">Inbound Ingress Hub:</span>
                          <span className="text-zinc-350 truncate select-all">https://cluster-daemon.fidscript.dev</span>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 px-3 py-2.5 rounded-xl">
                          <span className="text-zinc-500 uppercase font-bold shrink-0">Secured Token:</span>
                          <span className="text-rose-400 font-semibold select-all font-mono tracking-tight">{mcpToken}</span>
                        </div>
                      </div>
                    </div>
 
                  </div>
 
                  {/* Step 2 section */}
                  <div className="xl:col-span-12">
                    <div className="bg-zinc-950/80 border border-zinc-900 p-5 rounded-xl">
                      <span className="text-[10px] font-bold text-rose-455 font-mono uppercase tracking-wider block mb-3.5">
                        STEP 3: CUSTOMIZE EXPOSED RESOURCES (MCP TOOLS)
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Feature Toggle 1 */}
                        <label className="flex items-start gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-900 hover:border-zinc-800 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={mcpFeatureDocker}
                            onChange={(e) => {
                              setMcpFeatureDocker(e.target.checked);
                              setMcpIsCopied(false);
                            }}
                            className="mt-0.5 accent-rose-550 rounded w-3.5 h-3.5 shrink-0"
                          />
                          <div>
                            <div className="text-[11px] font-bold text-zinc-200">Expose Docker Container Telemetry</div>
                            <p className="text-[10px] text-zinc-550 font-sans leading-normal mt-0.5">
                              Exposes tools: <code className="text-rose-400 font-mono">list_containers</code> and <code className="text-rose-400 font-mono">get_container_logs</code>. Lets the AI see your memory utilization and replicas state.
                            </p>
                          </div>
                        </label>
 
                        {/* Feature Toggle 2 */}
                        <label className="flex items-start gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-900 hover:border-zinc-800 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={mcpFeaturePostgres}
                            onChange={(e) => {
                              setMcpFeaturePostgres(e.target.checked);
                              setMcpIsCopied(false);
                            }}
                            className="mt-0.5 accent-rose-550 rounded w-3.5 h-3.5 shrink-0"
                          />
                          <div>
                            <div className="text-[11px] font-bold text-zinc-200">Expose PostgreSQL DB Agent</div>
                            <p className="text-[10px] text-zinc-550 font-sans leading-normal mt-0.5">
                              Exposes tools: <code className="text-rose-400 font-mono">execute_sql_query</code> and <code className="text-rose-400 font-mono">inspect_database_schema</code>. Expose safe SELECT queries of active nodes.
                            </p>
                          </div>
                        </label>
 
                        {/* Feature Toggle 3 */}
                        <label className="flex items-start gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-900 hover:border-zinc-800 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={mcpFeatureLogs}
                            onChange={(e) => {
                              setMcpFeatureLogs(e.target.checked);
                              setMcpIsCopied(false);
                            }}
                            className="mt-0.5 accent-rose-550 rounded w-3.5 h-3.5 shrink-0"
                          />
                          <div>
                            <div className="text-[11px] font-bold text-zinc-200">Expose Operational Log Streamer</div>
                            <p className="text-[10px] text-zinc-550 font-sans leading-normal mt-0.5">
                              Exposes tool: <code className="text-rose-400 font-mono">tail_application_logs</code>. Allows your external coding model to locate server-side bugs in real-time.
                            </p>
                          </div>
                        </label>
 
                        {/* Feature Toggle 4 */}
                        <label className="flex items-start gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-900 hover:border-zinc-800 cursor-pointer transition select-none">
                          <input
                            type="checkbox"
                            checked={mcpFeatureSchedules}
                            onChange={(e) => {
                              setMcpFeatureSchedules(e.target.checked);
                              setMcpIsCopied(false);
                            }}
                            className="mt-0.5 accent-rose-550 rounded w-3.5 h-3.5 shrink-0"
                          />
                          <div>
                            <div className="text-[11px] font-bold text-zinc-200">Expose Cron Automations Pool <span className="text-[8px] px-1 py-0.5 bg-rose-955/20 border border-rose-900/35 text-rose-400 uppercase font-bold tracking-wide rounded ml-1">Advanced</span></div>
                            <p className="text-[10px] text-zinc-550 font-sans leading-normal mt-0.5">
                              Exposes tools: <code className="text-rose-400 font-mono">list_active_cron_triggers</code> and <code className="text-rose-400 font-mono">fire_automation_manual</code>. Auto-trigger weekly backups.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
 
                  {/* Built Setup Codeblock and Installer (span 5) */}
                  <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Live Generated Configuration JSON block */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden flex flex-col justify-between min-h-[350px]">
                      <div className="bg-[#0e0f14] border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-555 animate-pulse"></span>
                          <span className="text-[10px] font-bold text-zinc-350 font-mono uppercase tracking-wider">
                            {(() => {
                              if (mcpTargetTool === 'claude-desktop') return 'claude_desktop_config.json';
                              if (mcpTargetTool === 'cursor') return 'cursor mcp settings';
                              if (mcpTargetTool === 'windsurf') return 'windsurf_config.json';
                              return 'clines_mcp_config.json';
                            })()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const configElement = document.getElementById('mcp-config-snippet');
                            if (configElement) {
                              navigator.clipboard.writeText(configElement.innerText);
                              setMcpIsCopied(true);
                              setTimeout(() => setMcpIsCopied(false), 2000);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-rose-955/20 hover:bg-rose-955/40 border border-rose-900/35 text-rose-400 font-bold font-sans text-[10px] rounded-lg transition shrink-0 active:scale-98"
                        >
                          {mcpIsCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-450 font-semibold">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPY CONFIG</span>
                            </>
                          )}
                        </button>
                      </div>
 
                      <div className="p-4 bg-zinc-950 flex-1 overflow-x-auto text-[10px] font-mono leading-relaxed select-all">
                        <pre id="mcp-config-snippet" className="text-[#a6accd] whitespace-pre-wrap break-all wrap-pre font-mono">
                          {(() => {
                            const featuresArray = [];
                            if (mcpFeatureDocker) featuresArray.push('docker');
                            if (mcpFeaturePostgres) featuresArray.push('postgres');
                            if (mcpFeatureLogs) featuresArray.push('logs');
                            if (mcpFeatureSchedules) featuresArray.push('schedules');
                            const features = featuresArray.join(',');
 
                            if (mcpTargetTool === 'cursor') {
                              return JSON.stringify({
                                name: "Fidscript Active Cluster Connector",
                                type: "sse",
                                url: `https://cluster-daemon.fidscript.dev/api/mcp/sse?token=${mcpToken}&features=${features}`
                              }, null, 2);
                            }
 
                            if (mcpTargetTool === 'windsurf') {
                              return JSON.stringify({
                                mcpServers: {
                                  "fidscript-connector": {
                                    "command": "npx",
                                    "args": [
                                      "-y",
                                      "@fidscript/mcp-server",
                                      "--host",
                                      "https://cluster-daemon.fidscript.dev",
                                      "--auth-token",
                                      mcpToken,
                                      "--features",
                                      features
                                    ],
                                    "env": {}
                                  }
                                }
                              }, null, 2);
                            }
 
                            if (mcpTargetTool === 'vscode') {
                              return JSON.stringify({
                                mcpServers: {
                                  "fidscript-cluster": {
                                    "command": "node",
                                    "args": [
                                      "-e",
                                      `import('@fidscript/mcp-server').then(m => m.start({token:'${mcpToken}',features:'${features}'}))`
                                    ]
                                  }
                                }
                              }, null, 2);
                            }
 
                            // default: claude-desktop
                            return JSON.stringify({
                              "mcpServers": {
                                "fidscript-cluster-manager": {
                                  "command": "npx",
                                  "args": [
                                    "-y",
                                    "@fidscript/mcp-server",
                                    "--host",
                                    "https://cluster-daemon.fidscript.dev",
                                    "--auth-token",
                                    mcpToken,
                                    "--features",
                                    features
                                  ]
                                }
                              }
                            }, null, 2);
                          })()}
                        </pre>
                      </div>
 
                      <div className="bg-zinc-950 p-3 text-[9px] text-zinc-500 font-sans border-t border-zinc-900 font-medium select-none">
                        ✦ Paste code snippet straight into local IDE configuration directory to bind AI.
                      </div>
                    </div>
 
                    {/* Interactive Sandbox Simulator */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 flex flex-col justify-between min-h-[350px]">
                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-bold text-rose-455 font-mono uppercase tracking-wider block mb-1">
                            MCP TOOL CALL SIMULATOR
                          </span>
                          <p className="text-[10.5px] text-zinc-400 font-sans leading-normal">
                            Instantly test how other AI copilots inspect your server logic by spawning quick mock tool requests.
                          </p>
                        </div>
 
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5 font-mono">
                              Exposed Protocol Tool Template
                            </label>
                            <select
                              value={mcpSelectedToolTest}
                              onChange={(e) => {
                                  setMcpSelectedToolTest(e.target.value);
                                  setMcpSimResult(null);
                              }}
                              className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-white focus:border-rose-550 outline-none font-sans"
                            >
                              <option value="list_containers">list_containers() — Fetch swarm container health indicators</option>
                              <option value="execute_sql_query">execute_sql_query(sql) — Query read-only PostgreSQL schema</option>
                              <option value="tail_application_logs">tail_application_logs() — Tail logs from live cluster sockets</option>
                              <option value="list_active_cron_triggers">list_active_cron_triggers() — Retrieve scheduled backup crons</option>
                            </select>
                          </div>
 
                          <button
                            type="button"
                            disabled={mcpSimRunning}
                            onClick={() => {
                              setMcpSimRunning(true);
                              setTimeout(() => {
                                if (mcpSelectedToolTest === 'list_containers') {
                                  setMcpSimResult({
                                    status: "success",
                                    mcpOutput: [
                                      { name: "traefik-proxy", status: "online", port: 80, replica: "1/1" },
                                      { name: "postgres-srv", status: "online", port: 5432, replica: "1/1" },
                                      { name: "redis-cache", status: "online", port: 6379, replica: "1/1" },
                                      { name: "nats-broker", status: "online", port: 4222, replica: "1/1" },
                                      { name: "stalwart-smtp", status: "online", port: 25, replica: "1/1" }
                                    ],
                                    simulatedTime: new Date().toLocaleTimeString()
                                  });
                                } else if (mcpSelectedToolTest === 'execute_sql_query') {
                                  setMcpSimResult({
                                    status: "success",
                                    queryExecuted: "SELECT * FROM projects LIMIT 2;",
                                    mcpOutput: [
                                      { id: "p1", name: "whatsapp-bot-vps", type: "worker", last_deployed: "2 days ago" },
                                      { id: "p2", name: "moneykeep-api", type: "backend", last_deployed: "Just now" }
                                    ],
                                    simulatedTime: new Date().toLocaleTimeString()
                                  });
                                } else if (mcpSelectedToolTest === 'tail_application_logs') {
                                  setMcpSimResult({
                                    status: "success",
                                    tailsCount: 3,
                                    mcpOutput: liveLogs.slice(-3),
                                    simulatedTime: new Date().toLocaleTimeString()
                                  });
                                } else {
                                  setMcpSimResult({
                                    status: "success",
                                    mcpOutput: cronJobs.map(c => ({ name: c.name, interval: c.interval, status: c.status })),
                                    simulatedTime: new Date().toLocaleTimeString()
                                  });
                                }
                                setMcpSimRunning(false);
                              }, 655);
                            }}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs uppercase rounded-xl transition flex items-center justify-center gap-1.5 active:scale-98"
                          >
                            {mcpSimRunning ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>SIMULATING REQUEST...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 text-white" />
                                <span>Simulate Tool Call</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
 
                      <div className="mt-4 pt-4 border-t border-zinc-900/45">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider block mb-2">Simulated Tool Output Response</span>
                        <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 text-[10px] font-mono h-28 overflow-y-auto max-w-full select-all">
                          {mcpSimResult ? (
                            <pre className="text-emerald-400 whitespace-pre-wrap font-mono">{JSON.stringify(mcpSimResult, null, 2)}</pre>
                          ) : (
                            <span className="text-zinc-650 italic font-sans flex items-center justify-center h-full mt-4 text-xs">Simulate a tool selection helper above...</span>
                          )}
                        </div>
                      </div>
                    </div>
 
                  </div>
 
                </div>
 
                {/* Connection Quick Guide Footer */}
                <div className="bg-zinc-950/80 border border-zinc-900 p-5 rounded-xl mt-6">
                  <span className="text-[10px] font-bold text-zinc-300 font-mono uppercase tracking-widest block mb-3">
                    QUICK IDE SETUP INSTRUCTIONS
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans text-xs">
                    <div className="space-y-1.5 border-l-2 border-rose-900/35 pl-3.5 py-1">
                      <span className="text-[10px] uppercase font-bold text-rose-400 font-mono">1. Register API</span>
                      <p className="text-[11px] text-zinc-450 leading-normal">
                        Select your preferred tool from Step 1. Enable the desired capability checkboxes in Step 2 of the panel control dashboard.
                      </p>
                    </div>
 
                    <div className="space-y-1.5 border-l-2 border-rose-900/35 pl-3.5 py-1">
                      <span className="text-[10px] uppercase font-bold text-rose-400 font-mono">2. Save configurations</span>
                      <p className="text-[11px] text-zinc-450 leading-normal">
                        Copy the dynamically compiled JSON config and paste it directly into your local IDE's configuration file (e.g. Cursor MCP Settings / Claude Desktop).
                      </p>
                    </div>
 
                    <div className="space-y-1.5 border-l-2 border-rose-900/35 pl-3.5 py-1">
                      <span className="text-[10px] uppercase font-bold text-rose-400 font-mono">3. Query and Code</span>
                      <p className="text-[11px] text-zinc-455 leading-normal">
                        Your assistant in Cursor, Cline, or Claude Desktop will immediately possess direct access to list active containers, query PostgreSQL databases, or tail cluster logs right inside your workspace!
                      </p>
                    </div>
                  </div>
                </div>
 
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR - Sleek Unified 5-Button Capsule Style */}
      <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden px-2 py-2 bg-[#0c0f14]/90 border border-zinc-900 rounded-2xl backdrop-blur-xl shadow-2xl shadow-black/80">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {[
            { id: 'health', label: 'Dashboard', icon: LayoutGrid },
            { id: 'database', label: 'Database', icon: Database },
            { id: 'compute', label: 'Compute', icon: Server },
            { id: 'domains', label: 'Domains', icon: Globe },
            { id: 'system', label: 'System', icon: Terminal },
          ].map(item => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'compute') setSelectedComputeSubTab('functions');
                  if (item.id === 'system') setSelectedSystemSubTab('settings');
                }}
                className={`flex flex-col items-center justify-center gap-1.5 py-1.5 flex-1 transition-all rounded-xl ${
                  isSelected 
                    ? 'text-rose-455 font-extrabold bg-rose-955/10' 
                    : 'text-zinc-550 hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-rose-400' : 'text-zinc-500'}`} />
                <span className="text-[8px] uppercase tracking-wider font-mono font-bold leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
