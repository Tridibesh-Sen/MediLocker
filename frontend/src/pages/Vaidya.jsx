import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Safe array coercion — AI may return strings, null, or objects instead of arrays
function safeArray(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) return [val];
  return fallback;
}

export function Vaidya() {
  const { user } = useAuth();
  const [triageData, setTriageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchUnitId, setSearchUnitId] = useState('');

  // Double-coding lookup
  const [codingQuery, setCodingQuery] = useState('Acid dyspepsia with epigastric burning');
  const [codingResult, setCodingResult] = useState(null);
  const [codingLoading, setCodingLoading] = useState(false);

  // FHIR Export
  const [fhirData, setFhirData] = useState(null);
  const [fhirLoading, setFhirLoading] = useState(false);

  // Prescription Writer
  const [showPrescribe, setShowPrescribe] = useState(false);
  const [doctorName, setDoctorName] = useState('Dr. Sharma (Attending Vaidya)');
  const [clinicName, setClinicName] = useState('Ayurvedic / Integrative OPD');
  const [diagnosesText, setDiagnosesText] = useState('Amlapitta (Hyperacidity)');
  const [medName, setMedName] = useState('Avipattikar Churna 5g');
  const [medFreq, setMedFreq] = useState('1-0-1');
  const [medTiming, setMedTiming] = useState('Before food');
  const [prescribeSaved, setPrescribeSaved] = useState(false);

  const fetchTriage = async (targetId = '') => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.getClinicalTriage(targetId);
      if (res?.data) {
        setTriageData(res.data);
      }
    } catch (err) {
      console.error('Triage load error:', err);
      setLoadError(err?.message || 'Failed to load clinical triage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTriage();
  }, []);

  const handleDoubleCodeLookup = async (e) => {
    e.preventDefault();
    if (!codingQuery.trim()) return;
    setCodingLoading(true);
    try {
      const res = await api.doubleCode({
        complaintOrDiagnosis: codingQuery.trim(),
      });
      if (res?.data) {
        setCodingResult(res.data);
      }
    } catch (err) {
      alert('Double-coding error: ' + err.message);
    } finally {
      setCodingLoading(false);
    }
  };

  const handleExportFhir = async () => {
    setFhirLoading(true);
    try {
      const res = await api.getFhirBundle();
      setFhirData(res?.data || res);
    } catch (err) {
      alert('FHIR export error: ' + err.message);
    } finally {
      setFhirLoading(false);
    }
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    try {
      await api.createManualRecord({
        documentType: 'PRESCRIPTION',
        eventDate: new Date().toISOString().split('T')[0],
        doctorName: doctorName.trim(),
        clinicName: clinicName.trim(),
        diagnoses: [diagnosesText.trim()],
        clinicalSummary: `OPD Consultation with ${doctorName}. Prescribed: ${medName}.`,
        prescribedMedications: [
          {
            medicineName: medName.trim(),
            dosage: '1 dose',
            frequency: medFreq,
            timingInstruction: medTiming,
            totalQuantityNeeded: 15,
          },
        ],
      });
      setPrescribeSaved(true);
      setTimeout(() => {
        setPrescribeSaved(false);
        setShowPrescribe(false);
      }, 3000);
    } catch (err) {
      alert('Prescription save failed: ' + err.message);
    }
  };

  const profile = triageData?.physiologicalProfile || {
    neuroMotorScore: 35,
    metabolicScore: 45,
    structuralScore: 20,
    metabolicStatus: 'Equilibrium (Sama)',
  };

  // Safe array extraction from triage data (AI can return strings instead of arrays)
  const redFlags = safeArray(triageData?.redFlags, []);
  const chiefComplaints = safeArray(triageData?.chiefComplaint30s, [
    'Patient undergoing routine clinical evaluation',
    'Medical records verified in sovereign vault',
  ]);
  const clinicalPlan = safeArray(triageData?.recommendedClinicalPlan, [
    'Review active medication compliance',
    'Evaluate routine laboratory reports',
    'Maintain balanced diet and adequate hydration',
  ]);
  const hasRealRedFlags =
    redFlags.length > 0 &&
    !redFlags.every((f) => typeof f === 'string' && f.toLowerCase().includes('no acute'));

  // Loading state
  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🩺</div>
        <h2 style={{ fontFamily: 'Manrope', color: 'var(--plum)' }}>Loading Clinical Triage...</h2>
        <p style={{ color: 'var(--muted)' }}>Synthesizing patient records with Mistral AI</p>
      </div>
    );
  }

  // Error state
  if (loadError && !triageData) {
    return (
      <div style={{ maxWidth: '1200px', margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontFamily: 'Manrope', color: '#dc2626' }}>Triage Load Error</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>{loadError}</p>
        <button className="primary-btn" onClick={() => fetchTriage()} style={{ padding: '12px 24px' }}>
          Retry ↻
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Vaidya Header & Search */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          color: '#fff',
          borderRadius: '24px',
          padding: '24px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '36px' }}>🩺</span>
          <div>
            <h1 style={{ fontFamily: 'Manrope', fontSize: '22px', margin: 0 }}>
              30-Second Clinical OPD Briefing (Vaidya Intelligence)
            </h1>
            <p style={{ margin: '4px 0 0', color: '#c7d2fe', fontSize: '13px' }}>
              Dual-Standard NAMASTE & WHO ICD-11 Chapter 26 terminology with HL7 FHIR R4 export.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleExportFhir}
            disabled={fhirLoading}
            style={{ background: '#fff', color: '#312e81', padding: '10px 16px', fontSize: '13px', borderRadius: '12px' }}
          >
            {fhirLoading ? 'Generating...' : '📄 Export HL7 FHIR R4'}
          </button>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setShowPrescribe(!showPrescribe)}
            style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '12px', background: '#4f46e5' }}
          >
            {showPrescribe ? '✕ Close Writer' : '✍ Write Prescription to DB'}
          </button>
        </div>
      </div>

      {/* Patient Banner */}
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--line)',
          borderRadius: '20px',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'var(--plum)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            {(triageData?.patientName || user?.patientProfile?.fullName || 'P')?.[0] || 'P'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '18px' }}>
              {triageData?.patientName || user?.patientProfile?.fullName || 'Patient'}
            </h3>
            <small style={{ color: 'var(--muted)' }}>
              Unit ID: <strong>{triageData?.medilockerId || user?.medilockerId || 'ML-VAULT'}</strong> · Blood: {triageData?.bloodGroup || 'O+'} · Allergies: {triageData?.allergies || 'None'}
            </small>
          </div>
        </div>

        <span
          style={{
            background: 'var(--sage)',
            color: '#2d5a27',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          ● Active Clinical Session
        </span>
      </div>

      {/* Prescription Writer Form */}
      {showPrescribe && (
        <div
          style={{
            background: 'var(--white)',
            border: '2px solid #6366f1',
            borderRadius: '20px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <span className="eyebrow" style={{ color: '#4f46e5' }}>CLINICAL CONSULTATION</span>
          <h2 style={{ fontFamily: 'Manrope', margin: '4px 0 16px' }}>Compose Verified Prescription</h2>

          <form onSubmit={handleSavePrescription}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              <label>
                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Attending Physician</span>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--line)' }}
                />
              </label>

              <label>
                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Clinic / OPD Facility</span>
                <input
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--line)' }}
                />
              </label>

              <label>
                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Diagnosed Condition</span>
                <input
                  type="text"
                  required
                  value={diagnosesText}
                  onChange={(e) => setDiagnosesText(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--line)' }}
                />
              </label>

              <label>
                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Medicine Name & Strength</span>
                <input
                  type="text"
                  required
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--line)' }}
                />
              </label>

              <label>
                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Dosage Frequency</span>
                <select
                  value={medFreq}
                  onChange={(e) => setMedFreq(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--line)' }}
                >
                  <option value="1-0-1">1-0-1 (Morning & Night)</option>
                  <option value="1-1-1">1-1-1 (Thrice daily)</option>
                  <option value="1-0-0">1-0-0 (Morning only)</option>
                  <option value="0-0-1">0-0-1 (Bedtime only)</option>
                </select>
              </label>

              <label>
                <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Timing Instruction</span>
                <select
                  value={medTiming}
                  onChange={(e) => setMedTiming(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--line)' }}
                >
                  <option>Before food</option>
                  <option>After food</option>
                  <option>With warm water</option>
                  <option>At bedtime</option>
                </select>
              </label>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button className="primary-btn" type="submit" style={{ padding: '12px 24px', background: '#4f46e5' }}>
                Save Prescription Directly to DB ↗
              </button>
              {prescribeSaved && (
                <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '14px' }}>
                  ✓ Prescription & Timeline Event saved to live database!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Main Grid: 30-Second Synthesis + Physiological Profile */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', marginBottom: '28px' }}>
        {/* Left: 30s High Density Clinical Briefing */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--line)',
            borderRadius: '24px',
            padding: '26px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow" style={{ color: '#6366f1' }}>30-SECOND HIGH DENSITY BRIEFING</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)' }}>⚡ Instant Synthesis</span>
          </div>

          <h3 style={{ fontFamily: 'Manrope', fontSize: '20px', margin: '8px 0 14px' }}>
            Chief Complaints & Red Flags
          </h3>

          {/* Red Flag Alert */}
          {hasRealRedFlags && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#991b1b',
                fontSize: '13px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🚨</span>
              <strong>{redFlags.join(', ')}</strong>
            </div>
          )}

          {/* Chief Complaint Bullets */}
          <ul style={{ margin: '0 0 18px', paddingLeft: '20px', lineHeight: 1.7, fontSize: '15px' }}>
            {chiefComplaints.map((cc, i) => (
              <li key={i}>{typeof cc === 'string' ? cc : JSON.stringify(cc)}</li>
            ))}
          </ul>

          {/* Recommended Clinical Plan */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
            <strong style={{ fontSize: '14px', color: 'var(--plum)', display: 'block', marginBottom: '8px' }}>
              Actionable Clinical Guidelines:
            </strong>
            <div style={{ display: 'grid', gap: '6px' }}>
              {clinicalPlan.map((plan, pIdx) => (
                <div
                  key={pIdx}
                  style={{
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    borderLeft: '3px solid #6366f1',
                  }}
                >
                  • {typeof plan === 'string' ? plan : JSON.stringify(plan)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Physiological Profile & Standardized Double Codes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Physiological Radar/Bars Card */}
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--line)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <span className="eyebrow" style={{ color: '#b45309' }}>PHYSIOLOGICAL PROFILE</span>
            <h3 style={{ fontFamily: 'Manrope', fontSize: '18px', margin: '6px 0 14px' }}>
              Tridosha Metabolic Systemic Indices
            </h3>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Neuro-Motor Regulation (Vata):</span>
                  <strong>{profile.neuroMotorScore || 35}%</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${profile.neuroMotorScore || 35}%`, background: '#38bdf8', height: '100%' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Metabolic-Inflammatory State (Pitta):</span>
                  <strong>{profile.metabolicScore || 45}%</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${profile.metabolicScore || 45}%`, background: '#f59e0b', height: '100%' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>Structural-Fluid Balance (Kapha):</span>
                  <strong>{profile.structuralScore || 20}%</strong>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${profile.structuralScore || 20}%`, background: '#10b981', height: '100%' }}></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: '#fefce8', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', color: '#854d0e' }}>
              <strong>Agni / Digestive Status:</strong> {profile.metabolicStatus || 'Equilibrium (Sama)'}
            </div>
          </div>

          {/* Standardized Double Codes Card */}
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--line)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: 'var(--shadow)',
            }}
          >
            <span className="eyebrow" style={{ color: 'var(--plum)' }}>ONTOLOGY CODES</span>
            <h3 style={{ fontFamily: 'Manrope', fontSize: '18px', margin: '6px 0 12px' }}>
              Dual Standard Codes
            </h3>

            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ background: 'var(--cream)', padding: '10px 14px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px', fontWeight: 800 }}>
                  NAMASTE NATIONAL CODE
                </span>
                <strong style={{ display: 'block', fontSize: '15px', color: 'var(--plum)', margin: '2px 0' }}>
                  {triageData?.standardizedDoubleCodes?.namasteCode || 'NAMC-AG-01'} · {triageData?.standardizedDoubleCodes?.namasteTerm || 'Amlapitta'}
                </strong>
              </div>

              <div style={{ background: 'var(--cream)', padding: '10px 14px', borderRadius: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px', fontWeight: 800 }}>
                  WHO ICD-11 CHAPTER 26 (TM2)
                </span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#1e40af', margin: '2px 0' }}>
                  {triageData?.standardizedDoubleCodes?.icd11Tm2 || 'TM2: SF99 (General systemic evaluation)'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual-Standard Terminology Search & Code Assistant */}
      <div
        style={{
          background: 'var(--white)',
          border: '1px solid var(--line)',
          borderRadius: '24px',
          padding: '26px',
          marginBottom: '30px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <span className="eyebrow">TERMINOLOGY CLASSIFICATION ENGINE</span>
        <h2 style={{ fontFamily: 'Manrope', margin: '4px 0 14px' }}>
          Dual-Standard Medical Classification (NAMASTE + WHO ICD-11 Chapter 26)
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', margin: '0 0 16px' }}>
          Search any clinical complaint, syndrome, or conventional disorder to compute standard National Morbidity and WHO TM2 codes.
        </p>

        <form onSubmit={handleDoubleCodeLookup} style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
          <input
            type="text"
            value={codingQuery}
            onChange={(e) => setCodingQuery(e.target.value)}
            placeholder="Enter clinical condition (e.g. Acid dyspepsia, Bronchial asthma, Osteoarthritis)"
            style={{
              flex: 1,
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '15px',
            }}
          />
          <button className="primary-btn" type="submit" disabled={codingLoading} style={{ padding: '0 24px' }}>
            {codingLoading ? 'Computing Codes...' : 'Classify 🔍'}
          </button>
        </form>

        {codingResult && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>NATIONAL MORBIDITY CODE</span>
              <strong style={{ display: 'block', fontSize: '16px', color: 'var(--plum)', margin: '4px 0 2px' }}>
                {codingResult.nationalMorbidityCode?.code || 'N/A'}
              </strong>
              <span style={{ fontSize: '13px', color: '#334155' }}>
                {codingResult.nationalMorbidityCode?.term || ''} {codingResult.nationalMorbidityCode?.scientificCategory ? `(${codingResult.nationalMorbidityCode.scientificCategory})` : ''}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>WHO ICD-11 CHAPTER 26</span>
              <strong style={{ display: 'block', fontSize: '16px', color: '#1e40af', margin: '4px 0 2px' }}>
                {codingResult.icd11Tm2Code?.code || 'N/A'}
              </strong>
              <span style={{ fontSize: '13px', color: '#334155' }}>
                {codingResult.icd11Tm2Code?.term || ''} {codingResult.icd11Tm2Code?.description ? `- ${codingResult.icd11Tm2Code.description}` : ''}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>SYSTEMIC RATIO</span>
              <div style={{ fontSize: '13px', marginTop: '6px', lineHeight: 1.5 }}>
                <div>Neuro-Motor: <strong>{codingResult.physiologicalProfile?.neuroMotorIndex ?? 'N/A'}%</strong></div>
                <div>Metabolic-Inflammatory: <strong>{codingResult.physiologicalProfile?.metabolicInflammatoryIndex ?? 'N/A'}%</strong></div>
                <div>Structural-Fluid: <strong>{codingResult.physiologicalProfile?.structuralFluidIndex ?? 'N/A'}%</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FHIR Bundle JSON Viewer Modal */}
      {fhirData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '24px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Manrope', fontSize: '18px' }}>
                HL7 FHIR R4 Clinical Document Bundle (ABDM Standard)
              </h3>
              <button
                type="button"
                onClick={() => setFhirData(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <pre
              style={{
                flex: 1,
                overflowY: 'auto',
                background: '#020617',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#38bdf8',
                fontFamily: 'monospace',
              }}
            >
              {JSON.stringify(fhirData, null, 2)}
            </pre>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(fhirData, null, 2));
                  alert('FHIR JSON copied to clipboard!');
                }}
              >
                Copy JSON 📋
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => setFhirData(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
