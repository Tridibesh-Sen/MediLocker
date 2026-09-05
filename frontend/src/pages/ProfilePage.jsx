import React, { useState } from 'react';
import { User, Phone, Mail, Heart, AlertCircle, Shield, Plus, Check, Save } from 'lucide-react';
import { api } from '../services/api';

export default function ProfilePage({ user, onShowToast }) {
  const [profile, setProfile] = useState(user || api.getCurrentUser());
  const [allergiesText, setAllergiesText] = useState(profile?.allergies?.join(', ') || '');
  const [chronicText, setChronicText] = useState(profile?.chronicConditions?.join(', ') || '');
  const [emergencyContact, setEmergencyContact] = useState({
    name: profile?.emergencyContact?.name || '',
    relation: profile?.emergencyContact?.relation || 'Family',
    phone: profile?.emergencyContact?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const live = await api.getProfile();
      if (live) {
        setProfile(live);
        setAllergiesText(live.allergies?.join(', ') || '');
        setChronicText(live.chronicConditions?.join(', ') || '');
        setEmergencyContact({
          name: live.emergencyContact?.name || '',
          relation: live.emergencyContact?.relation || 'Family',
          phone: live.emergencyContact?.phone || '',
        });
      }
    }
    load();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedPayload = {
        name: profile?.name,
        allergies: allergiesText.split(',').map((s) => s.trim()).filter(Boolean),
        chronicConditions: chronicText.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContact,
      };
      const res = await api.updateProfile(updatedPayload);
      if (res.success) {
        setProfile(res.data);
        onShowToast?.({
          type: 'success',
          title: 'Profile Updated',
          message: 'Clinical baselines and emergency contacts synced with Supabase.'
        });
      }
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message || 'Failed to save profile changes.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Sovereign Health Profile
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Demographic identity, emergency first responder bypass, and clinical baselines.
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Card 1: Identification */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'AS'}
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-slate-900 leading-snug">{profile?.name}</h3>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {profile?.medilockerId}
                </span>
                <span>•</span>
                <span className="capitalize">{profile?.role}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                ABHA Number
              </label>
              <div className="font-mono font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {profile?.abhaNumber || '91-4829-1092-4820'}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                Email Address
              </label>
              <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 truncate">
                {profile?.email}
              </div>
            </div>
            <div>
              <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">
                Phone Number
              </label>
              <div className="font-mono font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {profile?.phone}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Clinical Baselines */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Heart className="w-5 h-5 text-rose-600" />
            <span>Clinical Allergies & Pre-Existing Conditions</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Known Drug Allergies (Comma Separated)
              </label>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa, Aspirin"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">Medi-AI automatically flags contraindications matching these salts.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Chronic Conditions (Comma Separated)
              </label>
              <input
                type="text"
                value={chronicText}
                onChange={(e) => setChronicText(e.target.value)}
                placeholder="e.g. Mild Asthma, Hypertension"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Emergency First Responder Contact */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Phone className="w-5 h-5 text-emerald-600" />
            <span>Emergency Kin & SOS Bypass Contact</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Contact Name *
              </label>
              <input
                type="text"
                value={emergencyContact.name}
                onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Relationship
              </label>
              <input
                type="text"
                value={emergencyContact.relation}
                onChange={(e) => setEmergencyContact({ ...emergencyContact, relation: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">
                Emergency Phone *
              </label>
              <input
                type="tel"
                value={emergencyContact.phone}
                onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Form Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Changes...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
