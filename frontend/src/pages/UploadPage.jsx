import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Camera, Sparkles, Plus, Trash2, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function UploadPage({ setCurrentView, onShowToast }) {
  const [activeMode, setActiveMode] = useState('manual');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    category: 'Prescription',
    eventDate: new Date().toISOString().split('T')[0],
    doctorName: '',
    clinicName: '',
    diagnoses: '',
    clinicalSummary: '',
    medications: [
      { medicineName: '', dosage: '1 tablet', frequency: '1-0-1', timing: 'After Food' }
    ]
  });

  const handleAddMedRow = () => {
    setManualForm({
      ...manualForm,
      medications: [
        ...manualForm.medications,
        { medicineName: '', dosage: '1 tablet', frequency: '1-0-1', timing: 'After Food' }
      ]
    });
  };

  const handleRemoveMedRow = (idx) => {
    const updated = manualForm.medications.filter((_, i) => i !== idx);
    setManualForm({
      ...manualForm,
      medications: updated.length ? updated : [{ medicineName: '', dosage: '', frequency: '', timing: '' }]
    });
  };

  const handleMedChange = (idx, field, val) => {
    const updated = [...manualForm.medications];
    updated[idx][field] = val;
    setManualForm({ ...manualForm, medications: updated });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!manualForm.diagnoses.trim()) {
      setError('Please enter a diagnosis or clinical reason.');
      return;
    }

    setUploading(true);
    try {
      const ddmmyyyy = manualForm.eventDate.split('-').reverse().join('');
      const validMeds = manualForm.medications.filter((m) => m.medicineName.trim());

      await api.createRecord({
        category: manualForm.category,
        eventDateDdmmyyyy: ddmmyyyy,
        doctorName: manualForm.doctorName || 'Dr. Not Specified',
        clinicName: manualForm.clinicName || 'Personal Health Record',
        diagnoses: [manualForm.diagnoses.trim()],
        clinicalSummary: manualForm.clinicalSummary || `Manual health record for ${manualForm.diagnoses.trim()}`,
        prescribedMedications: validMeds,
      });

      onShowToast?.({
        type: 'success',
        title: 'Record Vaulted',
        message: 'Clinical record saved directly to your Supabase cloud locker.'
      });
      setCurrentView('records');
    } catch (err) {
      setError(err?.message || 'Failed to vault record.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);
    setParsedPreview(null);

    try {
      onShowToast?.({
        type: 'info',
        title: 'Processing Document',
        message: 'Uploading to Supabase Storage & analyzing via Mistral OCR...'
      });

      const res = await api.uploadRecordFile(file, 'PRESCRIPTION', 'Prescription upload');
      const timeline = res.data?.timelineEvent;
      const record = res.data?.record;

      setParsedPreview({
        category: record?.documentType === 'PRESCRIPTION' ? 'Prescription' : 'Medical Report',
        doctorName: timeline?.doctorName || 'Dr. Self-Entered',
        clinicName: timeline?.clinicName || 'Medical Center',
        diagnoses: timeline?.diagnoses || ['Document Processed'],
        clinicalSummary: timeline?.clinicalSummary || 'Extraction completed via Mistral OCR.',
        prescribedMedications: (timeline?.prescribedMeds || []).map((m) => ({
          medicineName: m.medicineName,
          dosage: m.dosage,
          frequency: m.frequency,
          timing: m.timingInstruction,
        })),
        url: record?.url,
      });

      onShowToast?.({
        type: 'success',
        title: 'Medi-AI Extraction Complete',
        message: 'Record successfully vaulted and stored in Supabase!'
      });
    } catch (err) {
      setError(err?.message || 'Failed to process document with Mistral OCR.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Ingest & Vault Medical Records
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Real multimodal Mistral OCR ingestion and structured manual form submission saved directly to Supabase.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex bg-slate-200/80 p-1.5 rounded-2xl text-xs font-bold text-slate-700">
        <button
          onClick={() => { setActiveMode('manual'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-600" />
          <span>Manual Form Entry</span>
        </button>
        <button
          onClick={() => { setActiveMode('ai_upload'); setError(''); }}
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 ${
            activeMode === 'ai_upload' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Mistral OCR Document Ingest</span>
        </button>
      </div>

      {/* Mode 1: Manual Form Submit */}
      {activeMode === 'manual' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8">
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <span>Structured Clinical Form Submission</span>
              </h3>
              <span className="text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-0.5 rounded-full">
                Sovereign Record
              </span>
            </div>

            {/* Row 1: Category & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Record Category *
                </label>
                <select
                  value={manualForm.category}
                  onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white"
                >
                  <option value="Prescription">Prescription</option>
                  <option value="Lab Report">Lab Report</option>
                  <option value="Vaccine Certificate">Vaccine Certificate</option>
                  <option value="Discharge Summary">Discharge Summary</option>
                  <option value="Imaging / Scan">Imaging / Scan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Consultation / Event Date *
                </label>
                <input
                  type="date"
                  value={manualForm.eventDate}
                  onChange={(e) => setManualForm({ ...manualForm, eventDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Row 2: Doctor & Clinic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Doctor Name & Degree
                </label>
                <input
                  type="text"
                  value={manualForm.doctorName}
                  onChange={(e) => setManualForm({ ...manualForm, doctorName: e.target.value })}
                  placeholder="e.g. Dr. Rajesh K. Varma (MD)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Clinic or Hospital Name
                </label>
                <input
                  type="text"
                  value={manualForm.clinicName}
                  onChange={(e) => setManualForm({ ...manualForm, clinicName: e.target.value })}
                  placeholder="e.g. Fortis Hospital, Bannerghatta"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Diagnoses & Summary */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Diagnoses / Primary Concern *
                </label>
                <input
                  type="text"
                  value={manualForm.diagnoses}
                  onChange={(e) => setManualForm({ ...manualForm, diagnoses: e.target.value })}
                  placeholder="e.g. Viral Pharyngitis, Type-2 Diabetes Routine Checkup"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                  Doctor Advice / Clinical Notes
                </label>
                <textarea
                  rows={3}
                  value={manualForm.clinicalSummary}
                  onChange={(e) => setManualForm({ ...manualForm, clinicalSummary: e.target.value })}
                  placeholder="Key doctor advice, diet instructions, warnings, or lab findings..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white leading-relaxed"
                ></textarea>
              </div>
            </div>

            {/* Prescribed Medications Dynamic Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Prescribed Medications
                </label>
                <button
                  type="button"
                  onClick={handleAddMedRow}
                  className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Medicine Row</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 grid grid-cols-12 gap-2">
                  <div className="col-span-5">Medicine & Strength</div>
                  <div className="col-span-3">Dosage</div>
                  <div className="col-span-3">Frequency & Timing</div>
                  <div className="col-span-1 text-center">Del</div>
                </div>

                <div className="divide-y divide-slate-100 p-2 space-y-2">
                  {manualForm.medications.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={row.medicineName}
                          onChange={(e) => handleMedChange(idx, 'medicineName', e.target.value)}
                          placeholder="e.g. Paracetamol 650mg"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={row.dosage}
                          onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                          placeholder="e.g. 1 tablet"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={row.frequency}
                          onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                          placeholder="e.g. 1-0-1 (After Food)"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedRow(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Submit Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Encrypted client-side with your sovereign key</span>
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <span>Saving to Supabase...</span>
                ) : (
                  <>
                    <span>Submit & Vault Record</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mode 2: Real AI Multimodal OCR Upload */}
      {activeMode === 'ai_upload' && (
        <div className="space-y-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,application/pdf"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-white rounded-3xl border-2 border-dashed border-sky-300 hover:border-sky-500 p-8 text-center space-y-4 transition cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900">Upload Prescription Photo or PDF</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Click to browse file from device. Uploads to Supabase Cloud Storage and extracts with Mistral OCR.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={uploading}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
              >
                {uploading ? 'Processing with Mistral OCR...' : 'Choose File & Run Mistral OCR'}
              </button>
              <button
                type="button"
                disabled={uploading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4 text-sky-600" />
                <span>Camera Snap / Photo</span>
              </button>
            </div>
          </div>

          {/* Real Extracted Preview Card */}
          {parsedPreview && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Entities Extracted by Mistral OCR</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Vaulted in Supabase
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Diagnoses</span>
                  <strong className="text-slate-800">{parsedPreview.diagnoses.join(', ')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Doctor / Facility</span>
                  <strong className="text-slate-800">{parsedPreview.doctorName} ({parsedPreview.clinicName})</strong>
                </div>
              </div>

              <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Clinical Summary</span>
                {parsedPreview.clinicalSummary}
              </div>

              <button
                onClick={() => setCurrentView('records')}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <span>View All Vaulted Records</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
