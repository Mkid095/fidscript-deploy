import React, { useEffect, useRef } from 'react';
import { Terminal, RefreshCw, CheckCircle, ChevronRight } from 'lucide-react';

interface InstallerStepLogsProps {
  logs: string[];
  installing: boolean;
  onReset: () => void;
  onLaunch: () => void;
}

export default function InstallerStepLogs({ logs, installing, onReset, onLaunch }: InstallerStepLogsProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
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
            <div key={index} className={`mb-1 transition-opacity ${isSuccess ? 'text-emerald-400 font-bold' : isCheck ? 'text-cyan-400' : 'text-slate-300'}`}>
              {log}
            </div>
          );
        })}
        <div ref={logsEndRef} />
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-white px-3 py-2 transition"
          disabled={installing}
        >
          Reset Setup
        </button>
        <button
          onClick={onLaunch}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 text-xs"
          disabled={installing}
        >
          <span>Launch Cloud OS Portal</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
