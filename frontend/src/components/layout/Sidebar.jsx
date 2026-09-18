import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const name = user?.patientProfile?.fullName || user?.name || user?.email?.split('@')[0] || 'Patient';
  const unitId = user?.medilockerId || user?.patientProfile?.id || user?.id || 'ML-SECURE';
  const initials = (name.split(' ').map((n) => n[0]).join('') || 'P').slice(0, 2).toUpperCase();
  const role = user?.role || 'PATIENT';
  const roleTitle = role === 'DOCTOR' ? t('doctorSuiteTitle', 'Doctor / Clinical Suite') : role === 'HOSPITAL' ? t('hospitalPortalTitle', 'Hospital & Emergency Portal') : t('patientSpaceTitle', 'Patient Sovereign Space');
  const roleBadgeColor = role === 'DOCTOR' ? '#b45309' : role === 'HOSPITAL' ? '#0284c7' : 'var(--plum)';

  return (
    <aside className="sidebar">
      <div className="patient-mini">
        <div className="avatar" style={{ background: roleBadgeColor }}>{initials}</div>
        <strong>{name}</strong>
        <small style={{ color: roleBadgeColor, fontWeight: 800, fontSize: '12px' }}>{unitId}</small>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: roleBadgeColor, background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', display: 'inline-block' }}>
          {roleTitle}
        </span>
      </div>

      <nav className="side-nav">
        {/* Patient Core Locker */}
        <div style={{ padding: '8px 12px 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          {t('patientVaultHeader', 'Patient Health Vault')}
        </div>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          ⌂ <span>{t('dashboard', 'Dashboard')}</span>
        </NavLink>
        <NavLink to="/timeline" className={({ isActive }) => (isActive ? 'active' : '')}>
          ⏳ <span>{t('timelinePage', 'Health Timeline')}</span>
        </NavLink>
        <NavLink to="/records" className={({ isActive }) => (isActive ? 'active' : '')}>
          ▤ <span>{t('recordsPage', 'Medical Records')}</span>
        </NavLink>
        <NavLink to="/medications" className={({ isActive }) => (isActive ? 'active' : '')}>
          ✓ <span>{t('todoPage', 'Medication To-Do')}</span>
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => (isActive ? 'active' : '')}>
          ⊞ <span>{t('inventoryPage', 'Medicine Cabinet')}</span>
        </NavLink>
        <NavLink to="/companion" className={({ isActive }) => (isActive ? 'active' : '')}>
          ✦ <span>{t('aiCompanionPage', 'Medi-AI Companion')}</span>
        </NavLink>
        <NavLink to="/kiosk" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#0284c7' }}>
          🏥 <span>{t('kioskPage', 'OPD Touch Kiosk')}</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          ◉ <span>{t('profilePage', 'My Profile & QR')}</span>
        </NavLink>

        {/* Doctor & Clinical Section - Doctors & Admins only */}
        {(role === 'DOCTOR' || role === 'ADMIN') && (
          <>
            <div style={{ padding: '16px 12px 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: '#b45309', textTransform: 'uppercase' }}>
              {t('doctorSuiteHeader', 'Doctor Clinical Suite')}
            </div>
            <NavLink to="/vaidya" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#b45309' }}>
              🩺 <span>{t('vaidyaPage', 'Vaidya 30s Chart')}</span>
            </NavLink>
            <NavLink to="/scanner" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#b91c1c' }}>
              🚨 <span>{t('scannerPage', 'Emergency QR Scanner')}</span>
            </NavLink>
            <NavLink to="/delegation" className={({ isActive }) => (isActive ? 'active' : '')}>
              🛡 <span>{t('delegationPage', 'Consent & Access')}</span>
            </NavLink>
          </>
        )}

        {/* Hospital & Emergency Section - Hospitals & Admins only */}
        {(role === 'HOSPITAL' || role === 'ADMIN') && (
          <>
            <div style={{ padding: '16px 12px 4px', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: '#0284c7', textTransform: 'uppercase' }}>
              {t('hospitalHeader', 'Hospital & Emergency')}
            </div>
            <NavLink to="/hospital-doctors" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#0284c7' }}>
              👨‍⚕️ <span>{t('hospitalDoctorsPage', 'Hospital Doctors & Staff')}</span>
            </NavLink>
            <NavLink to="/kiosk" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#0284c7' }}>
              🏥 <span>{t('kioskPage', 'OPD Touch Kiosk')}</span>
            </NavLink>
            <NavLink to="/scanner" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#b91c1c' }}>
              🚨 <span>{t('scannerPage', 'Emergency QR Scanner')}</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="side-bottom">
        <button
          onClick={logout}
          type="button"
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            gap: '13px',
            alignItems: 'center',
            padding: '13px 14px',
            borderRadius: '13px',
            color: 'var(--muted)',
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left'
          }}
        >
          ↪ <span>{t('signOut', 'Sign out')}</span>
        </button>
      </div>
    </aside>
  );
}
