import React, { useState } from 'react';
import { Copy, Check, Download, QrCode, Shield, Heart } from 'lucide-react';

export default function AbhaCard({ user, onShowToast }) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (!user?.medilockerId) {
      onShowToast?.({ type: 'error', message: 'No MediLocker ID found.' });
      return;
    }
    navigator.clipboard.writeText(user.medilockerId);
    setCopied(true);
    onShowToast?.({ type: 'success', message: 'MediLocker ID copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden relative">
      {/* Top Gov Tricolor Bar */}
      <div className="h-2 w-full flex">
        <div className="flex-1 bg-[#FF9933]"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-[#138808]"></div>
      </div>

      {/* Card Header */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-amber-400">
            M
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-slate-300 uppercase">National Health Authority</div>
            <div className="font-display font-black text-sm tracking-wide text-white">Ayushman Bharat Health Account (ABHA)</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/30">
          <Shield className="w-3 h-3" />
          <span>Active Sovereign</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          {/* Avatar & Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-display font-black text-2xl shadow-md border-2 border-white ring-4 ring-sky-50">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AS'}
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-black text-xl text-slate-900 leading-snug">{user?.name || 'Ananya Sharma'}</h3>
              <div className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-2">
                <span>DOB: {user?.dob || '1996-08-14'}</span>
                <span>•</span>
                <span>Gender: {user?.gender || 'Female'}</span>
                <span>•</span>
                <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  {user?.bloodGroup || 'O+'}
                </span>
              </div>
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ABHA Number</div>
                <div className="font-mono text-sm font-bold text-slate-800 tracking-wider">{user?.abhaNumber || 'Verified Sovereign Vault'}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">9-Digit MediLocker Unit ID</div>
                <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 mt-0.5">
                  <span className="font-mono font-bold text-sky-800 text-sm">{user?.medilockerId || 'Not Assigned'}</span>
                  <button
                    onClick={handleCopyId}
                    className="text-slate-500 hover:text-sky-600 transition"
                    title="Copy Unit ID"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            {/* SVG Simulated QR code */}
            <div className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-300 shadow-inner flex items-center justify-center relative">
              <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800 fill-current">
                {/* QR Markers */}
                <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="11" y="11" width="13" height="13" />
                <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="76" y="11" width="13" height="13" />
                <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="4" />
                <rect x="11" y="76" width="13" height="13" />
                {/* Patterns */}
                <rect x="35" y="10" width="8" height="8" />
                <rect x="48" y="15" width="6" height="6" />
                <rect x="58" y="8" width="6" height="6" />
                <rect x="35" y="35" width="12" height="12" />
                <rect x="55" y="35" width="8" height="8" />
                <rect x="70" y="45" width="10" height="10" />
                <rect x="15" y="45" width="8" height="8" />
                <rect x="35" y="65" width="10" height="10" />
                <rect x="50" y="60" width="15" height="15" />
                <rect x="70" y="75" width="10" height="10" />
                <rect x="85" y="65" width="8" height="8" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1.5 flex items-center gap-1">
              <QrCode className="w-3 h-3 text-sky-600" />
              Scan for Consent
            </span>
          </div>
        </div>

        {/* Card Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Emergency Contact: <strong className="text-slate-700">{user?.emergencyContact?.name || 'Rajesh Sharma'} ({user?.emergencyContact?.phone || '+91 98765 11223'})</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyId}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy ID'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
