import React from 'react';
import { ShieldCheck, Lock, PhoneCall, ExternalLink } from 'lucide-react';

export default function Footer({ onOpenEmergency }) {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-auto pb-16 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-700 flex items-center justify-center text-white font-bold">
                M
              </div>
              <span className="font-display font-bold text-white text-base">MediLocker</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Sovereign Digital Health Vault compliant with National Health Authority (NHA) & ABDM DigiLocker protocols.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>AES-256 Sovereign Encryption</span>
            </div>
          </div>

          {/* Quick Helplines */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Emergency Helplines</h4>
            <ul className="space-y-1.5 text-slate-300">
              <li className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700">
                <span>National Emergency</span>
                <a href="tel:112" className="text-red-400 font-bold hover:underline">112</a>
              </li>
              <li className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700">
                <span>Medical Ambulance</span>
                <a href="tel:108" className="text-amber-400 font-bold hover:underline">108</a>
              </li>
              <li className="flex items-center justify-between bg-slate-800/80 px-2.5 py-1.5 rounded border border-slate-700">
                <span>Health Information</span>
                <a href="tel:104" className="text-sky-400 font-bold hover:underline">104</a>
              </li>
            </ul>
          </div>

          {/* Standards & Badges */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Standards & Trust</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ABDM Milestone 1 & 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>FHIR R4 Diagnostic Schema</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>DPDP Act 2023 Consent Framework</span>
              </div>
            </div>
          </div>

          {/* Emergency Access Action */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold uppercase tracking-wider text-[11px]">Bypass SOS Access</h4>
            <p className="text-slate-400 text-xs">
              First responders can access blood group and emergency contact without requiring an MPIN.
            </p>
            <button
              onClick={onOpenEmergency}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              <PhoneCall className="w-4 h-4 text-red-400" />
              <span>Launch Emergency Card</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <div>© {new Date().getFullYear()} MediLocker. All sovereign rights reserved to patient.</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">ABDM Consent Whitepaper</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
