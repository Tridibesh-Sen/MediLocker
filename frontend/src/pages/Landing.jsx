import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { useLanguage } from '../context/LanguageContext';

export function Landing() {
  const { t } = useLanguage();

  return (
    <>
      <Navbar isApp={false} />

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="eyebrow-dot" style={{ background: '#a68eb8' }}></span>
              <span>{t('eyebrow', 'A CALMER WAY TO MANAGE HEALTHCARE')}</span>
            </div>
            <h1>
              <span>{t('hero1', 'Your health story,')}</span>
              <br />
              <em style={{ fontStyle: 'normal' }}>{t('hero2', 'in one place.')}</em>
            </h1>
            <p className="hero-text">
              {t(
                'heroText',
                'MediLocker brings patient records, prescriptions, reports and medication routines into one beautifully organized digital experience.'
              )}
            </p>

            <div
              className="hero-buttons"
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: '12px',
                margin: '30px 0',
                maxWidth: '100%',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <Link
                className="primary-btn"
                to="/signup"
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  padding: '13px 18px',
                  fontSize: '15px'
                }}
              >
                {t('enter', 'Enter MediLocker ↗')}
              </Link>
              <a
                href="tel:102"
                className="sos-btn sos-hero-btn"
                id="sosHeroBtn"
                aria-label="Emergency Ambulance Call 102"
                style={{
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  padding: '13px 18px',
                  fontSize: '15px'
                }}
              >
                <span className="sos-pulse-ring"></span>
                <span className="sos-icon">🚨</span>
                <span>{t('sosHero', 'Emergency SOS 102')}</span>
              </a>
            </div>

            <div className="patient-note">
              <div className="mini-bubbles">
                <span>P</span>
                <span>D</span>
                <span>H</span>
              </div>
              <div>
                <strong>{t('designed', 'Designed around the patient')}</strong>
                <small>{t('records', 'Records stay organized from first visit to follow-up.')}</small>
              </div>
            </div>
          </div>

          {/* Hero Interactive Health Card */}
          <div className="health-card landing-card">
            <div className="card-topline">
              <span>PATIENT SOVEREIGN SPACE</span>
              <span className="live-dot" style={{ color: '#16a34a' }}>
                ● <span>{t('secured', 'secured')}</span>
              </span>
            </div>
            <h2>Unified Health Workspace</h2>

            <div className="workspace-steps">
              <div className="workspace-step">
                <span>01</span>
                <div>
                  <strong>Unique Unit ID & Identity Isolation</strong>
                  <p>
                    Sign up to generate an ABHA-aligned <code>ML-XXX-XXX-XXX</code> identifier. One unique user per email address with zero cross-leakage.
                  </p>
                </div>
              </div>
              <div className="workspace-step">
                <span>02</span>
                <div>
                  <strong>Multimodal Clinical AI Pipelines</strong>
                  <p>
                    Upload prescriptions, speech intake, or lab tests. Mistral AI extracts diagnoses, predicted conditions, and clinical test schedules.
                  </p>
                </div>
              </div>
              <div className="workspace-step">
                <span>03</span>
                <div>
                  <strong>Time-Bound 6-Digit Doctor Access</strong>
                  <p>
                    Doctor searches by Unit ID (revealing only Name & DOB). Patient generates a 15-min passcode to unlock records for 30m–7d.
                  </p>
                </div>
              </div>
            </div>

            <div className="landing-card-footer">
              <span>ABHA Aligned</span>
              <span>Real-Time Sync</span>
              <span>Time-Bound OTP</span>
              <span>Mistral Guardrails</span>
            </div>
          </div>
        </section>

        {/* Key Metrics & Trust Strip */}
        <section className="trust-strip">
          <div className="trust-item">
            <div className="trust-icon">🛡️</div>
            <div>
              <strong>{t('trust1Title', '100% Patient Control')}</strong>
              <small>{t('trust1Desc', 'Instant 1-click access revocation')}</small>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon" style={{ background: 'var(--sage)', color: '#465743' }}>
              ⚡
            </div>
            <div>
              <strong>{t('trust2Title', 'ACID Database Engine')}</strong>
              <small>{t('trust2Desc', 'Enterprise PostgreSQL storage')}</small>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon" style={{ background: 'var(--peach)', color: '#704e38' }}>
              🔑
            </div>
            <div>
              <strong>{t('trust3Title', '15-Min Dynamic OTP')}</strong>
              <small>{t('trust3Desc', '6-digit code for clinical access')}</small>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon" style={{ background: '#e0d8e8', color: '#3a284c' }}>
              🔒
            </div>
            <div>
              <strong>{t('trust4Title', 'Zero PHI Search Leak')}</strong>
              <small>{t('trust4Desc', 'Only Name & DOB on provider search')}</small>
            </div>
          </div>
        </section>

        {/* Detailed Features Columns Section */}
        <section className="features-detailed-section" id="features">
          <div className="section-heading">
            <span className="eyebrow">SOVEREIGN HEALTH ARCHITECTURE</span>
            <h2>Engineered for Clinical Continuity.</h2>
            <p>A unified digital ecosystem bridging patients, attending physicians, and accredited hospital networks.</p>
          </div>

          <div className="features-columns-grid">
            <article className="feature-column-card">
              <div>
                <div className="card-topline">
                  <span>PATIENT SOVEREIGN VAULT</span>
                  <span className="live-dot" style={{ color: '#16a34a' }}>
                    ● Live & Encrypted
                  </span>
                </div>
                <h3>Sovereign Vault & Ongoing Care</h3>

                <div className="workspace-steps">
                  <div className="workspace-step">
                    <span>01</span>
                    <div>
                      <strong>Consultation Date & Ongoing Course Tracking</strong>
                      <p>
                        Upload prescriptions and lab records with the verified clinical consultation date. Toggle ongoing medication status to keep completed courses archived.
                      </p>
                    </div>
                  </div>

                  <div className="workspace-step">
                    <span>02</span>
                    <div>
                      <strong>Prescriptions & Diagnostics Inline Viewer</strong>
                      <p>
                        Securely review uploaded medical records via authenticated inline viewer with instant MIME-typed streaming.
                      </p>
                    </div>
                  </div>

                  <div className="workspace-step">
                    <span>03</span>
                    <div>
                      <strong>Smart Daily To-Do & 2-Day Refill Alerts</strong>
                      <p>
                        Checklist renewal across Morning, Afternoon, and Night slots, paired with automated predictive warnings 2 days before medication stock runs out.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-card-footer">
                <span>Course Filter</span>
                <span>Inline Viewer</span>
                <span>Cascading Delete</span>
                <span>12 AM Renewal</span>
              </div>
            </article>

            <article className="feature-column-card">
              <div>
                <div className="card-topline">
                  <span>CLINICAL PRACTICE WORKSPACE</span>
                  <span className="live-dot" style={{ color: '#6366f1' }}>
                    ● Verified Providers
                  </span>
                </div>
                <h3>Consultations & Clinical Schedule</h3>

                <div className="workspace-steps">
                  <div className="workspace-step">
                    <span>01</span>
                    <div>
                      <strong>Nearby Doctors Directory & Booking</strong>
                      <p>
                        Explore verified practitioners filtered by 'Previously Consulted' and 'In Your Area' local geographic matching.
                      </p>
                    </div>
                  </div>

                  <div className="workspace-step">
                    <span>02</span>
                    <div>
                      <strong>Vaidya 30s OPD Synthesis & Double Coding</strong>
                      <p>
                        Instant 30-second patient chart briefing with dual NAMASTE + WHO ICD-11 Chapter 26 terminology and HL7 FHIR export.
                      </p>
                    </div>
                  </div>

                  <div className="workspace-step">
                    <span>03</span>
                    <div>
                      <strong>OPD Walk-In Touch Kiosk</strong>
                      <p>
                        Interactive anatomical body map with vernacular audio prompts generating instant queue tickets and sovereign vault files.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-card-footer">
                <span>Vaidya 30s Chart</span>
                <span>Touch Kiosk</span>
                <span>NAMASTE Standard</span>
                <span>HL7 FHIR R4</span>
              </div>
            </article>
          </div>
        </section>

        {/* Portals Section */}
        <section className="portals-section" id="portals">
          <div className="section-heading">
            <span className="eyebrow">{t('access', 'ACCESS PORTALS')}</span>
            <h2>{t('choosePortal', 'Choose your care portal.')}</h2>
            <p>{t('portalText', 'Every role gets a focused experience, while the patient\'s medical story remains at the center.')}</p>
          </div>

          <div className="portal-grid">
            <Link className="portal-card patient" to="/login?role=patient">
              <span className="portal-icon">♡</span>
              <div>
                <span>{t('patientPortal', 'Patient Portal')}</span>
                <small>{t('patientPortalDesc', 'Manage records, daily to-dos, cabinet inventory, and OTP delegations.')}</small>
              </div>
              <b>↗</b>
            </Link>

            <Link className="portal-card doctor" to="/login?role=doctor">
              <span className="portal-icon">✚</span>
              <div>
                <span>{t('doctorPortal', 'Doctor Portal')}</span>
                <small>{t('doctorPortalDesc', 'Search patients by Unit ID, review verified history, and conduct Vaidya OPD triage.')}</small>
              </div>
              <b>↗</b>
            </Link>

            <Link className="portal-card hospital" to="/login?role=hospital">
              <span className="portal-icon">▦</span>
              <div>
                <span>{t('hospitalPortal', 'Hospital Portal')}</span>
                <small>{t('hospitalPortalDesc', 'Institutional patient records coordination, staff allocations, and audit oversight.')}</small>
              </div>
              <b>↗</b>
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/logo-icon.png" alt="MediLocker" style={{ height: '44px', width: 'auto', borderRadius: '10px', objectFit: 'contain' }} />
          <div>
            <strong>MediLocker</strong> · <span>{t('footer', 'A sovereign digital sanctuary for organized healthcare.')}</span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.7 }}>
              Aligned with Ayushman Bharat Digital Mission (ABDM) architectural standards. Powered by live Supabase PostgreSQL.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'nowrap', whiteSpace: 'nowrap', alignItems: 'center' }}>
          <Link to="/login" style={{ color: 'var(--plum)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {t('signIn', 'Sign in')}
          </Link>
          <Link to="/signup" style={{ color: 'var(--plum)', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {t('signUp', 'Create Sovereign Account')}
          </Link>
        </div>
      </footer>
    </>
  );
}
