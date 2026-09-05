import React, { useState } from 'react';
import { ShieldCheck, User, Stethoscope, Building2, Lock, KeyRound, Fingerprint, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess, setCurrentView, onShowToast }) {
  const [role, setRole] = useState('patient');
  const [identifier, setIdentifier] = useState('ML-842-194-672');
  const [mpin, setMpin] = useState(['1', '2', '3', '4', '5', '6']);
  const [authMethod, setAuthMethod] = useState('mpin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMpinChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const newMpin = [...mpin];
    newMpin[index] = val.slice(-1);
    setMpin(newMpin);

    // Auto-advance focus
    if (val && index < 5) {
      const nextInput = document.getElementById(`mpin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleQuickDemo = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'doctor') {
      setIdentifier('DOC-912-384');
    } else if (selectedRole === 'hospital') {
      setIdentifier('HOSP-441-209');
    } else {
      setIdentifier('ML-842-194-672');
    }
    setMpin(['1', '2', '3', '4', '5', '6']);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your 9-digit Unit ID, ABHA number, or Email.');
      return;
    }

    const mpinStr = mpin.join('');
    if (authMethod === 'mpin' && mpinStr.length !== 6) {
      setError('Please enter your full 6-digit MPIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        role,
        identifier: identifier.trim(),
        mpin: mpinStr,
      });

      if (res.success) {
        onShowToast?.({
          type: 'success',
          title: 'Sign In Successful',
          message: `Welcome back, ${res.user.name || 'User'}!`
        });
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Invalid credentials.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4 sm:px-0">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-sky-950 p-6 text-white text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-600/30 border border-sky-400/40 flex items-center justify-center mx-auto mb-3 text-amber-300">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-display font-black text-2xl text-white">Sign In to MediLocker</h2>
          <p className="text-slate-300 text-xs mt-1">Sovereign Identity & Cryptographic Vault Access</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => handleQuickDemo('patient')}
            className={`py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 transition ${
              role === 'patient' ? 'border-sky-600 text-sky-700 bg-white' : 'border-transparent hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Patient</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('doctor')}
            className={`py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 transition ${
              role === 'doctor' ? 'border-sky-600 text-sky-700 bg-white' : 'border-transparent hover:bg-slate-100'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('hospital')}
            className={`py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-2 transition ${
              role === 'hospital' ? 'border-sky-600 text-sky-700 bg-white' : 'border-transparent hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hospital</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Identifier Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              {role === 'patient' ? '9-Digit Unit ID or ABHA Number' : role === 'doctor' ? 'Doctor ID / Email' : 'Hospital Registration ID'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'patient' ? 'e.g. ML-842-194-672' : 'e.g. DOC-912-384'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* Auth Method Selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMethod('mpin')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                authMethod === 'mpin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6-Digit MPIN
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod('passkey')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                authMethod === 'passkey' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Biometric / Passkey
            </button>
          </div>

          {/* MPIN Input Boxes */}
          {authMethod === 'mpin' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 uppercase tracking-wider">Enter 6-Digit MPIN</label>
                <button
                  type="button"
                  onClick={() => setMpin(['1', '2', '3', '4', '5', '6'])}
                  className="text-sky-600 hover:underline font-bold text-[11px]"
                >
                  Autofill Demo (123456)
                </button>
              </div>
              <div className="flex justify-between gap-2">
                {mpin.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`mpin-${idx}`}
                    type="password"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleMpinChange(idx, e.target.value)}
                    className="w-11 h-12 text-center text-lg font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-center space-y-2">
              <Fingerprint className="w-8 h-8 text-sky-600 mx-auto animate-pulse" />
              <div className="text-xs font-bold text-sky-900">WebAuthn Sovereign Passkey</div>
              <p className="text-[11px] text-sky-700">Authenticate instantly with Windows Hello, Face ID, or your physical security key.</p>
            </div>
          )}

          {/* Form Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In Securely</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Pre-fill Pills */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 font-semibold block mb-2">QUICK DEMO ROLES (1-CLICK)</span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('patient')}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('doctor')}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Doctor
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('hospital')}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
              >
                Hospital
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pt-2">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setCurrentView('signup')}
              className="text-sky-600 font-bold hover:underline"
            >
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
