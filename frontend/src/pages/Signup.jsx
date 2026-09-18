import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';

export function Signup() {
  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    dob: '',
    gender: 'Prefer not to say',
    bloodGroup: 'Not specified',
    allergies: '',
    medications: '',
    emergencyContact: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    // Doctor specific
    doctorDegree: '',
    registrationNumber: '',
    specialization: 'General Medicine',
    clinicName: '',
    // Hospital specific
    hospitalName: '',
    hospitalRegistrationNumber: '',
  });

  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!consent) {
      setError('Please agree to the sovereign data storage terms.');
      return;
    }

    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      setError('Full Name, Email, Phone, and Password are required.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        role: role.toUpperCase(),
        name: formData.fullName.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        dob: formData.dob || undefined,
        gender: formData.gender,
        blood: formData.bloodGroup,
        bloodGroup: formData.bloodGroup,
        allergy: formData.allergies || undefined,
        allergies: formData.allergies || undefined,
        baselineAllergies: formData.allergies ? [formData.allergies] : [],
        medications: formData.medications || undefined,
        baselineMedications: formData.medications ? [formData.medications] : [],
        history: formData.medications || undefined,
        chronicConditions: formData.medications ? [formData.medications] : [],
        emergency: formData.emergencyContact || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyContacts: formData.emergencyContact ? [{ name: 'Emergency', phone: formData.emergencyContact }] : [],
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        pincode: formData.pincode || undefined,
        // Doctor
        doctorId: `DOC-${Date.now().toString().slice(-6)}`,
        doctorDegree: formData.doctorDegree || 'MBBS',
        degree: formData.doctorDegree || 'MBBS',
        registrationNumber: formData.registrationNumber || `REG-${Date.now().toString().slice(-6)}`,
        specialization: formData.specialization || 'General Medicine',
        clinicName: formData.clinicName || 'Clinical Workspace',
        // Hospital
        hospitalName: formData.hospitalName || formData.fullName.trim(),
        hospitalId: `HOS-${Date.now().toString().slice(-6)}`,
        license: formData.hospitalRegistrationNumber || `LIC-${Date.now().toString().slice(-6)}`,
        hospitalRegistrationNumber: formData.hospitalRegistrationNumber || `LIC-${Date.now().toString().slice(-6)}`,
      };

      const res = await signup(payload);
      if (res?.user) {
        setCreatedUser(res.user);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar isApp={false} />

      <main className="login-shell signup-shell">
        <section className="login-intro">
          <span className="eyebrow">REGISTRATION</span>
          <h1>Create your MediLocker.</h1>
          <p>Choose your account type. MediLocker connects patients, attending physicians, and hospital networks in real-time.</p>
        </section>

        <section className="login-card signup-card">
          <div className="role-heading">
            <span className="eyebrow">ACCOUNT TYPE</span>
            <h2>Who are you registering as?</h2>
          </div>

          <div className="signup-role-grid" id="signupRoleGrid">
            <label className={`signup-role ${role === 'patient' ? 'selected' : ''}`} onClick={() => setRole('patient')}>
              <input type="radio" name="role" value="patient" checked={role === 'patient'} readOnly />
              <span className="signup-role-icon">♡</span>
              <span>
                <strong>Patient</strong>
                <small>Personal health records</small>
              </span>
            </label>

            <label className={`signup-role ${role === 'doctor' ? 'selected' : ''}`} onClick={() => setRole('doctor')}>
              <input type="radio" name="role" value="doctor" checked={role === 'doctor'} readOnly />
              <span className="signup-role-icon">✚</span>
              <span>
                <strong>Doctor</strong>
                <small>Professional medical access</small>
              </span>
            </label>

            <label className={`signup-role ${role === 'hospital' ? 'selected' : ''}`} onClick={() => setRole('hospital')}>
              <input type="radio" name="role" value="hospital" checked={role === 'hospital'} readOnly />
              <span className="signup-role-icon">▦</span>
              <span>
                <strong>Hospital</strong>
                <small>Institutional care access</small>
              </span>
            </label>
          </div>

          {error && (
            <div
              style={{
                background: '#fee2e2',
                border: '1px solid #ef4444',
                color: '#b91c1c',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                marginBottom: '18px',
              }}
            >
              {error}
            </div>
          )}

          <form id="signupForm" onSubmit={handleSubmit}>
            <div className="signup-section">
              <div className="section-kicker">IDENTITY DETAILS</div>
              <h3>Primary Credentials</h3>
              <div className="form-grid">
                <label>
                  <span>Full Name *</span>
                  <input name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="e.g. Ramesh Verma" />
                </label>
                <label>
                  <span>Email Address *</span>
                  <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="ramesh@example.com" />
                </label>
                <label>
                  <span>Password *</span>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                  />
                </label>
                <label>
                  <span>Phone Number *</span>
                  <input name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" />
                </label>
                <label>
                  <span>Date of Birth</span>
                  <input name="dob" type="date" value={formData.dob} onChange={handleChange} />
                </label>
                <label>
                  <span>Gender</span>
                  <select name="gender" value={formData.gender} onChange={handleChange}>
                    <option>Prefer not to say</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  <span>Blood Group</span>
                  <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}>
                    <option>Not specified</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                    <option>O+</option>
                    <option>O-</option>
                  </select>
                </label>
              </div>
            </div>

            {role === 'patient' && (
              <div className="signup-section">
                <div className="section-kicker">PATIENT · CLINICAL PROFILE</div>
                <h3>Baseline Medical History</h3>
                <div className="form-grid">
                  <label className="wide">
                    <span>Known Allergies</span>
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                    />
                  </label>
                  <label className="wide">
                    <span>Current Regular Medications</span>
                    <textarea
                      name="medications"
                      value={formData.medications}
                      onChange={handleChange}
                      placeholder="e.g. Metformin 500mg (1-0-0), Telmisartan 40mg"
                    />
                  </label>
                  <label>
                    <span>Emergency Contact Phone</span>
                    <input
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      placeholder="+91 9876543210"
                    />
                  </label>
                  <label>
                    <span>City</span>
                    <input name="city" value={formData.city} onChange={handleChange} placeholder="e.g. New Delhi" />
                  </label>
                </div>
              </div>
            )}

            {role === 'doctor' && (
              <div className="signup-section">
                <div className="section-kicker">DOCTOR · CREDENTIALS</div>
                <h3>Professional Verification</h3>
                <div className="form-grid">
                  <label>
                    <span>Medical Degree</span>
                    <input name="doctorDegree" value={formData.doctorDegree} onChange={handleChange} placeholder="e.g. MBBS, MD, BAMS" />
                  </label>
                  <label>
                    <span>Medical Council Registration No. *</span>
                    <input
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      placeholder="e.g. MCI-2024-8891"
                    />
                  </label>
                  <label>
                    <span>Specialization</span>
                    <input
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder="e.g. Internal Medicine / Ayurveda"
                    />
                  </label>
                  <label>
                    <span>Clinic / Hospital Name</span>
                    <input name="clinicName" value={formData.clinicName} onChange={handleChange} placeholder="e.g. Max Care Clinic" />
                  </label>
                </div>
              </div>
            )}

            <div style={{ margin: '20px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <span>I agree to sovereign patient health data storage and the MediLocker Terms of Service.</span>
              </label>
            </div>

            <button className="primary-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '16px' }}>
              {loading ? 'Creating Sovereign Account...' : 'Complete Registration ↗'}
            </button>

            <p className="signup-prompt">
              <span>Already have an account?</span> <Link to="/login">Sign in here →</Link>
            </p>
          </form>
        </section>
      </main>

      {/* Success Modal with Unit ID */}
      {createdUser && (
        <div className="modal">
          <div className="modal-card">
            <div className="success-icon">✓</div>
            <h2 style={{ fontFamily: 'Manrope', fontSize: '24px', margin: '10px 0' }}>Account Created Successfully!</h2>
            <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
              Your permanent, sovereign MediLocker Unit ID has been registered on PostgreSQL:
            </p>
            <div className="generated-id">{createdUser.medilockerId || 'ML-ACCOUNT-ACTIVE'}</div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
              Keep this Unit ID safe. You will use it for doctor consultations and clinical access.
            </p>
            <button className="primary-btn" type="button" onClick={() => navigate('/dashboard')} style={{ width: '100%' }}>
              Proceed to Dashboard ↗
            </button>
          </div>
        </div>
      )}

      <footer>
        <span>© 2026 MediLocker</span>
        <span>A digital home for organized healthcare.</span>
        <span>ABDM & HIPAA Compliant</span>
      </footer>
    </>
  );
}
