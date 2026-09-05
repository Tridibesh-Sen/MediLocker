import React, { useState } from 'react';
import { Building2, Bed, Users, ShieldAlert, Plus, CheckCircle2, Search } from 'lucide-react';

export default function HospitalPortalPage({ onShowToast }) {
  const [admitForm, setAdmitForm] = useState({
    patientUnitId: 'ML-842-194-672',
    wardType: 'Emergency ICU',
    admittingDoctor: 'Dr. Ramesh K. Verma',
    initialVitals: 'BP 120/80, Pulse 76, SpO2 99%',
  });
  const [admitting, setAdmitting] = useState(false);

  const [activeAdmissions, setActiveAdmissions] = useState([
    {
      id: 'adm-01',
      patientName: 'Ananya Sharma',
      unitId: 'ML-842-194-672',
      ward: 'ICU Bed 04',
      admittedAt: 'Today, 10:15 AM',
      status: 'Admitted & Monitored'
    },
    {
      id: 'adm-02',
      patientName: 'Vikram Mehta',
      unitId: 'ML-392-108-554',
      ward: 'General Ward Bed 12',
      admittedAt: 'Yesterday, 04:30 PM',
      status: 'Stable'
    }
  ]);

  const handleAdmitSubmit = (e) => {
    e.preventDefault();
    if (!admitForm.patientUnitId.trim()) return;

    setAdmitting(true);
    setTimeout(() => {
      setAdmitting(false);
      const newAdm = {
        id: 'adm-' + Date.now(),
        patientName: 'Patient ' + admitForm.patientUnitId.slice(-4),
        unitId: admitForm.patientUnitId,
        ward: admitForm.wardType,
        admittedAt: 'Just now',
        status: 'Admitted'
      };
      setActiveAdmissions([newAdm, ...activeAdmissions]);
      onShowToast?.({
        type: 'success',
        title: 'Patient Admitted',
        message: `Temporary clinical locker access linked for ${admitForm.patientUnitId}.`
      });
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-full mb-2 border border-sky-300">
          <Building2 className="w-3.5 h-3.5" />
          <span>Institutional Hospital Workspace · ABDM NABH Level 3</span>
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Apollo Multi-Specialty Hospital Console
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Emergency patient admission, inpatient locker linking, and doctor roster delegation.
        </p>
      </div>

      {/* Hospital Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Bed Availability</div>
            <div className="text-xl font-display font-black text-slate-900">42 / 50 Free</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Active Inpatients</div>
            <div className="text-xl font-display font-black text-slate-900">{activeAdmissions.length} Registered</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase">Consent Tokens Active</div>
            <div className="text-xl font-display font-black text-slate-900">100% Verified</div>
          </div>
        </div>
      </div>

      {/* Inpatient Admission Form */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6">
        <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Plus className="w-5 h-5 text-sky-600" />
          <span>Admit Patient & Request Locker Linking</span>
        </h3>

        <form onSubmit={handleAdmitSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Patient 9-Digit Unit ID *
              </label>
              <input
                type="text"
                value={admitForm.patientUnitId}
                onChange={(e) => setAdmitForm({ ...admitForm, patientUnitId: e.target.value })}
                placeholder="e.g. ML-842-194-672"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Ward / Bed Allocation
              </label>
              <select
                value={admitForm.wardType}
                onChange={(e) => setAdmitForm({ ...admitForm, wardType: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              >
                <option value="Emergency ICU">Emergency ICU</option>
                <option value="Step-Down High Dependency Unit (HDU)">Step-Down HDU</option>
                <option value="General Medical Ward">General Medical Ward</option>
                <option value="Day Care Chemotherapy">Day Care Chemotherapy</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Admitting Chief Physician
              </label>
              <input
                type="text"
                value={admitForm.admittingDoctor}
                onChange={(e) => setAdmitForm({ ...admitForm, admittingDoctor: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Baseline Triage Vitals
              </label>
              <input
                type="text"
                value={admitForm.initialVitals}
                onChange={(e) => setAdmitForm({ ...admitForm, initialVitals: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={admitting}
              className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
            >
              {admitting ? 'Admitting Patient...' : 'Admit & Initialize Locker Token'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Admissions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
        <h3 className="font-display font-bold text-base text-slate-900">Current Inpatient Census</h3>
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Patient</th>
                <th className="p-3">Unit ID</th>
                <th className="p-3">Ward</th>
                <th className="p-3">Admitted At</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeAdmissions.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{adm.patientName}</td>
                  <td className="p-3 font-mono text-sky-700 font-bold">{adm.unitId}</td>
                  <td className="p-3 text-slate-600">{adm.ward}</td>
                  <td className="p-3 text-slate-500">{adm.admittedAt}</td>
                  <td className="p-3">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                      {adm.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
