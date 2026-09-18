import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();

  const name = user?.patientProfile?.fullName || user?.name || user?.email?.split('@')[0] || 'Patient';
  const initials = (name.split(' ').map((n) => n[0]).join('') || 'P').slice(0, 2).toUpperCase();
  const unitId = user?.medilockerId || 'ML-VAULT';

  return (
    <aside className="sidebar">
      <div className="patient-mini">
        <div className="avatar">{initials}</div>
        <strong>{name}</strong>
        <small style={{ color: 'var(--plum)', fontWeight: 700, fontSize: '12px' }}>{unitId}</small>
        <small>Patient Sovereign Space</small>
      </div>

      <nav className="side-nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          ⌂ <span>Dashboard</span>
        </NavLink>
        <NavLink to="/timeline" className={({ isActive }) => (isActive ? 'active' : '')}>
          ⏳ <span>Health Timeline</span>
        </NavLink>
        <NavLink to="/records" className={({ isActive }) => (isActive ? 'active' : '')}>
          ▤ <span>Medical Records</span>
        </NavLink>
        <NavLink to="/medications" className={({ isActive }) => (isActive ? 'active' : '')}>
          ✓ <span>Medication To-Do</span>
        </NavLink>
        <NavLink to="/inventory" className={({ isActive }) => (isActive ? 'active' : '')}>
          ⊞ <span>Medicine Cabinet</span>
        </NavLink>
        <NavLink to="/companion" className={({ isActive }) => (isActive ? 'active' : '')}>
          ✦ <span>Medi-AI Companion</span>
        </NavLink>
        <NavLink to="/kiosk" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#0284c7' }}>
          🏥 <span>OPD Touch Kiosk</span>
        </NavLink>
        <NavLink to="/vaidya" className={({ isActive }) => (isActive ? 'active' : '')} style={{ color: '#b45309' }}>
          🩺 <span>Vaidya 30s Chart</span>
        </NavLink>
        <NavLink to="/delegation" className={({ isActive }) => (isActive ? 'active' : '')}>
          🛡 <span>Consent & Access</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
          ◉ <span>My Profile</span>
        </NavLink>
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
          ↪ <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
