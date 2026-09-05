import React, { useState, useEffect } from 'react';
import { PlusCircle, FileText, Pill, ShieldAlert, CheckCircle2, Clock, Calendar, ArrowRight, UserCheck, Activity } from 'lucide-react';
import AbhaCard from '../components/common/AbhaCard';
import { api } from '../services/api';

export default function DashboardPage({ user, setCurrentView, onShowToast, onOpenEmergency }) {
  const [records, setRecords] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [recs, meds] = await Promise.all([api.getRecords(), api.getMedications()]);
        setRecords(recs.slice(0, 3));
        setMedications(meds);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleToggleMed = async (id) => {
    const res = await api.toggleMedication(id);
    if (res.success) {
      setMedications(res.list);
      onShowToast?.({
        type: 'success',
        message: 'Dose logged in sovereign health record!'
      });
    }
  };

  const takenCount = medications.filter((m) => m.takenToday).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Namaste, {user?.name || 'Patient'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Your health vault is active and cryptographically synchronized with ABDM.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('upload')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
          <button
            onClick={onOpenEmergency}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>SOS Card</span>
          </button>
        </div>
      </div>

      {/* Grid: Left ABHA Card & Vitals, Right Today's Routine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (ABHA Card + Vitals) */}
        <div className="lg:col-span-7 space-y-6">
          <AbhaCard user={user} onShowToast={onShowToast} />

          {/* Vitals Baseline Strip */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-card">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <span>Personal Clinical Baselines</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Blood Group</span>
                <strong className="text-rose-600 text-base font-black">{user?.bloodGroup || 'O+'}</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Drug Allergies</span>
                <strong className="text-slate-800 text-xs font-bold truncate block" title={user?.allergies?.join(', ')}>
                  {user?.allergies?.length ? user.allergies.join(', ') : 'None'}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Chronic</span>
                <strong className="text-slate-800 text-xs font-bold truncate block" title={user?.chronicConditions?.join(', ')}>
                  {user?.chronicConditions?.length ? user.chronicConditions.join(', ') : 'None'}
                </strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">DPDP Consent</span>
                <strong className="text-emerald-600 text-xs font-bold flex items-center justify-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sovereign</span>
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Daily Routine To-Do) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-sky-600" />
                  <span>Today's Medicine Schedule</span>
                </h3>
                <p className="text-xs text-slate-500">12:00 AM Midnight auto-reset</p>
              </div>
              <span className="text-xs font-bold bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full">
                {takenCount} / {medications.length} Taken
              </span>
            </div>

            {/* Checklist */}
            <div className="space-y-2.5">
              {medications.map((med) => (
                <div
                  key={med.id}
                  onClick={() => handleToggleMed(med.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    med.takenToday
                      ? 'bg-emerald-50/70 border-emerald-200 text-slate-500'
                      : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                      med.takenToday ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300'
                    }`}>
                      {med.takenToday && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className={`font-bold text-sm leading-tight ${med.takenToday ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {med.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{med.dosage}</span>
                        <span>•</span>
                        <span>{med.timing}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    med.slot === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {med.slot}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCurrentView('medications')}
              className="w-full py-2.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <span>Manage Cabinet & Refills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Health Records */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-600" />
              <span>Recent Health Records</span>
            </h3>
            <p className="text-xs text-slate-500">Vaulted clinical documents with 8-digit ddmmyyyy indexing</p>
          </div>
          <button
            onClick={() => setCurrentView('records')}
            className="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setCurrentView('records')}
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-md transition bg-slate-50/50 hover:bg-white cursor-pointer space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[10px] uppercase">
                    {rec.category}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">{rec.dateFormatted}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{rec.diagnoses?.join(', ')}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{rec.clinicalSummary}</p>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                {rec.doctorName} · {rec.clinicName}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
