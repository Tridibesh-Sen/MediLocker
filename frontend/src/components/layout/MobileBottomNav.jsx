import React from 'react';
import { LayoutDashboard, FileText, PlusCircle, Pill, User } from 'lucide-react';
import { translations } from '../../services/i18n';

export default function MobileBottomNav({ currentView, setCurrentView, user, lang }) {
  if (!user || user.role !== 'patient') return null;

  const t = translations[lang] || translations.en;

  const tabs = [
    { id: 'dashboard', label: t.home, icon: LayoutDashboard },
    { id: 'records', label: t.records, icon: FileText },
    { id: 'upload', label: t.upload, icon: PlusCircle, isAction: true },
    { id: 'medications', label: t.medications, icon: Pill },
    { id: 'profile', label: t.profile, icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;

          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                  isActive ? 'bg-sky-700 text-white' : 'bg-sky-600 text-white'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-sky-700 mt-0.5">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition ${
                isActive ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
