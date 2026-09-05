import React, { useState } from 'react';
import { ShieldCheck, User, LogOut, Menu, X, PlusCircle, FileText, Pill, LayoutDashboard, Stethoscope, Building2 } from 'lucide-react';
import { translations } from '../../services/i18n';

export default function Navbar({ currentView, setCurrentView, user, onLogout, lang }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[lang] || translations.en;

  const navLinks = user?.role === 'doctor'
    ? [
        { id: 'doctor', label: t.doctorPortal, icon: Stethoscope },
        { id: 'records', label: t.records, icon: FileText },
      ]
    : user?.role === 'hospital'
    ? [
        { id: 'hospital', label: t.hospitalPortal, icon: Building2 },
        { id: 'records', label: t.records, icon: FileText },
      ]
    : [
        { id: 'dashboard', label: t.home, icon: LayoutDashboard },
        { id: 'records', label: t.records, icon: FileText },
        { id: 'upload', label: t.upload, icon: PlusCircle },
        { id: 'medications', label: t.medications, icon: Pill },
        { id: 'profile', label: t.profile, icon: User },
      ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => setCurrentView(user ? (user.role === 'doctor' ? 'doctor' : user.role === 'hospital' ? 'hospital' : 'dashboard') : 'landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gov-navy to-sky-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1 font-display font-black text-xl tracking-tight text-slate-900 leading-tight">
                <span>Medi</span><span className="text-sky-600">Locker</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded ml-1 border border-amber-300/60">ABDM</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">National Sovereign Health Vault</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          {user ? (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setCurrentView('login')}
                className="text-sm font-semibold text-slate-700 hover:text-sky-700 px-3 py-2 rounded-lg transition"
              >
                {t.login}
              </button>
              <button
                onClick={() => setCurrentView('signup')}
                className="text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg shadow-sm transition hover:shadow"
              >
                {t.signup}
              </button>
            </div>
          )}

          {/* User Profile & Actions */}
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <div
                onClick={() => setCurrentView('profile')}
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-full cursor-pointer transition"
              >
                <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="text-left leading-none pr-1">
                  <div className="text-xs font-bold text-slate-800">{user.name || 'Patient'}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{user.role} · {user.medilockerId || 'ML-ID'}</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {user ? (
            <>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.medilockerId} ({user.role})</div>
                </div>
                <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Verified</span>
              </div>
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                      isActive ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-sky-600" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span>{t.logout}</span>
              </button>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setCurrentView('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                {t.login}
              </button>
              <button
                onClick={() => {
                  setCurrentView('signup');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 font-semibold text-white bg-sky-600 rounded-lg shadow-sm"
              >
                {t.signup}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
