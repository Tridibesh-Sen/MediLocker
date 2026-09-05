import React from 'react';
import { PhoneCall, Globe } from 'lucide-react';
import { translations } from '../../services/i18n';

export default function GovTopbar({ lang, setLang, fontScale, setFontScale, onOpenEmergency }) {
  const t = translations[lang] || translations.en;

  return (
    <div className="bg-slate-900 text-slate-100 text-xs border-b border-slate-800 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Indian flag & Government of India */}
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-3.5 rounded-sm shadow-sm overflow-hidden flex flex-col border border-white/20">
            <div className="flex-1 bg-[#FF9933]"></div>
            <div className="flex-1 bg-white relative flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full border border-blue-900"></div>
            </div>
            <div className="flex-1 bg-[#138808]"></div>
          </div>
          <div>
            <span className="font-semibold text-white tracking-wide">{t.govTitle}</span>
            <span className="hidden sm:inline text-slate-400 ml-2">| {t.govSub}</span>
          </div>
        </div>

        {/* Right: Emergency SOS, Accessibility & Language Selector */}
        <div className="flex items-center gap-3">
          {/* Emergency SOS Badge */}
          <button
            onClick={onOpenEmergency}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-bold transition animate-pulse"
            title="Emergency SOS 112 / 108"
          >
            <PhoneCall className="w-3 h-3" />
            <span>SOS 112/108</span>
          </button>

          {/* Font resize accessibility */}
          <div className="hidden md:flex items-center bg-slate-800 rounded px-1 py-0.5 border border-slate-700">
            <button
              onClick={() => setFontScale(0.9)}
              className={`px-1.5 py-0.5 rounded ${fontScale === 0.9 ? 'bg-slate-700 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              title="Decrease font size"
            >
              A-
            </button>
            <button
              onClick={() => setFontScale(1)}
              className={`px-1.5 py-0.5 rounded ${fontScale === 1 ? 'bg-slate-700 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              title="Normal font size"
            >
              A
            </button>
            <button
              onClick={() => setFontScale(1.1)}
              className={`px-1.5 py-0.5 rounded ${fontScale === 1.1 ? 'bg-slate-700 text-white font-bold' : 'text-slate-300 hover:text-white'}`}
              title="Increase font size"
            >
              A+
            </button>
          </div>

          {/* Language selector */}
          <div className="flex items-center gap-1 bg-slate-800 rounded px-2 py-0.5 border border-slate-700">
            <Globe className="w-3 h-3 text-slate-400" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              aria-label="Select Language"
              className="bg-transparent text-slate-200 text-xs border-none outline-none cursor-pointer focus:ring-0"
            >
              <option value="en" className="bg-slate-900 text-white">English</option>
              <option value="hi" className="bg-slate-900 text-white">हिन्दी (Hindi)</option>
              <option value="bn" className="bg-slate-900 text-white">বাংলা (Bengali)</option>
              <option value="ta" className="bg-slate-900 text-white">தமிழ் (Tamil)</option>
              <option value="te" className="bg-slate-900 text-white">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
