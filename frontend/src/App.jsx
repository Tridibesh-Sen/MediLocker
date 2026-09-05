import React, { useState, useEffect } from 'react';
import GovTopbar from './components/layout/GovTopbar';
import Navbar from './components/layout/Navbar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import Footer from './components/layout/Footer';
import Toast from './components/common/Toast';
import Modal from './components/common/Modal';
import AICompanionDrawer from './components/ai/AICompanionDrawer';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import RecordsPage from './pages/RecordsPage';
import UploadPage from './pages/UploadPage';
import MedicationsPage from './pages/MedicationsPage';
import ProfilePage from './pages/ProfilePage';
import DoctorPortalPage from './pages/DoctorPortalPage';
import HospitalPortalPage from './pages/HospitalPortalPage';

import { api } from './services/api';
import { PhoneCall, Heart, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(api.getCurrentUser());
  const [currentView, setCurrentView] = useState(() => (api.isAuthenticated() ? 'dashboard' : 'landing'));
  const [lang, setLang] = useState('en');
  const [fontScale, setFontScale] = useState(1);
  const [toast, setToast] = useState(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  useEffect(() => {
    // If not authenticated, ensure landing view
    if (!api.isAuthenticated() && !user) {
      setCurrentView('landing');
    }
  }, [user]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.role === 'doctor') {
      setCurrentView('doctor');
    } else if (loggedInUser.role === 'hospital') {
      setCurrentView('hospital');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    api.clearSession();
    setUser(null);
    setCurrentView('login');
    setToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Your sovereign session has been safely closed.'
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-all"
      style={{ fontSize: `${fontScale}rem` }}
    >
      {/* 1. Official Government Topbar */}
      <GovTopbar
        lang={lang}
        setLang={setLang}
        fontScale={fontScale}
        setFontScale={setFontScale}
        onOpenEmergency={() => setEmergencyModalOpen(true)}
      />

      {/* 2. Main Navigation Header */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        onLogout={handleLogout}
        lang={lang}
      />

      {/* 3. Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'landing' && (
          <LandingPage
            setCurrentView={setCurrentView}
            lang={lang}
            onOpenEmergency={() => setEmergencyModalOpen(true)}
          />
        )}
        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            setCurrentView={setCurrentView}
            onShowToast={setToast}
          />
        )}
        {currentView === 'signup' && (
          <SignupPage
            onSignupSuccess={handleLoginSuccess}
            setCurrentView={setCurrentView}
            onShowToast={setToast}
          />
        )}
        {currentView === 'dashboard' && (
          <DashboardPage
            user={user}
            setCurrentView={setCurrentView}
            onShowToast={setToast}
            onOpenEmergency={() => setEmergencyModalOpen(true)}
          />
        )}
        {currentView === 'records' && (
          <RecordsPage
            setCurrentView={setCurrentView}
            onShowToast={setToast}
          />
        )}
        {currentView === 'upload' && (
          <UploadPage
            setCurrentView={setCurrentView}
            onShowToast={setToast}
          />
        )}
        {currentView === 'medications' && (
          <MedicationsPage
            onShowToast={setToast}
          />
        )}
        {currentView === 'profile' && (
          <ProfilePage
            user={user}
            onShowToast={setToast}
          />
        )}
        {currentView === 'doctor' && (
          <DoctorPortalPage
            onShowToast={setToast}
          />
        )}
        {currentView === 'hospital' && (
          <HospitalPortalPage
            onShowToast={setToast}
          />
        )}
      </main>

      {/* 4. Medi-AI Floating Clinical Assistant */}
      <AICompanionDrawer user={user} onShowToast={setToast} />

      {/* 5. Sticky Mobile Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        lang={lang}
      />

      {/* 6. Footer */}
      <Footer onOpenEmergency={() => setEmergencyModalOpen(true)} />

      {/* 7. Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* 8. Emergency SOS 112/108 Modal */}
      <Modal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title="EMERGENCY SOS & FIRST RESPONDER BYPASS"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-rose-900 text-sm">Lock Screen Triage Card</div>
              <p className="text-rose-700 text-[11px]">
                Accessible without authentication for paramedics, doctors, and emergency first responders.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px]">Patient Name</span>
              <strong className="text-slate-900 text-sm">{user?.name || 'Ananya Sharma'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px]">Blood Group</span>
              <strong className="text-rose-600 text-base font-black">{user?.bloodGroup || 'O+'}</strong>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px]">Critical Drug Allergies</span>
              <strong className="text-slate-800 text-xs font-bold text-rose-700">
                {user?.allergies?.join(', ') || 'Penicillin, Sulfa drugs'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block uppercase font-bold text-[10px]">Emergency Kin Phone</span>
              <strong className="text-slate-900 text-xs font-mono">
                {user?.emergencyContact?.phone || '+91 98765 11223'}
              </strong>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="tel:112"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition text-sm"
            >
              <PhoneCall className="w-5 h-5 animate-pulse" />
              <span>Call National Emergency Services (112)</span>
            </a>
            <a
              href="tel:108"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition text-xs"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Medical Ambulance (108)</span>
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
}
