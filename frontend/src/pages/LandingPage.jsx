import React from 'react';
import { ShieldCheck, Lock, Bot, FileText, PhoneCall, ArrowRight, Activity, CheckCircle, Smartphone } from 'lucide-react';
import { translations } from '../services/i18n';

export default function LandingPage({ setCurrentView, lang, onOpenEmergency }) {
  const t = translations[lang] || translations.en;

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-slate-50 border-b border-slate-200 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ABDM Milestone 1 & 2 Approved Sovereign Vault</span>
              </div>

              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.1]">
                Your Health Records. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-700 via-sky-600 to-indigo-700">
                  100% Sovereign & AI-Assisted.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                MediLocker is India’s sovereign digital health locker. Securely store prescriptions, lab reports, and vaccination records linked with your 14-digit ABHA ID, powered by localized Medi-AI clinical companion.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => setCurrentView('signup')}
                  className="w-full sm:w-auto px-8 py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => setCurrentView('login')}
                  className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl border border-slate-300 shadow-sm transition"
                >
                  <span>Sign In</span>
                </button>
                <button
                  onClick={onOpenEmergency}
                  className="w-full sm:w-auto px-6 py-3.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 transition flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4 text-red-600" />
                  <span>Emergency 112/108</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Zero Data Monetization</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Passkey & MPIN Sovereign Auth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Offline Triage Fallback</span>
                </div>
              </div>
            </div>

            {/* Right Card / ABHA Preview */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 relative z-10 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">M</div>
                    <span className="font-display font-bold text-slate-900">Ayushman Bharat ID</span>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Active</span>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-700 text-white font-bold text-lg flex items-center justify-center">
                      AS
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Ananya Sharma</div>
                      <div className="text-xs text-slate-500 font-mono">ML-842-194-672</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Blood</div>
                      <div className="font-bold text-rose-600">O+</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Records</div>
                      <div className="font-bold text-slate-800">14 Vaulted</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Pills Today</div>
                      <div className="font-bold text-emerald-600">2 / 3 Taken</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-sky-900 to-indigo-950 p-4 rounded-2xl text-white flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-sky-300">Medi-AI Companion</div>
                    <div className="text-xs font-medium">Ready to explain prescriptions</div>
                  </div>
                  <Bot className="w-6 h-6 text-amber-300 animate-bounce" />
                </div>
              </div>

              {/* Decorative background blur */}
              <div className="absolute -inset-4 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-3xl blur-2xl opacity-20 -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <h2 className="font-display font-black text-3xl text-slate-900">Engineered for Sovereign Patient Dignity</h2>
          <p className="text-slate-600 text-sm sm:text-base">
            MediLocker replaces disorganized paper files and predatory healthcare apps with cryptographically verifiable citizen ownership.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900">Sovereign Encryption Vault</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Records are encrypted client-side using sovereign keys. Neither hospitals nor third parties can view your records without explicit 15-minute time-bound consent.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900">Medi-AI Clinical Intelligence</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Powered by Mistral AI, Medi-AI extracts dosage schedules, checks drug-drug contraindications, and translates clinical jargon into easy plain language.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-900">Daily Routine & Pill Inventory</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Automatic midnight renewal To-Do checklist with pill countdown tracking, blister foil scanning, and timely low-stock refill reminders.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
