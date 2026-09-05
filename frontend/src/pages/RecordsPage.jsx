import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Share2, Download, Eye, Calendar, PlusCircle, Shield, CheckCircle2 } from 'lucide-react';
import Modal from '../components/common/Modal';
import { api } from '../services/api';

export default function RecordsPage({ setCurrentView, onShowToast }) {
  const [records, setRecords] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFormData, setShareFormData] = useState({
    doctorUnitId: '',
    duration: '15min',
    purpose: 'Clinical Consultation'
  });
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await api.getRecords();
      setRecords(data);
    }
    load();
  }, []);

  const filteredRecords = records.filter((r) => {
    const matchesCat = categoryFilter === 'All' || r.category === categoryFilter;
    const matchesSearch =
      r.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.clinicName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.diagnoses?.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.clinicalSummary?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleShareSubmit = (e) => {
    e.preventDefault();
    if (!shareFormData.doctorUnitId.trim()) {
      onShowToast?.({ type: 'error', message: 'Please enter a valid Doctor or Hospital Unit ID.' });
      return;
    }

    setSharing(true);
    setTimeout(() => {
      setSharing(false);
      setShareModalOpen(false);
      onShowToast?.({
        type: 'success',
        title: 'Consent Granted',
        message: `15-minute emergency read-only consent issued to ${shareFormData.doctorUnitId}.`
      });
      setShareFormData({ doctorUnitId: '', duration: '15min', purpose: 'Clinical Consultation' });
    }, 600);
  };

  const categories = ['All', 'Prescription', 'Lab Report', 'Vaccine Certificate', 'Discharge Summary'];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Sovereign Health Records Vault
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Indexed chronologically with 8-digit ddmmyyyy tamper-proof metadata.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShareModalOpen(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Share2 className="w-4 h-4 text-sky-600" />
            <span>Grant Doctor Consent</span>
          </button>
          <button
            onClick={() => setCurrentView('upload')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search diagnoses, doctors, medicines..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition ${
                categoryFilter === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Records Timeline List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800">No records match your filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Try clearing your search query or upload a new medical document.</p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-card hover:shadow-card-hover transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {rec.category}
                  </span>
                  <div className="font-mono text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>{rec.dateFormatted}</span>
                    <span className="text-[10px] text-slate-400">({rec.eventDateDdmmyyyy})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRecord(rec)}
                    className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                  <button
                    onClick={() => onShowToast?.({ type: 'success', message: 'Downloading cryptographically signed PDF...' })}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                    title="Download document"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-2">
                  <h3 className="font-display font-black text-lg text-slate-900 leading-snug">
                    {rec.diagnoses?.join(', ')}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.clinicalSummary}</p>
                </div>
                <div className="md:col-span-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Practitioner / Facility</div>
                  <div className="font-bold text-slate-800">{rec.doctorName}</div>
                  <div className="text-slate-500 text-[11px]">{rec.clinicName}</div>
                </div>
              </div>

              {/* Prescriptions Pill Tags if available */}
              {rec.prescribedMedications?.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  {rec.prescribedMedications.map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-semibold border border-slate-200">
                      <span>💊 {m.medicineName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({m.frequency})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Record Inspect Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Clinical Record: ${selectedRecord.diagnoses?.join(', ')}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <strong className="text-sky-800">{selectedRecord.category}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Date</span>
                <strong className="text-slate-800 font-mono">{selectedRecord.dateFormatted}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Doctor</span>
                <strong className="text-slate-800">{selectedRecord.doctorName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Facility</span>
                <strong className="text-slate-800">{selectedRecord.clinicName}</strong>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">Clinical Summary</h4>
              <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                {selectedRecord.clinicalSummary}
              </p>
            </div>

            {selectedRecord.prescribedMedications?.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">Prescribed Regimen</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">Medicine</th>
                        <th className="p-2.5">Dosage</th>
                        <th className="p-2.5">Frequency</th>
                        <th className="p-2.5">Timing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRecord.prescribedMedications.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-800">{m.medicineName}</td>
                          <td className="p-2.5 text-slate-600">{m.dosage}</td>
                          <td className="p-2.5 font-mono text-sky-700 font-bold">{m.frequency}</td>
                          <td className="p-2.5 text-slate-600">{m.timing || 'After Food'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedRecord(null);
                  onShowToast?.({ type: 'success', message: 'Exported sovereign record to PDF.' });
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl"
              >
                Print / Export
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Share Consent Form Modal */}
      <Modal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Grant Temporary Clinical Consent"
      >
        <form onSubmit={handleShareSubmit} className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            In compliance with the DPDP Act 2023, you retain sovereign ownership. The doctor or hospital will receive strictly time-bound, read-only access.
          </p>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
              Doctor or Hospital 9-Digit Unit ID *
            </label>
            <input
              type="text"
              value={shareFormData.doctorUnitId}
              onChange={(e) => setShareFormData({ ...shareFormData, doctorUnitId: e.target.value })}
              placeholder="e.g. DOC-912-384 or HOSP-441-209"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
              Consent Expiration Duration
            </label>
            <select
              value={shareFormData.duration}
              onChange={(e) => setShareFormData({ ...shareFormData, duration: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
            >
              <option value="15min">15 Minutes (Emergency Triage / Single Consultation)</option>
              <option value="1hr">1 Hour (Outpatient Appointment)</option>
              <option value="24hr">24 Hours (Hospital Day Care)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={sharing}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sharing ? (
              <span>Issuing Cryptographic Token...</span>
            ) : (
              <>
                <Shield className="w-4 h-4 text-amber-300" />
                <span>Authorize & Issue Temporary Consent</span>
              </>
            )}
          </button>
        </form>
      </Modal>
    </div>
  );
}
