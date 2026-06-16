import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
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
];

export default function LandingFAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto border-t border-slate-900 pt-16">
      <h2 className="text-center text-xs font-bold font-mono tracking-wider text-slate-500 uppercase mb-12">
        FREQUENTLY ASKED INQUIRIES
      </h2>
      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openFaq === index;
          return (
            <div key={index} className="rounded-xl border border-slate-900 bg-[#0d1015]/60 hover:border-slate-850 transition overflow-hidden">
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
  );
}
