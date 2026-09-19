import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export function Delegation() {
  const [delegations, setDelegations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate code form
  const [doctorName, setDoctorName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchDelegations = async () => {
    try {
      setLoading(true);
      const res = await api.listDelegations();
      if (Array.isArray(res?.data)) {
        setDelegations(res.data);
      }
    } catch (err) {
      console.error('Error fetching delegations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelegations();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.createDelegation({
        doctorName: doctorName.trim() || 'Attending Physician',
        durationMinutes: Number(durationMinutes),
      });
      if (res?.data?.code || res?.data?.accessCode) {
        setGeneratedCode(res.data.code || res.data.accessCode);
        fetchDelegations();
      }
    } catch (err) {
      alert('Failed to generate access code: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke access immediately? The physician will lose access in real time.')) return;
    try {
      await api.revokeDelegation(id);
      fetchDelegations();
    } catch (err) {
      alert('Revocation failed: ' + err.message);
    }
  };

  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">PATIENT DATA SOVEREIGNTY</span>
          <h1>Consent & Access Delegation.</h1>
          <p>Generate single-use 15-minute 6-digit access codes to grant doctors time-bound access. Revoke at any moment with 1 click.</p>
        </div>
      </div>

      <div className="delegation-grid">
        {/* Generate Code Card */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <span className="eyebrow">TEMPORARY ACCESS CODE</span>
          <h2 style={{ fontFamily: 'Manrope', margin: '6px 0 16px' }}>Generate 6-Digit Doctor OTP</h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 20px' }}>
            Provide this code to your doctor. It is cryptographically hashed with Argon2id and expires automatically.
          </p>

          <form onSubmit={handleGenerate}>
            <label style={{ display: 'block', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Doctor or Hospital Name (Optional)
              </span>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. Rajesh Khanna (Cardiology)"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--line)' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '20px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Access Duration
              </span>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--line)' }}
              >
                <option value={30}>30 Minutes (Quick OPD Consult)</option>
                <option value={60}>1 Hour (Standard Consultation)</option>
                <option value={1440}>24 Hours (Day Care / Observation)</option>
                <option value={10080}>7 Days (Extended Hospital Admission)</option>
              </select>
            </label>

            <button className="primary-btn" type="submit" disabled={creating} style={{ width: '100%', padding: '14px' }}>
              {creating ? 'Generating Secure OTP...' : 'Generate 6-Digit Code 🔑'}
            </button>
          </form>

          {generatedCode && (
            <div
              style={{
                marginTop: '22px',
                background: '#f0fdf4',
                border: '2px dashed #22c55e',
                borderRadius: '16px',
                padding: '18px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d', letterSpacing: '1px' }}>
                SINGLE-USE PASSCODE (VALID FOR 15 MINS)
              </span>
              <div style={{ fontSize: '36px', fontWeight: 900, fontFamily: 'Manrope', color: '#166534', margin: '6px 0', letterSpacing: '6px' }}>
                {generatedCode}
              </div>
              <small style={{ color: '#166534' }}>Tell this code to the doctor to decrypt and unlock your timeline.</small>
            </div>
          )}
        </div>

        {/* Security & Cryptography Guarantee */}
        <div
          style={{
            background: 'var(--plum-dark)',
            color: '#fff',
            borderRadius: '24px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span className="eyebrow" style={{ color: '#d5cdda' }}>ZERO PHI LEAK GUARANTEE</span>
            <h2 style={{ fontFamily: 'Manrope', margin: '6px 0 14px' }}>Cryptographic Guardrails</h2>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.8, fontSize: '14px', color: '#e2e8f0' }}>
              <li><strong>Zero PHI Search Exposure:</strong> When a clinic searches your Unit ID, only your Name and DOB are shown.</li>
              <li><strong>Argon2id Hashing:</strong> Access tokens are one-way hashed with enterprise salt.</li>
              <li><strong>Automatic Expiration:</strong> Once time lapses, the authorization token is invalidated across all nodes.</li>
              <li><strong>Audit Logging:</strong> Every document read is recorded in PostgreSQL with timestamp and IP.</li>
            </ul>
          </div>

          <div style={{ marginTop: '20px', background: 'rgba(255, 255, 255, 0.08)', padding: '14px', borderRadius: '14px', fontSize: '13px' }}>
            🔒 Aligned with ABDM Unified Health Interface (UHI) consent protocols.
          </div>
        </div>
      </div>

      {/* Active Delegations Table */}
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--line)',
          borderRadius: '24px',
          padding: '26px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <span className="eyebrow">AUDIT TRAIL</span>
        <h3 style={{ fontFamily: 'Manrope', fontSize: '20px', margin: '6px 0 16px' }}>
          Active & Past Delegations
        </h3>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
            Loading delegation records...
          </div>
        ) : delegations.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            No doctor access authorizations have been generated yet.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {delegations.map((d) => (
              <div
                key={d.id}
                style={{
                  background: '#faf8f5',
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong>{d.doctorName || 'Attending Physician'}</strong>
                  <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>
                    Created: {new Date(d.createdAt).toLocaleString()} · Status: <span style={{ fontWeight: 700, color: d.status === 'ACTIVE' ? '#16a34a' : '#94a3b8' }}>{d.status}</span>
                  </div>
                </div>

                {d.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(d.id)}
                    style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #f87171',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Revoke Now ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
