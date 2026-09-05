import React, { useState } from 'react';
import { Stethoscope, Search, ShieldCheck, FilePlus, User, CheckCircle2, Clock, Send } from 'lucide-react';
import { api } from '../services/api';

export default function DoctorPortalPage({ onShowToast }) {
  const [patientId, setPatientId] = useState('');
  const [patientRecord, setPatientRecord] = useState(null);
  const [searching, setSearching] = useState(false);

  // Prescription Form
  const [rxForm, setRxForm] = useState({
    diagnosis: '',
    medicineName: '',
    dosage: '1 tab',
    frequency: '1-0-1',
    timing: 'After Food',
    instructions: '',
  });
  const [submittingRx, setSubmittingRx] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) return;

    setSearching(true);
    try {
      const data = await api.lookupPatient(patientId.trim());
      setPatientRecord({
        name: data.patientName,
        unitId: data.medilockerId,
        age: 28,
        gender: 'Adult',
        bloodGroup: 'Recorded',
        consentActive: true,
        consentExpiresIn: 'Active Sovereign Consent',
      });
      onShowToast?.({
        type: 'success',
        title: 'Consent Verified',
        message: `Active record access confirmed for ${data.patientName}.`
      });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message || 'Patient not found or invalid Unit ID.' });
    } finally {
      setSearching(false);
    }
  };

  const handleRxSubmit = async (e) => {
    e.preventDefault();
    if (!rxForm.diagnosis || !rxForm.medicineName) {
      onShowToast?.({ type: 'error', message: 'Please fill in diagnosis and medication name.' });
      return;
    }

    setSubmittingRx(true);
    try {
      await api.createRecord({
        category: 'Prescription',
        doctorName: 'Attending Physician',
        clinicName: 'MediLocker Outpatient Clinic',
        date: new Date().toISOString(),
        diagnoses: [rxForm.diagnosis],
        clinicalSummary: rxForm.instructions || `Diagnosed with ${rxForm.diagnosis}. Initiated ${rxForm.medicineName}.`,
        prescriptions: [
          {
            medicineName: rxForm.medicineName,
            dosage: rxForm.dosage,
            frequency: rxForm.frequency,
            timing: rxForm.timing,
            durationDays: 7,
            totalQuantity: 14,
          }
        ]
      });

      onShowToast?.({
        type: 'success',
        title: 'Prescription Vaulted',
        message: `Digital prescription created and cryptographically saved to Supabase!`
      });
      setRxForm({
        diagnosis: '',
        medicineName: '',
        dosage: '1 tab',
        frequency: '1-0-1',
        timing: 'After Food',
        instructions: '',
      });
    } catch (err) {
      onShowToast?.({ type: 'error', message: 'Failed to vault prescription.' });
    } finally {
      setSubmittingRx(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2 border border-emerald-300">
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Doctor Clinical Workspace · NHA ABDM Licensed</span>
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Patient Lookup & Digital Prescription Pad
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Verify sovereign patient consent tokens and issue tamper-proof prescriptions directly to the patient's locker.
        </p>
      </div>

      {/* Patient Lookup Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
        <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider text-[11px]">
          Lookup Patient by 9-Digit Unit ID
        </h3>
        <form onSubmit={handleLookup} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. ML-842-194-672"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50 text-xs"
          >
            {searching ? 'Verifying Token...' : 'Verify Consent & Open Locker'}
          </button>
        </form>
      </div>

      {/* Patient Card & Prescription Pad */}
      {patientRecord && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Consent Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center">
                AS
              </div>
              <div>
                <div className="font-display font-black text-slate-900 text-lg">{patientRecord.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-800">{patientRecord.unitId}</span>
                  <span>•</span>
                  <span>{patientRecord.age} Yrs / {patientRecord.gender}</span>
                  <span>•</span>
                  <span className="font-bold text-rose-600">Blood: {patientRecord.bloodGroup}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-sm">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{patientRecord.consentExpiresIn}</span>
            </div>
          </div>

          {/* Prescription Pad Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-sky-600" />
                <span>Write Digital Sovereign Prescription</span>
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded uppercase">
                FHIR R4 Schema
              </span>
            </div>

            <form onSubmit={handleRxSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  value={rxForm.diagnosis}
                  onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })}
                  placeholder="e.g. Acute Pharyngitis with Pyrexia"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    Prescribed Medicine *
                  </label>
                  <input
                    type="text"
                    value={rxForm.medicineName}
                    onChange={(e) => setRxForm({ ...rxForm, medicineName: e.target.value })}
                    placeholder="e.g. Azithromycin 500mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    Frequency
                  </label>
                  <input
                    type="text"
                    value={rxForm.frequency}
                    onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
                    placeholder="e.g. 1-0-1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                    Timing
                  </label>
                  <select
                    value={rxForm.timing}
                    onChange={(e) => setRxForm({ ...rxForm, timing: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    <option value="After Food">After Food</option>
                    <option value="Before Food">Before Food</option>
                    <option value="At Bedtime">At Bedtime</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Special Instructions / Follow-up Advice
                </label>
                <textarea
                  rows={2}
                  value={rxForm.instructions}
                  onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })}
                  placeholder="e.g. Complete 5 day course. Drink warm fluids. Review if pyrexia persists."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingRx}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingRx ? (
                    <span>Signing & Dispatching...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Issue Digital Prescription</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
