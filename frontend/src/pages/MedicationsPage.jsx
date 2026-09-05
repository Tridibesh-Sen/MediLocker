import React, { useState, useEffect } from 'react';
import { Pill, Plus, CheckCircle2, AlertTriangle, Clock, Calendar, Sparkles, Trash2, Camera } from 'lucide-react';
import Modal from '../components/common/Modal';
import { api } from '../services/api';

export default function MedicationsPage({ onShowToast }) {
  const [medications, setMedications] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    activeSalt: '',
    dosage: '1 tablet',
    frequency: '1-0-1',
    timing: 'After Food',
    quantity: '15',
    slot: 'Morning',
    expiryDate: '2027-12-31'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await api.getMedications();
      setMedications(data);
    }
    load();
  }, []);

  const handleToggle = async (id) => {
    const res = await api.toggleMedication(id);
    if (res.success) {
      setMedications(res.list);
      onShowToast?.({ type: 'success', message: 'Dose state updated.' });
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onShowToast?.({ type: 'error', message: 'Please enter a medicine name.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.addMedication(formData);
      if (res.success) {
        setMedications([res.medication, ...medications]);
        setAddModalOpen(false);
        setFormData({
          name: '',
          activeSalt: '',
          dosage: '1 tablet',
          frequency: '1-0-1',
          timing: 'After Food',
          quantity: '15',
          slot: 'Morning',
          expiryDate: '2027-12-31'
        });
        onShowToast?.({
          type: 'success',
          title: 'Medication Added',
          message: `${res.medication.name} added to your active routine schedule.`
        });
      }
    } catch (err) {
      onShowToast?.({ type: 'error', message: 'Failed to add medication.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Daily Routine & Pill Inventory
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            12:00 AM midnight automated renewal checklist with stock countdown alerts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine to Routine</span>
          </button>
        </div>
      </div>

      {/* Routine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {medications.map((med) => {
          const isLowStock = med.remainingCount <= 3;
          return (
            <div
              key={med.id}
              className={`bg-white rounded-2xl border p-5 shadow-card transition flex flex-col justify-between space-y-4 ${
                med.takenToday ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:border-sky-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    med.slot === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {med.slot} Slot
                  </span>
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${
                    isLowStock ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-slate-500'
                  }`}>
                    {isLowStock && <AlertTriangle className="w-3 h-3" />}
                    <span>{med.remainingCount} pills left</span>
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 leading-snug">{med.name}</h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{med.activeSalt}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dosage</span>
                    <strong className="text-slate-700">{med.dosage}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Timing</span>
                    <strong className="text-slate-700">{med.timing}</strong>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleToggle(med.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  med.takenToday
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                }`}
              >
                {med.takenToday ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Dose Completed (Tap to Undo)</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Mark as Taken Today</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Medication Modal Form */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Medicine to Sovereign Routine"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
              Medicine Brand Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dolo 650 or Pantop 40"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Active Salt / Generic
              </label>
              <input
                type="text"
                value={formData.activeSalt}
                onChange={(e) => setFormData({ ...formData, activeSalt: e.target.value })}
                placeholder="e.g. Paracetamol"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Dosage
              </label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 650mg (1 tablet)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Schedule Slot
              </label>
              <select
                value={formData.slot}
                onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              >
                <option value="Morning">Morning (8:00 AM)</option>
                <option value="Afternoon">Afternoon (1:30 PM)</option>
                <option value="Evening">Evening (6:00 PM)</option>
                <option value="Night">Night (9:30 PM)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Timing Instruction
              </label>
              <select
                value={formData.timing}
                onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              >
                <option value="After Food">After Food</option>
                <option value="Before Food">Before Food (Empty Stomach)</option>
                <option value="With Food">With Food</option>
                <option value="Bedtime">At Bedtime</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Stock Quantity (Pills Count)
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition disabled:opacity-50"
          >
            {submitting ? 'Saving to Routine...' : 'Add Medication & Start Routine'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
