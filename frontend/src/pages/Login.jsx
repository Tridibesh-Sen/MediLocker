import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') || 'patient').toUpperCase();
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [unitId, setUnitId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        email: email.trim(),
        role,
        ...(password ? { password } : {}),
        ...(unitId ? { medilockerId: unitId.trim() } : {}),
      };

      // If user only entered unitId and no password, pass it as medilockerId or password
      if (!payload.password && payload.medilockerId) {
        payload.password = payload.medilockerId;
      }

      await login(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleInfo = () => {
    switch (role) {
      case 'DOCTOR':
        return {
          symbol: '✚',
          title: 'Doctor Portal Login',
          subtitle: 'Sign in to access patient records, review clinical timelines, and conduct Vaidya triage.',
        };
      case 'HOSPITAL':
        return {
          symbol: '▦',
          title: 'Hospital Portal Login',
          subtitle: 'Sign in for institutional patient management, staff doctors coordination, and records archival.',
        };
      default:
        return {
          symbol: '♡',
          title: 'Patient Login',
          subtitle: 'Sign in to manage your medical records, daily to-dos, and sovereign vault.',
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <>
      <Navbar isApp={false} />

      <main className="login-shell">
        <section className="login-intro">
          <span className="eyebrow">WELCOME TO MEDILOCKER</span>
          <h1>Choose your care portal.</h1>
          <p>Every role gets a focused experience, while the patient's medical story remains at the center.</p>
        </section>

        <section className="login-card">
          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${role === 'PATIENT' ? 'active' : ''}`}
              onClick={() => setRole('PATIENT')}
            >
              Patient
            </button>
            <button
              type="button"
              className={`role-tab ${role === 'DOCTOR' ? 'active' : ''}`}
              onClick={() => setRole('DOCTOR')}
            >
              Doctor
            </button>
            <button
              type="button"
              className={`role-tab ${role === 'HOSPITAL' ? 'active' : ''}`}
              onClick={() => setRole('HOSPITAL')}
            >
              Hospital
            </button>
          </div>

          <div className="login-heading">
            <span className="role-symbol">{roleInfo.symbol}</span>
            <h2>{roleInfo.title}</h2>
          </div>
          <p className="login-subtitle">{roleInfo.subtitle}</p>

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

          <form id="loginForm" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label>
              <span>Password or Security MPIN</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            <label>
              <span>Unique Unit ID (Optional)</span>
              <input
                type="text"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                placeholder="ML-XXXX-XXXX"
                autoComplete="off"
              />
            </label>

            <button className="primary-btn full" type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign in ↗'}
            </button>

            <p className="signup-prompt">
              <span>New to MediLocker?</span> <Link to="/signup">Create your sovereign account →</Link>
            </p>
          </form>
        </section>
      </main>

      <footer>
        <span>© 2026 MediLocker</span>
        <span>A digital home for organized healthcare.</span>
        <span>Hardware-Backed Security</span>
      </footer>
    </>
  );
}
