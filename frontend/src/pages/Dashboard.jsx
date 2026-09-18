import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function Dashboard() {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [recordsCount, setRecordsCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [refillAlerts, setRefillAlerts] = useState([]);
  const [feelingToday, setFeelingToday] = useState(null);
  const [feelingSaved, setFeelingSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const name = user?.patientProfile?.fullName || user?.name || user?.email?.split('@')[0] || 'User';
  const unitId = user?.medilockerId || 'ML-XXXX-XXXX';

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [todosRes, recordsRes, invRes, refillsRes, feelingsRes] = await Promise.allSettled([
          api.getTodos(),
          api.listRecords(),
          api.getInventory(),
          api.checkRefills(),
          api.getFeelings(1),
        ]);

        if (todosRes.status === 'fulfilled' && Array.isArray(todosRes.value?.data)) {
          setTodos(todosRes.value.data);
        }
        if (recordsRes.status === 'fulfilled' && Array.isArray(recordsRes.value?.data)) {
          setRecordsCount(recordsRes.value.data.length);
        }
        if (invRes.status === 'fulfilled' && Array.isArray(invRes.value?.data)) {
          setInventoryCount(invRes.value.data.length);
        }
        if (refillsRes.status === 'fulfilled' && Array.isArray(refillsRes.value?.data)) {
          setRefillAlerts(refillsRes.value.data);
        }
        if (feelingsRes.status === 'fulfilled' && Array.isArray(feelingsRes.value?.data) && feelingsRes.value.data.length > 0) {
          setFeelingToday(feelingsRes.value.data[0]?.feelingScore);
        }
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleFeelingCheckin = async (score) => {
    setFeelingToday(score);
    setFeelingSaved(true);
    try {
      await api.logFeeling(score, 'Daily dashboard feeling check-in');
    } catch (err) {
      console.error('Feeling log error:', err);
    }
    setTimeout(() => setFeelingSaved(false), 3000);
  };

  const completedTodos = todos.filter((t) => t.isCompleted).length;
  const totalTodos = todos.length;
  const adherencePercent = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 100;

  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">PATIENT DASHBOARD</span>
          <h1>Welcome back, {name}.</h1>
          <p>Your personal health information is organized here. Access your timeline, prescriptions, household cabinet, and clinical AI companion.</p>
        </div>
        <Link className="primary-btn" to="/records">
          Upload a record ↗
        </Link>
      </div>

      {/* 2-Day Refill Banner if any item is low */}
      {refillAlerts.length > 0 && (
        <div
          style={{
            background: '#fff7ed',
            border: '1px solid #f97316',
            borderRadius: '20px',
            padding: '18px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <strong style={{ color: '#9a3412', fontSize: '16px' }}>
                Refill Warning: {refillAlerts.length} medicine(s) running out in &lt; 48 hours!
              </strong>
              <p style={{ margin: '2px 0 0', color: '#c2410c', fontSize: '13px' }}>
                {refillAlerts.map((r) => `${r.medicineName} (${r.pillsRemaining} remaining)`).join(', ')}
              </p>
            </div>
          </div>
          <Link
            to="/inventory"
            className="secondary-btn"
            style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap', borderColor: '#f97316', color: '#c2410c' }}
          >
            Review Cabinet →
          </Link>
        </div>
      )}

      {/* Feeling Check-in Box */}
      <div className="feeling-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow" style={{ color: 'var(--plum)' }}>
            DAILY BIOMETRIC CHECK-IN
          </span>
          {feelingSaved && (
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
              ✓ Saved to live database
            </span>
          )}
        </div>
        <h3 style={{ margin: '6px 0 2px', fontFamily: 'Manrope', fontSize: '20px' }}>
          How are you feeling today?
        </h3>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>
          Logging your daily symptoms helps your attending doctor spot subtle recovery trends.
        </p>

        <div className="feeling-btns">
          <button
            type="button"
            className={`feeling-btn ${feelingToday === 1 ? 'active green' : ''}`}
            onClick={() => handleFeelingCheckin(1)}
          >
            <span>🟢</span>
            <span>Feeling Well / Normal</span>
          </button>
          <button
            type="button"
            className={`feeling-btn ${feelingToday === 2 ? 'active orange' : ''}`}
            onClick={() => handleFeelingCheckin(2)}
          >
            <span>🟠</span>
            <span>Mild Discomfort / Fatigue</span>
          </button>
          <button
            type="button"
            className={`feeling-btn ${feelingToday === 3 ? 'active red' : ''}`}
            onClick={() => handleFeelingCheckin(3)}
          >
            <span>🔴</span>
            <span>Unwell / Severe Symptoms</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="dashboard-grid">
        <section className="summary-card accent">
          <span>YOUR MEDILOCKER UNIT ID</span>
          <strong>{unitId}</strong>
          <small>Share this Sovereign ID with authorized physicians for time-bound consultations.</small>
        </section>

        <section className="summary-card">
          <span>TODAY'S ADHERENCE</span>
          <strong>{totalTodos > 0 ? `${adherencePercent}%` : '100%'}</strong>
          <div className="progress-bar">
            <i style={{ width: `${adherencePercent}%` }}></i>
          </div>
          <small>{completedTodos} of {totalTodos} dosage routines logged.</small>
        </section>

        <section className="summary-card">
          <span>VERIFIED RECORDS</span>
          <strong>{recordsCount} Stored</strong>
          <small>Prescriptions, laboratory tests, and clinical timelines in live vault.</small>
        </section>

        <section className="summary-card">
          <span>MEDICINE CABINET</span>
          <strong>{inventoryCount} Supplies</strong>
          <small>Tracked household medicine supplies and expiry dates.</small>
        </section>
      </div>

      <div className="section-row">
        <div>
          <span className="eyebrow">QUICK ACCESS</span>
          <h2>Your health workspace.</h2>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="quick-grid">
        <Link to="/timeline" className="quick-card">
          <span style={{ background: 'var(--lav)' }}>⏳</span>
          <div>
            <strong>Health Timeline</strong>
            <small>Chronological consultation events & symptoms.</small>
          </div>
          ↗
        </Link>

        <Link to="/records" className="quick-card">
          <span>▤</span>
          <div>
            <strong>Medical Records</strong>
            <small>Prescriptions, reports, and real-time OCR upload.</small>
          </div>
          ↗
        </Link>

        <Link to="/medications" className="quick-card todo">
          <span>✓</span>
          <div>
            <strong>Medication To-Do</strong>
            <small>Daily dosage schedule & 0ms adherence checkboxes.</small>
          </div>
          ↗
        </Link>

        <Link to="/inventory" className="quick-card">
          <span style={{ background: 'var(--peach)' }}>⊞</span>
          <div>
            <strong>Medicine Cabinet</strong>
            <small>Household supplies, barcode scan & refill alerts.</small>
          </div>
          ↗
        </Link>

        <Link to="/companion" className="quick-card">
          <span style={{ background: 'var(--plum)', color: '#fff' }}>✦</span>
          <div>
            <strong>Medi-AI Companion</strong>
            <small>Voice intake, disease prediction & SOCRATES triage.</small>
          </div>
          ↗
        </Link>

        <Link to="/kiosk" className="quick-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <span style={{ background: '#e0f2fe', color: '#0284c7' }}>🏥</span>
          <div>
            <strong>OPD Touch Kiosk</strong>
            <small>Interactive anatomical body-map & regional audio ticket.</small>
          </div>
          ↗
        </Link>

        <Link to="/vaidya" className="quick-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ background: '#fef3c7', color: '#b45309' }}>🩺</span>
          <div>
            <strong>Vaidya 30s Chart</strong>
            <small>30-second OPD synthesis, NAMASTE codes & FHIR export.</small>
          </div>
          ↗
        </Link>

        <Link to="/delegation" className="quick-card">
          <span style={{ background: '#e8dfd8' }}>🛡</span>
          <div>
            <strong>Consent & Access</strong>
            <small>Generate 15-minute 6-digit access codes for clinics.</small>
          </div>
          ↗
        </Link>
      </div>
    </>
  );
}
