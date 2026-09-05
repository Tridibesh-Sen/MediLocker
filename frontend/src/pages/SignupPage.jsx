import React, { useState } from 'react';
import { ShieldCheck, User, Phone, Mail, Calendar, Heart, Lock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function SignupPage({ onSignupSuccess, setCurrentView, onShowToast }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '1998-05-20',
    gender: 'Female',
    bloodGroup: 'B+',
    allergies: 'None',
    chronicConditions: 'None',
    mpin: '123456',
    emergencyContactName: '',
    emergencyContactRelation: 'Spouse',
    emergencyContactPhone: '',
    role: 'patient',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your 10-digit mobile number.');
      return;
    }
    if (formData.mpin.length !== 6) {
      setError('MPIN must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.signup(formData);
      if (res.success) {
        onShowToast?.({
          type: 'success',
          title: 'Account Created',
          message: `Your sovereign Unit ID: ${res.user.medilockerId}`
        });
        onSignupSuccess(res.user);
      } else {
        setError(res.error || 'Failed to create account.');
      }
    } catch (err) {
      setError('An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 px-4 sm:px-0">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-600/30 border border-sky-400/40 flex items-center justify-center mx-auto mb-3 text-amber-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="font-display font-black text-2xl text-white">Create Your MediLocker Vault</h2>
          <p className="text-slate-300 text-xs mt-1">ABDM DigiLocker Sovereign Health Registration</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Account Role</label>
            <div className="grid grid-cols-3 gap-2">
              {['patient', 'doctor', 'hospital'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setFormData({ ...formData, role: r })}
                  className={`py-2 px-3 text-xs font-bold capitalize rounded-xl border transition ${
                    formData.role === r
                      ? 'bg-sky-50 border-sky-600 text-sky-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Demographics */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900 pb-1 border-b border-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-600" />
              <span>Personal Demographics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Ananya Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (Aadhaar-Linked) *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-rose-700 focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Baseline & Emergency Contact */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900 pb-1 border-b border-slate-100 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-600" />
              <span>Emergency & Clinical Baseline</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="e.g. Penicillin, Sulfa, None"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chronic Conditions</label>
                <input
                  type="text"
                  name="chronicConditions"
                  value={formData.chronicConditions}
                  onChange={handleChange}
                  placeholder="e.g. Hypertension, Asthma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Family Member / Kin"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="+91 98765 11223"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Sovereign 6-Digit MPIN */}
          <div className="space-y-2">
            <h3 className="font-display font-bold text-sm text-slate-900 pb-1 border-b border-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Sovereign Security MPIN</span>
            </h3>
            <p className="text-xs text-slate-500">Your 6-digit MPIN protects your offline and online health vault.</p>
            <input
              type="password"
              maxLength={6}
              name="mpin"
              value={formData.mpin}
              onChange={handleChange}
              placeholder="123456"
              className="w-full max-w-xs px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-lg tracking-widest font-bold focus:ring-2 focus:ring-sky-500 focus:bg-white"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Generating Sovereign ID...</span>
            ) : (
              <>
                <span>Complete Registration & Generate Unit ID</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="text-center text-xs text-slate-500 pt-1">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setCurrentView('login')}
              className="text-sky-600 font-bold hover:underline"
            >
              Sign In Instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
