import React from 'react';
import { ArrowRight } from 'lucide-react';

const steps = [
  { step: '01', title: 'Provision Host VPS', desc: 'Secure any clean Debian or Ubuntu virtual machine from Hetzner, AWS, or DigitalOcean.' },
  { step: '02', title: 'Run Setup Command', desc: 'Execute the automated curl installer script over SSH to configure the docker runtime framework.' },
  { step: '03', title: 'Map TLS Domains', desc: "Traefik manages Let's Encrypt SSL protocols automatically when pointing domains inside." },
  { step: '04', title: 'Operate Securely', desc: 'Compile microservices, run SQL scripts, send transactional SMTP mail, and deploy instantly.' }
];

export default function LandingSteps() {
  return (
    <div className="border-t border-slate-900 pt-16 mb-24">
      <h2 className="text-center text-xs font-bold font-mono tracking-wider text-slate-500 uppercase mb-12">
        FIVE-MINUTE CLUSTER SETUP ROUTINE
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {steps.map((item, idx) => (
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
  );
}
