import React, { useState, useRef, useEffect } from 'react';
import {
  InstallerStepHardware,
  InstallerStepNetwork,
  InstallerStepConfig,
  InstallerStepLogs,
  InstallerStepIndicators
} from '../components';

interface InstallerPageProps {
  onNavigate: (route: string) => void;
}

export default function InstallerPage({ onNavigate }: InstallerPageProps) {
  const [step, setStep] = useState<number>(1);
  const [hostname, setHostname] = useState<string>('fidscript.mycompany.dev');
  const [adminEmail, setAdminEmail] = useState<string>('admin@fidscript.local');
  const [adminPassword, setAdminPassword] = useState<string>('master-password-red');
  const [logs, setLogs] = useState<string[]>([]);
  const [installing, setInstalling] = useState<boolean>(false);

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
      `[BOOTSTRAP] Requesting automated security keys from Let's Encrypt for root domain...`,
      '[BOOTSTRAP] Pulling shared service container templates standard library...',
      '[DOCKER-COMPOSE] Pulling postgresql:16 image database nodes... [OK]',
      '[DOCKER-COMPOSE] Pulling redis:7.2-alpine caching pools... [OK]',
      '[DOCKER-COMPOSE] Pulling stalwart-mailserver:v0.10 transactional SMTP server... [OK]',
      '[DOCKER-COMPOSE] Pulling nats:latest high speed event broker... [OK]',
      '[DOCKER-COMPOSE] Launching infrastructure stack bridge network...',
      `[DATABASE] Registering host administrator account credentials for: ${adminEmail}`,
      '[SYSTEMD] Mounting cluster logging agents with Loki standard streams...',
      `[SUCCESS] FIDScript Deploy successfully mounted. Control plane active at https://${hostname}`
    ];
    steps.forEach((line, index) => {
      setTimeout(() => {
        setLogs(prev => [...prev, line]);
        if (index === steps.length - 1) setInstalling(false);
      }, (index + 1) * 350);
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Self-Hosted VPS Setup Wizard
        </h2>
        <p className="text-slate-400 text-sm">
          A few steps to initialize and setup PostgreSQL, Redis, Stalwart Mail, NATS, and Traefik onto your server cluster.
        </p>
      </div>
      <InstallerStepIndicators currentStep={step} />
      <div className="bg-[#0f1217] border border-slate-800 p-8 rounded-2xl shadow-xl relative">
        {step === 1 && <InstallerStepHardware onNext={() => setStep(2)} />}
        {step === 2 && (
          <InstallerStepNetwork
            hostname={hostname} setHostname={setHostname}
            adminEmail={adminEmail} setAdminEmail={setAdminEmail}
            adminPassword={adminPassword} setAdminPassword={setAdminPassword}
            onBack={() => setStep(1)} onNext={() => setStep(3)}
          />
        )}
        {step === 3 && <InstallerStepConfig onBack={() => setStep(2)} onRun={runSystemSetup} />}
        {step === 4 && (
          <InstallerStepLogs
            logs={logs} installing={installing}
            onReset={() => { setLogs([]); setStep(1); onNavigate('#/'); }}
            onLaunch={() => onNavigate('#/login')}
          />
        )}
      </div>
    </div>
  );
}
