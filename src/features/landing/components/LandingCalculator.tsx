import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

type CostConfig = 'startup' | 'scale' | 'custom';

export default function LandingCalculator() {
  const [selectedCostConfig, setSelectedCostConfig] = useState<CostConfig>('startup');
  const [appsCount, setAppsCount] = useState<number>(3);
  const [dbCount, setDbCount] = useState<number>(1);
  const [eventsCount, setEventsCount] = useState<number>(1);

  const calculateCosts = () => {
    let cloudCost = 0;
    if (selectedCostConfig === 'startup') {
      cloudCost = 155;
    } else if (selectedCostConfig === 'scale') {
      cloudCost = 480;
    } else {
      cloudCost = (appsCount * 25) + (dbCount * 45) + (eventsCount * 30) + 15;
    }
    const vpsCost = 12;
    const savings = Math.max(0, cloudCost - vpsCost);
    return { cloudCost, vpsCost, savings };
  };

  const { cloudCost, vpsCost, savings } = calculateCosts();

  return (
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
          {(['startup', 'scale', 'custom'] as CostConfig[]).map((config) => (
            <button
              key={config}
              onClick={() => setSelectedCostConfig(config)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                selectedCostConfig === config ? 'bg-red-650 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {config === 'startup' ? 'Startup Node' : config === 'scale' ? 'Scale Swarm' : 'Custom Tuned'}
            </button>
          ))}
        </div>
        {selectedCostConfig === 'custom' && (
          <div className="space-y-4 pt-2 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1 text-slate-400">
                <span>Active Containers</span>
                <span className="text-white font-bold">{appsCount} deamons</span>
              </div>
              <input type="range" min={1} max={20} value={appsCount} onChange={(e) => setAppsCount(Number(e.target.value))} className="w-full accent-red-500" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-slate-400">
                <span>Databases</span>
                <span className="text-white font-bold">{dbCount} instances</span>
              </div>
              <input type="range" min={1} max={5} value={dbCount} onChange={(e) => setDbCount(Number(e.target.value))} className="w-full accent-red-500" />
            </div>
            <div>
              <div className="flex justify-between mb-1 text-slate-400">
                <span>Events/Month</span>
                <span className="text-white font-bold">{eventsCount}M triggers</span>
              </div>
              <input type="range" min={1} max={10} value={eventsCount} onChange={(e) => setEventsCount(Number(e.target.value))} className="w-full accent-red-500" />
            </div>
          </div>
        )}
      </div>
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
  );
}
