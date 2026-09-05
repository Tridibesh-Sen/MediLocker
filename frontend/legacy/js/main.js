(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const initials = (n) => (n || 'User').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const currentT = () => window.T?.[localStorage.getItem('medilockerLanguage') || 'en'] || window.T?.en || {};

  // Language and location
  function bindLanguage() {
    const s = document.getElementById('languageSelect');
    if (!s) return;
    s.value = localStorage.getItem('medilockerLanguage') || 'en';
    s.addEventListener('change', (e) => window.applyLanguage?.(e.target.value));
  }

  // Accessibility font resize
  function bindAccessibility() {
    document.querySelectorAll('.font-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.font-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.resize;
        if (mode === 'dec') {
          document.documentElement.style.fontSize = '14px';
        } else if (mode === 'inc') {
          document.documentElement.style.fontSize = '18px';
        } else {
          document.documentElement.style.fontSize = '16px';
        }
      });
    });
  }

  function bindLocation() {
    document.querySelectorAll('#locationBtn').forEach((b) =>
      b.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by this browser.');
          return;
        }
        const old = b.innerHTML;
        b.disabled = true;
        b.innerHTML = '⌖ Detecting…';
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude.toFixed(4);
            const lon = pos.coords.longitude.toFixed(4);
            localStorage.setItem('medilockerLocation', `${lat}, ${lon}`);
            document.querySelectorAll('#locationBtn span').forEach((x) => (x.textContent = `${lat}, ${lon}`));
            b.disabled = false;
            b.innerHTML = old;
            alert('Location permission granted. Your current location has been set.');
          },
          (err) => {
            b.disabled = false;
            b.innerHTML = old;
            alert(err.code === 1 ? 'Location permission was denied.' : 'Unable to detect your location.');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      })
    );
    const v = localStorage.getItem('medilockerLocation');
    if (v) document.querySelectorAll('#locationBtn span').forEach((x) => (x.textContent = v));
  }

  function bindLogout() {
    document.querySelectorAll('[data-logout]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.MediAPI) window.MediAPI.clearSession();
        location.href = 'index.html';
      })
    );
  }

  // Login
  function updateLoginRole(role) {
    const t = currentT();
    const m = {
      patient: ['patientLogin', 'patientLoginText', '♡'],
      doctor: ['doctorLogin', 'doctorLoginText', '✚'],
      hospital: ['hospitalLogin', 'hospitalLoginText', '▦'],
    };
    const title = document.getElementById('loginTitle');
    const sub = document.getElementById('loginSubtitle');
    const sym = document.getElementById('roleSymbol');
    if (!title || !sub) return;
    const x = m[role] || m.patient;
    title.textContent = t[x[0]] || { patient: 'Patient login', doctor: 'Doctor login', hospital: 'Hospital login' }[role];
    sub.textContent = t[x[1]] || {
      patient: 'Sign in to manage your medical records and medication routine.',
      doctor: 'Sign in to access the doctor workspace.',
      hospital: 'Sign in to access the hospital workspace.',
    }[role];
    if (sym) sym.textContent = x[2];
    document.querySelectorAll('.role-tab').forEach((b) => b.classList.toggle('active', b.dataset.role === role));
  }

  function bindLogin() {
    let role = new URLSearchParams(location.search).get('role') || 'patient';
    if (!['patient', 'doctor', 'hospital'].includes(role)) role = 'patient';
    window.currentRole = role;

    document.querySelectorAll('.role-tab').forEach((b) =>
      b.addEventListener('click', () => {
        window.currentRole = b.dataset.role;
        updateLoginRole(window.currentRole);
        history.replaceState({}, '', `login.html?role=${window.currentRole}`);
      })
    );
    updateLoginRole(role);

    // Auth method tabs
    const tabs = document.querySelectorAll('.auth-method-tab');
    const passwordForm = document.getElementById('loginForm');
    const mpinForm = document.getElementById('mpinLoginForm');
    const bioForm = document.getElementById('biometricLoginForm');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const method = tab.dataset.method;
        passwordForm?.classList.toggle('hidden', method !== 'password');
        mpinForm?.classList.toggle('hidden', method !== 'mpin');
        bioForm?.classList.toggle('hidden', method !== 'biometric');
      });
    });

    // Password login
    passwordForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value.trim();
      const password = document.getElementById('loginPassword')?.value;
      const btn = document.getElementById('loginSubmitBtn');
      if (!email || !password) return;

      try {
        btn.disabled = true;
        btn.textContent = 'Verifying credentials...';
        const res = await window.MediAPI.loginPassword(email, password);
        const user = res.data?.user;
        const target = user?.role === 'DOCTOR' ? 'doctor.html' : user?.role === 'HOSPITAL' ? 'hospital.html' : 'dashboard.html';
        location.href = target;
      } catch (err) {
        alert(err.message || 'Login failed. Please check your email and password.');
        btn.disabled = false;
        btn.textContent = 'Sign in with Password ↗';
      }
    });

    // MPIN progression
    const mpinBoxes = document.querySelectorAll('.mpin-box');
    mpinBoxes.forEach((box, idx) => {
      box.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length === 1 && idx < mpinBoxes.length - 1) {
          mpinBoxes[idx + 1].focus();
        }
        gatherMpin();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) {
          mpinBoxes[idx - 1].focus();
        }
      });
    });

    function gatherMpin() {
      let code = '';
      mpinBoxes.forEach((b) => (code += b.value));
      const hidden = document.getElementById('fullMpin');
      if (hidden) hidden.value = code;
      return code;
    }

    mpinForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const unitId = document.getElementById('mpinUnitId')?.value.trim().toUpperCase();
      const mpin = gatherMpin();
      const btn = document.getElementById('mpinSubmitBtn');

      if (!unitId || mpin.length !== 6) {
        alert('Please enter your 9-digit Unit ID and the complete 6-digit MPIN.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Verifying MPIN...';
        const res = await window.MediAPI.loginMpin(unitId, mpin);
        const user = res.data?.user;
        const target = user?.role === 'DOCTOR' ? 'doctor.html' : user?.role === 'HOSPITAL' ? 'hospital.html' : 'dashboard.html';
        location.href = target;
      } catch (err) {
        alert(err.message || 'Invalid MPIN or Unit ID.');
        btn.disabled = false;
        btn.textContent = 'Unlock Locker with MPIN ↗';
      }
    });

    // Biometrics
    document.getElementById('triggerBiometricBtn')?.addEventListener('click', async () => {
      const email = document.getElementById('bioEmail')?.value.trim();
      if (!email) {
        alert('Please enter your registered email address first.');
        return;
      }

      try {
        const optRes = await window.MediAPI.getWebAuthnOptions(email);
        const options = optRes.data?.options;
        if (!options) throw new Error('Biometrics not enrolled for this account.');

        if (!navigator.credentials) {
          throw new Error('Biometric WebAuthn is not supported in this browser.');
        }

        options.challenge = Uint8Array.from(atob(options.challenge.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
        if (options.allowCredentials) {
          options.allowCredentials.forEach((c) => {
            c.id = Uint8Array.from(atob(c.id.replace(/-/g, '+').replace(/_/g, '/')), (x) => x.charCodeAt(0));
          });
        }

        const credential = await navigator.credentials.get({ publicKey: options });
        if (!credential) throw new Error('Biometric verification cancelled.');

        const verifyRes = await window.MediAPI.verifyWebAuthn(email, {
          id: credential.id,
          rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          response: {
            authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
            clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
            signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
          },
        });

        const user = verifyRes.data?.user;
        const target = user?.role === 'DOCTOR' ? 'doctor.html' : user?.role === 'HOSPITAL' ? 'hospital.html' : 'dashboard.html';
        location.href = target;
      } catch (err) {
        alert(err.message || 'Biometric authentication was not completed.');
      }
    });
  }

  // Signup
  function setSignupRole(role) {
    const sections = {
      patient: document.getElementById('patientFields'),
      doctor: document.getElementById('doctorFields'),
      hospital: document.getElementById('hospitalFields'),
    };
    Object.entries(sections).forEach(([k, el]) => el?.classList.toggle('hidden', k !== role));
    document.querySelectorAll('input[name=role]').forEach((r) => r.closest('.signup-role')?.classList.toggle('selected', r.value === role));
    document.querySelectorAll('[data-required]').forEach((el) => {
      el.required = el.dataset.required === role;
    });
    document.body.dataset.signupRole = role;
  }

  function bindSignup() {
    const f = document.getElementById('signupForm');
    if (!f) return;
    let role = 'patient';
    document.querySelectorAll('input[name=role]').forEach((r) =>
      r.addEventListener('change', () => {
        role = r.value;
        setSignupRole(role);
      })
    );
    setSignupRole(role);

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      setSignupRole(role);
      if (!f.reportValidity()) return;

      const fd = new FormData(f);
      const password = fd.get('password');
      const mpin = fd.get('mpin');
      const submitBtn = document.getElementById('signupSubmitBtn');

      if (!password || String(password).length < 6) {
        alert('Password must be at least 6 characters.');
        return;
      }
      if (!mpin || !/^\d{6}$/.test(String(mpin))) {
        alert('MPIN must be exactly 6 numeric digits.');
        return;
      }

      let payload = { role, password, mpin };

      if (role === 'patient') {
        Object.assign(payload, {
          fullName: fd.get('patientName'),
          email: fd.get('patientEmail'),
          phone: fd.get('patientPhone'),
          dateOfBirth: fd.get('dob') || undefined,
          gender: fd.get('gender'),
          bloodGroup: fd.get('blood'),
          governmentId: fd.get('govid'),
          insuranceInfo: fd.get('insurance'),
          allergies: fd.get('allergy'),
          currentMedications: fd.get('medications'),
          medicalHistory: fd.get('history'),
          emergencyContact: fd.get('emergency'),
          address: fd.get('address'),
          city: fd.get('city'),
          state: fd.get('state'),
          pincode: fd.get('pincode'),
        });
      } else if (role === 'doctor') {
        Object.assign(payload, {
          fullName: fd.get('doctorName'),
          email: fd.get('doctorEmail'),
          phone: fd.get('doctorPhone'),
          councilRegistrationNumber: fd.get('registrationNumber'),
          specialization: fd.get('specialization'),
          experienceYears: Number(fd.get('experience')) || 0,
          clinicName: fd.get('clinicName'),
          clinicAddress: fd.get('clinicAddress'),
          city: fd.get('doctorCity'),
          state: fd.get('doctorState'),
        });
      } else {
        Object.assign(payload, {
          hospitalName: fd.get('hospitalName'),
          email: fd.get('hospitalEmail'),
          phone: fd.get('hospitalPhone'),
          licenseNumber: fd.get('hospitalLicense'),
          hospitalType: fd.get('hospitalType'),
          bedCapacity: Number(fd.get('beds')) || 0,
          authorizedRepresentative: fd.get('representative'),
          address: fd.get('hospitalAddress'),
          city: fd.get('hospitalCity'),
          state: fd.get('hospitalState'),
        });
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating MediLocker Unit ID...';

        const res = await window.MediAPI.signup(payload);
        const unitId = res.data?.user?.medilockerId || res.data?.user?.unit || 'ML-SUCCESS';

        document.getElementById('generatedUnit').textContent = unitId;
        document.getElementById('unitMessage').innerHTML = `
          Your sovereign <strong>${esc(role)}</strong> account is ready.<br>
          Save your Unique Unit ID: <strong>${esc(unitId)}</strong>.<br>
          Use it with your <strong>6-digit MPIN</strong> or password to sign in.
        `;
        document.getElementById('unitModal')?.classList.remove('hidden');
      } catch (err) {
        alert(err.message || 'Registration failed. Please check the entered information.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create account & generate Unit ID ↗';
      }
    });

    document.getElementById('closeUnit')?.addEventListener('click', () => document.getElementById('unitModal')?.classList.add('hidden'));
    document.getElementById('goLogin')?.addEventListener('click', () => (location.href = 'login.html'));
  }

  // Dashboard
  async function bindPatientDashboard() {
    const user = window.MediAPI.getCurrentUser();
    if (!user) {
      location.href = 'login.html?role=patient';
      return;
    }

    document.querySelectorAll('[data-user-name]').forEach((e) => (e.textContent = user.name || 'Patient'));
    document.querySelectorAll('[data-user-email]').forEach((e) => (e.textContent = user.email || ''));
    document.querySelectorAll('[data-user-unit]').forEach((e) => (e.textContent = user.medilockerId || '—'));
    document.querySelectorAll('[data-user-initials]').forEach((e) => (e.textContent = initials(user.name)));

    try {
      const todoRes = await window.MediAPI.getTodayTodos();
      const todos = todoRes.data?.todos || [];
      const streak = todoRes.data?.streakCount || 0;
      const progress = todoRes.data?.progressPercentage || 0;

      const streakBadge = document.getElementById('adherenceStreakBadge');
      if (streakBadge) {
        streakBadge.innerHTML = `🔥 <span>${streak} Day Streak (${progress}%)</span>`;
      }

      const doneCount = todos.filter((t) => t.isCompleted).length;
      const progressEl = document.getElementById('dashboardTodoProgress');
      if (progressEl) progressEl.textContent = `${doneCount} / ${todos.length}`;

      const doneCountBadge = document.getElementById('doneCount');
      if (doneCountBadge) doneCountBadge.textContent = `${doneCount} / ${todos.length}`;

      const todoFill = document.getElementById('todoProgress');
      if (todoFill) todoFill.style.width = `${progress}%`;

      const taskList = document.getElementById('todayTaskList');
      if (taskList) {
        if (todos.length === 0) {
          taskList.innerHTML = `
            <p style="color:#7c7480; font-size:13.5px; padding:12px 0; margin:0;">
              No medication doses scheduled for today. Upload a prescription or add medication to populate your schedule.
            </p>`;
        } else {
          taskList.innerHTML = todos
            .map(
              (item) => `
            <label class="med-task" style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f1ecf4; cursor:pointer;">
              <input type="checkbox" data-todo-id="${item.id}" ${item.isCompleted ? 'checked' : ''} style="width:18px; height:18px; accent-color:#6b4d7e;">
              <div style="flex:1;">
                <strong style="display:block; font-size:14px; text-decoration:${item.isCompleted ? 'line-through' : 'none'}; color:${item.isCompleted ? '#877c8d' : '#2c2730'};">
                  ${esc(item.taskName)}
                </strong>
                <small style="color:#7c7480;">Slot: ${esc(item.timeSlot)} · Dosage: ${esc(item.dosage || '1 dose')}</small>
              </div>
            </label>`
            )
            .join('');

          taskList.querySelectorAll('input[type=checkbox]').forEach((cb) => {
            cb.addEventListener('change', async (e) => {
              const id = e.target.dataset.todoId;
              try {
                await window.MediAPI.toggleTodoItem(id);
                bindPatientDashboard();
              } catch (err) {
                alert('Could not update task status: ' + err.message);
                e.target.checked = !e.target.checked;
              }
            });
          });
        }
      }
    } catch (err) {
      console.warn('To-Do fetch fallback:', err);
    }

    try {
      const refillRes = await window.MediAPI.getRefills();
      const refills = refillRes.data?.refills || [];
      const lowStock = refills.find((r) => r.isLowStock || r.daysRemaining <= 2);

      const alertRoot = document.getElementById('refillAlertRoot');
      if (alertRoot && lowStock) {
        alertRoot.className = 'refill-alert-banner';
        alertRoot.innerHTML = `
          <div class="refill-alert-content">
            <h4>⚠️ MEDICATION REFILL ALERT: ${esc(lowStock.drugName)}</h4>
            <p>You have only <strong>${lowStock.currentStock} units (${lowStock.daysRemaining} days)</strong> remaining. Stock will deplete soon.</p>
          </div>
          <a href="${esc(lowStock.reorderUrl || 'https://www.1mg.com')}" target="_blank" class="refill-buy-btn">
            Order on 1mg / Apollo ↗
          </a>
        `;
      }
    } catch (err) {
      console.warn('Refill alert fetch fallback:', err);
    }

    const feelingPills = document.querySelectorAll('.feeling-pill');
    feelingPills.forEach((btn) => {
      btn.addEventListener('click', async () => {
        feelingPills.forEach((p) => p.classList.remove('selected'));
        btn.classList.add('selected');
        const status = btn.dataset.status;

        try {
          await window.MediAPI.submitFeeling(status);
          const badge = document.getElementById('feelingSavedBadge');
          if (badge) badge.classList.remove('hidden');
        } catch (err) {
          alert('Could not record feeling check-in: ' + err.message);
        }
      });
    });

    try {
      const recRes = await window.MediAPI.listRecords();
      const records = recRes.data?.records || [];
      const recCount = document.getElementById('dashboardRecordCount');
      if (recCount) recCount.textContent = records.length;
    } catch (err) {
      console.warn('Records count fallback:', err);
    }

    try {
      const cabRes = await window.MediAPI.getCabinet();
      const cabinet = cabRes.data?.cabinet || [];
      const cabCount = document.getElementById('dashboardCabinetCount');
      if (cabCount) cabCount.textContent = cabinet.length;
    } catch (err) {
      console.warn('Cabinet count fallback:', err);
    }
  }

  // Records
  async function bindPatientRecords() {
    const container = document.getElementById('timelineContainer');
    const emptyState = document.getElementById('emptyRecordsState');
    if (!container) return;

    try {
      const res = await window.MediAPI.getTimeline();
      const timeline = res.data?.timeline || [];

      if (timeline.length === 0) {
        container.innerHTML = '';
        emptyState?.classList.remove('hidden');
        return;
      }

      emptyState?.classList.add('hidden');
      container.innerHTML = timeline
        .map((group) => {
          return `
          <div class="timeline-card-item">
            <span class="timeline-date-chip">Consultation: ${esc(group.date)}</span>
            <div class="timeline-group-cards" style="display:grid; gap:12px; margin-top:8px;">
              ${group.records
                .map(
                  (rec) => `
                <div class="record-card" data-record-id="${rec.id}" data-type="${rec.type}" data-issuer="${esc(rec.doctorName || '')}" style="cursor:pointer; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:18px; box-shadow:0 2px 8px rgba(0,56,130,0.04); transition:all 0.2s;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                      <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
                        <span class="status-pill" style="display:inline-block;">${esc(rec.type)}</span>
                        ${rec.doctorName ? '<span class="issued-verified-pill">✓ DigiLocker Verified Issuer</span>' : '<span class="status-pill" style="background:#f1f5f9; color:#475569;">☁ DigiLocker Drive</span>'}
                      </div>
                      <h3 style="margin:2px 0 4px 0; font-size:16px; font-weight:800; color:#003882;">${esc(rec.title)}</h3>
                      <p style="margin:0; font-size:13px; color:#64748b;">${esc(rec.doctorName ? 'Issued by ' + rec.doctorName : 'Self-Uploaded to DigiLocker')} · Consultation: <strong>${esc(rec.normalizedDate)}</strong></p>
                    </div>
                    <span style="font-size:18px; color:#003882; font-weight:700;">↗</span>
                  </div>
                  ${
                    rec.diagnoses && rec.diagnoses.length > 0
                      ? `
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:12px;">
                      ${rec.diagnoses.map((d) => `<span class="ai-chip" style="font-size:11px; padding:3px 8px;">${esc(d)}</span>`).join('')}
                    </div>`
                      : ''
                  }
                </div>`
                )
                .join('')}
            </div>
          </div>
        `;
        })
        .join('');

      document.querySelectorAll('.digi-tab-btn').forEach((b) => {
        b.addEventListener('click', () => {
          document.querySelectorAll('.digi-tab-btn').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          const vault = b.dataset.vault;
          document.querySelectorAll('.record-card').forEach((card) => {
            if (vault === 'all') {
              card.style.display = 'block';
            } else if (vault === 'issued') {
              card.style.display = card.dataset.issuer ? 'block' : 'none';
            } else if (vault === 'drive') {
              card.style.display = !card.dataset.issuer ? 'block' : 'none';
            }
          });
        });
      });

      document.querySelectorAll('.filter').forEach((b) => {
        b.addEventListener('click', () => {
          document.querySelectorAll('.filter').forEach((x) => x.classList.remove('active'));
          b.classList.add('active');
          const filter = b.dataset.filter;
          document.querySelectorAll('.record-card').forEach((card) => {
            card.style.display = filter === 'all' || card.dataset.type === filter ? 'block' : 'none';
          });
        });
      });

      document.querySelectorAll('.record-card').forEach((card) => {
        card.addEventListener('click', async () => {
          const id = card.dataset.recordId;
          try {
            const detailRes = await window.MediAPI.getRecordById(id);
            const record = detailRes.data?.record;
            if (!record) return;

            document.getElementById('modalRecordTitle').textContent = record.title || 'Clinical Record';
            document.getElementById('modalRecordDate').textContent = record.normalizedDate || 'ddmmyyyy';
            document.getElementById('modalRecordDoctor').textContent = `Prescribed by ${record.doctorName || 'Medical Officer'}`;

            const docLink = document.getElementById('modalDownloadLink');
            if (docLink) {
              docLink.href = record.fileUrl || '#';
            }

            const diagList = document.getElementById('modalDiagnosesList');
            if (diagList) {
              diagList.innerHTML = (record.diagnoses || [])
                .map((d) => `<span class="ai-chip" style="font-size:12px;">${esc(d)}</span>`)
                .join('');
            }

            const medList = document.getElementById('modalMedicationsList');
            if (medList) {
              medList.innerHTML = (record.medications || [])
                .map(
                  (m) => `
                <div style="background:#faf8fc; border:1px solid #ebe2ef; border-radius:10px; padding:10px; font-size:13px;">
                  <strong style="color:#462c57;">${esc(m.drugName)}</strong> · ${esc(m.dosage || 'Standard')} (${esc(m.frequency || 'Daily')})
                  <div style="color:#7c7480; font-size:11.5px; margin-top:2px;">Duration: ${esc(m.durationDays ? m.durationDays + ' days' : 'As prescribed')} · Timing: ${esc(m.timeSlot || 'General')}</div>
                </div>`
                )
                .join('');
            }

            const notesEl = document.getElementById('modalNotesText');
            if (notesEl) {
              notesEl.textContent = record.doctorNotes || 'No specific clinical instructions attached.';
            }

            document.getElementById('recordDetailModal')?.classList.remove('hidden');
          } catch (err) {
            alert('Could not fetch record details: ' + err.message);
          }
        });
      });

      document.getElementById('closeRecordModal')?.addEventListener('click', () => {
        document.getElementById('recordDetailModal')?.classList.add('hidden');
      });
    } catch (err) {
      container.innerHTML = `<p style="color:#b91c1c;">Failed to load timeline records: ${err.message}</p>`;
    }
  }

  // Upload
  function bindUpload() {
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const dropZone = document.getElementById('dropZone');
    const saveBtn = document.getElementById('saveUploadBtn');
    const progressCard = document.getElementById('aiUploadProgress');
    const resultCard = document.getElementById('aiExtractionResult');

    if (!fileInput || !saveBtn) return;

    fileInput.addEventListener('change', () => {
      if (fileName) fileName.textContent = fileInput.files[0] ? fileInput.files[0].name : 'No file selected';
    });

    if (dropZone) {
      ['dragenter', 'dragover'].forEach((e) =>
        dropZone.addEventListener(e, (x) => {
          x.preventDefault();
          dropZone.classList.add('dragging');
        })
      );
      ['dragleave', 'drop'].forEach((e) =>
        dropZone.addEventListener(e, (x) => {
          x.preventDefault();
          dropZone.classList.remove('dragging');
        })
      );
      dropZone.addEventListener('drop', (x) => {
        const files = x.dataTransfer.files;
        if (files.length && fileInput) {
          try {
            fileInput.files = files;
          } catch (_) {}
          if (fileName) fileName.textContent = files[0].name;
        }
      });
    }

    saveBtn.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) {
        alert('Please select a prescription or lab report document first.');
        return;
      }

      const recordType = document.getElementById('recordTypeSelect')?.value || 'PRESCRIPTION';

      try {
        saveBtn.disabled = true;
        progressCard?.classList.remove('hidden');
        resultCard?.classList.add('hidden');

        const res = await window.MediAPI.uploadRecord(file, recordType);
        const record = res.data?.record;

        progressCard?.classList.add('hidden');
        resultCard?.classList.remove('hidden');

        document.getElementById('extractedRecordTitle').textContent = record?.title || 'Extracted Document';
        document.getElementById('extractedRecordDate').textContent = `Consultation Date: ${record?.normalizedDate || 'ddmmyyyy'}`;

        const diagContainer = document.getElementById('extractedDiagnosesList');
        if (diagContainer) {
          diagContainer.innerHTML = (record?.diagnoses || ['General Medical Consultation'])
            .map((d) => `<span class="ai-chip">${esc(d)}</span>`)
            .join('');
        }

        const medContainer = document.getElementById('extractedMedicationsList');
        if (medContainer) {
          medContainer.innerHTML = (record?.medications || [])
            .map(
              (m) => `
            <div style="background:#faf8fc; border:1px solid #e7dfed; border-radius:10px; padding:10px; font-size:13px;">
              <strong>${esc(m.drugName)}</strong> · ${esc(m.dosage || 'Standard')} (${esc(m.frequency || 'Daily')})
              <div style="color:#7c7480; font-size:11.5px;">Added to ${esc(m.timeSlot || 'daily')} schedule</div>
            </div>`
            )
            .join('');
        }

        saveBtn.disabled = false;
        alert('Prescription successfully uploaded! Medi-AI has synchronized your timeline and daily To-Do checklist.');
      } catch (err) {
        progressCard?.classList.add('hidden');
        saveBtn.disabled = false;
        alert('Upload failed: ' + err.message);
      }
    });
  }

  // Medications and cabinet
  async function bindMedicationsPage() {
    const user = window.MediAPI.getCurrentUser();
    if (!user) {
      location.href = 'login.html?role=patient';
      return;
    }

    try {
      const todoRes = await window.MediAPI.getTodayTodos();
      const todos = todoRes.data?.todos || [];
      const streak = todoRes.data?.streakCount || 0;
      const progress = todoRes.data?.progressPercentage || 0;

      const streakBadge = document.getElementById('medAdherenceBadge');
      if (streakBadge) streakBadge.innerHTML = `🔥 <span>${streak} Day Streak (${progress}%)</span>`;

      const doneCount = todos.filter((t) => t.isCompleted).length;
      const doneLabel = document.getElementById('medDoneCount');
      if (doneLabel) doneLabel.textContent = `${doneCount} / ${todos.length}`;

      const pBar = document.getElementById('medProgressBar');
      if (pBar) pBar.style.width = `${progress}%`;

      const slots = {
        MORNING: document.getElementById('slotMorningList'),
        AFTERNOON: document.getElementById('slotAfternoonList'),
        NIGHT: document.getElementById('slotNightList'),
      };

      Object.keys(slots).forEach((s) => {
        const listEl = slots[s];
        if (!listEl) return;
        const slotItems = todos.filter((t) => (t.timeSlot || 'MORNING').toUpperCase() === s);

        if (slotItems.length === 0) {
          listEl.innerHTML = `<p style="font-size:13px; color:#877c8d; margin:0;">No doses scheduled for this time slot.</p>`;
        } else {
          listEl.innerHTML = slotItems
            .map(
              (item) => `
            <label class="med-task" style="display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid #f1ecf4; cursor:pointer;">
              <input type="checkbox" data-todo-id="${item.id}" ${item.isCompleted ? 'checked' : ''} style="width:18px; height:18px; accent-color:#6b4d7e;">
              <div style="flex:1;">
                <strong style="text-decoration:${item.isCompleted ? 'line-through' : 'none'}; color:${item.isCompleted ? '#877c8d' : '#2c2730'};">
                  ${esc(item.taskName)}
                </strong>
                <small style="color:#7c7480; display:block;">Dosage: ${esc(item.dosage || '1 unit')}</small>
              </div>
            </label>`
            )
            .join('');

          listEl.querySelectorAll('input[type=checkbox]').forEach((cb) => {
            cb.addEventListener('change', async (e) => {
              try {
                await window.MediAPI.toggleTodoItem(e.target.dataset.todoId);
                bindMedicationsPage();
              } catch (err) {
                alert('Could not toggle task: ' + err.message);
                e.target.checked = !e.target.checked;
              }
            });
          });
        }
      });
    } catch (err) {
      console.warn('Medications To-Do fallback:', err);
    }

    try {
      const refillRes = await window.MediAPI.getRefills();
      const refills = refillRes.data?.refills || [];
      const refillContainer = document.getElementById('refillListContainer');

      if (refillContainer) {
        if (refills.length === 0) {
          refillContainer.innerHTML = `
            <div style="padding: 16px; background:#faf8fc; border-radius:14px; color:#7c7480; font-size:13.5px;">
              No active prescriptions requiring refills.
            </div>`;
        } else {
          refillContainer.innerHTML = refills
            .map(
              (r) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#ffffff; border:1px solid ${r.isLowStock ? '#fde68a' : '#e5dceb'}; border-radius:14px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
              <div>
                <strong style="font-size:15px; color:#2c2730;">${esc(r.drugName)}</strong>
                <p style="margin:2px 0 0 0; font-size:12.5px; color:#6e6475;">
                  Stock Remaining: <strong>${r.currentStock} units</strong> (${r.daysRemaining} days remaining)
                </p>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <button class="primary-btn ghost update-stock-btn" data-refill-id="${r.id}" style="padding:6px 12px; font-size:12px;">
                  Declare Stock
                </button>
                <a href="${esc(r.reorderUrl || 'https://www.1mg.com')}" target="_blank" class="refill-buy-btn" style="padding:6px 12px; font-size:12px;">
                  Order ↗
                </a>
              </div>
            </div>`
            )
            .join('');

          refillContainer.querySelectorAll('.update-stock-btn').forEach((b) => {
            b.addEventListener('click', async () => {
              const id = b.dataset.refillId;
              const qty = prompt('Enter the quantity purchased/available (pills/units):');
              if (qty && !isNaN(Number(qty))) {
                try {
                  await window.MediAPI.updateRefillStock(id, Number(qty));
                  bindMedicationsPage();
                } catch (err) {
                  alert('Failed to update stock: ' + err.message);
                }
              }
            });
          });
        }
      }
    } catch (err) {
      console.warn('Refill list fallback:', err);
    }

    try {
      const cabRes = await window.MediAPI.getCabinet();
      const cabinet = cabRes.data?.cabinet || [];
      const cabinetContainer = document.getElementById('cabinetListContainer');

      if (cabinetContainer) {
        if (cabinet.length === 0) {
          cabinetContainer.innerHTML = `
            <div style="padding: 20px; background:#faf8fc; border-radius:16px; color:#7c7480; font-size:13.5px; grid-column: 1/-1;">
              Your cabinet is empty. Use the <strong>Scan Medicine Barcode</strong> or <strong>Snap Foil</strong> buttons above.
            </div>`;
        } else {
          cabinetContainer.innerHTML = cabinet
            .map(
              (item) => `
            <div style="background:#ffffff; border:1px solid #e7dfed; border-radius:16px; padding:18px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
              <span class="status-pill" style="font-size:11px; margin-bottom:8px; display:inline-block;">Stock: ${item.quantity}</span>
              <h3 style="margin:2px 0; font-size:16px; font-weight:800; color:#2c2730;">${esc(item.brandName)}</h3>
              <small style="color:#6b4d7e; font-weight:700;">${esc(item.saltName || 'Generic Salt')}</small>
              <div style="margin-top:10px; font-size:12.5px; color:#6e6475;">
                <div>Indications: <strong>${esc(item.indications || 'General')}</strong></div>
                <div>Expiry: <strong>${esc(item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Active')}</strong></div>
              </div>
            </div>`
            )
            .join('');
        }
      }
    } catch (err) {
      console.warn('Cabinet list fallback:', err);
    }

    // Barcode scanner
    let html5QrCode = null;
    const scannerModal = document.getElementById('barcodeScannerModal');
    const openScannerBtn = document.getElementById('openBarcodeScannerBtn');
    const closeScannerBtn = document.getElementById('closeScannerBtn');
    const scanBadge = document.getElementById('scanResultBadge');

    openScannerBtn?.addEventListener('click', async () => {
      scannerModal?.classList.remove('hidden');
      if (window.Html5Qrcode) {
        html5QrCode = new Html5Qrcode('scannerViewport');
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            async (decodedText) => {
              if (scanBadge) {
                scanBadge.classList.remove('hidden');
                scanBadge.textContent = `Scanned Code: ${decodedText}. Adding to cabinet...`;
              }
              await html5QrCode.stop();
              try {
                await window.MediAPI.scanBarcode(decodedText);
                scannerModal?.classList.add('hidden');
                bindMedicationsPage();
                alert(`Barcode ${decodedText} recognized and added to your Home Supplies cabinet!`);
              } catch (err) {
                alert('Barcode lookup completed: ' + err.message);
                scannerModal?.classList.add('hidden');
              }
            },
            () => {}
          );
        } catch (err) {
          alert('Camera permission denied or camera not found: ' + err.message);
          scannerModal?.classList.add('hidden');
        }
      } else {
        alert('Barcode scanner library not loaded. Please use manual entry or Snap Foil.');
      }
    });

    closeScannerBtn?.addEventListener('click', async () => {
      if (html5QrCode && html5QrCode.isScanning) {
        await html5QrCode.stop();
      }
      scannerModal?.classList.add('hidden');
    });

    // Foil scanner
    const foilInput = document.getElementById('foilFileInput');
    foilInput?.addEventListener('change', async () => {
      const file = foilInput.files[0];
      if (!file) return;

      try {
        alert('Medi-AI Vision is analyzing the blister foil photo for active salts, brand name, and expiry...');
        const res = await window.MediAPI.scanFoil(file);
        const data = res.data || {};
        bindMedicationsPage();
        alert(
          `Foil scanned successfully!\nBrand: ${data.brandName || 'Identified Medicine'}\nSalt: ${data.saltName || 'Classified'}\nExpiry: ${data.expiryDate || 'Verified'}`
        );
      } catch (err) {
        alert('Foil OCR analysis error: ' + err.message);
      }
    });

    // Manual add
    const addMedModal = document.getElementById('addMedicineModal');
    document.getElementById('openAddMedicineModalBtn')?.addEventListener('click', () => {
      addMedModal?.classList.remove('hidden');
    });
    document.getElementById('closeAddMedicineModal')?.addEventListener('click', () => {
      addMedModal?.classList.add('hidden');
    });

    document.getElementById('addMedicineForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        brandName: document.getElementById('cabBrandName')?.value.trim(),
        saltName: document.getElementById('cabSaltName')?.value.trim(),
        quantity: Number(document.getElementById('cabQuantity')?.value) || 1,
        expiryDate: document.getElementById('cabExpiryDate')?.value || undefined,
        indications: document.getElementById('cabIndications')?.value.trim(),
      };

      try {
        await window.MediAPI.addCabinetItem(payload);
        addMedModal?.classList.add('hidden');
        bindMedicationsPage();
        alert('Medicine added to Home Cabinet successfully.');
      } catch (err) {
        alert('Failed to add medicine: ' + err.message);
      }
    });
  }

  // Doctor portal
  async function bindDoctorPortal() {
    const user = window.MediAPI.getCurrentUser();
    if (!user || user.role !== 'DOCTOR') {
      location.href = 'login.html?role=doctor';
      return;
    }

    document.querySelectorAll('[data-provider-name]').forEach((e) => (e.textContent = user.name || 'Doctor'));
    document.querySelectorAll('[data-provider-unit]').forEach((e) => (e.textContent = user.medilockerId || '—'));
    document.querySelectorAll('[data-provider-initials]').forEach((e) => (e.textContent = initials(user.name)));

    const consentModal = document.getElementById('consentModal');
    document.getElementById('openConsentModalBtn')?.addEventListener('click', () => {
      consentModal?.classList.remove('hidden');
    });
    document.getElementById('closeConsentModal')?.addEventListener('click', () => {
      consentModal?.classList.add('hidden');
    });

    document.getElementById('authorizePatientForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const unitId = document.getElementById('consentUnitId')?.value.trim().toUpperCase();
      const mpin = document.getElementById('consentMpin')?.value.trim();
      const btn = document.getElementById('confirmConsentBtn');

      if (!unitId || mpin.length !== 6) {
        alert('Please enter the 9-digit Unit ID and the patient-entered 6-digit MPIN.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Verifying MPIN with MediLocker Vault...';
        await window.MediAPI.authorizePatient(unitId, mpin);
        consentModal?.classList.add('hidden');
        btn.disabled = false;
        btn.textContent = 'Verify MPIN & Authorize 2h Access ↗';
        alert('Patient authorized successfully! 2-hour clinical session active.');
        loadAuthorizedPatients();
      } catch (err) {
        alert('Authorization failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Verify MPIN & Authorize 2h Access ↗';
      }
    });

    async function loadAuthorizedPatients() {
      const listEl = document.getElementById('authorizedPatientsList');
      if (!listEl) return;

      try {
        const res = await window.MediAPI.getAuthorizedPatients();
        const patients = res.data?.patients || [];

        if (patients.length === 0) {
          listEl.innerHTML = `
            <div style="padding:20px; background:#faf8fc; border-radius:14px; color:#7c7480; font-size:13.5px;">
              No active patient authorizations. Click <strong>Authorize New Patient</strong> above with patient consent.
            </div>`;
          return;
        }

        listEl.innerHTML = patients
          .map(
            (p) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#ffffff; border:1px solid #e7dfed; border-radius:14px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
            <div>
              <strong style="font-size:16px; color:#2c2730;">${esc(p.name)}</strong>
              <p style="margin:2px 0 0 0; font-size:13px; color:#6e6475;">
                Unit ID: <strong>${esc(p.medilockerId)}</strong> · Blood Group: <strong>${esc(p.bloodGroup || 'Not specified')}</strong>
              </p>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <span class="status-pill" style="background:#dcfce7; color:#15803d; font-size:11px;">2h Active</span>
              <button class="primary-btn view-patient-btn" data-patient-id="${p.id}" data-patient-name="${esc(p.name)}" data-patient-unit="${esc(p.medilockerId)}">
                Inspect Records ↗
              </button>
            </div>
          </div>`
          )
          .join('');

        listEl.querySelectorAll('.view-patient-btn').forEach((b) => {
          b.addEventListener('click', () => {
            inspectPatient(b.dataset.patientId, b.dataset.patientName, b.dataset.patientUnit);
          });
        });
      } catch (err) {
        console.warn('Authorized patients fallback:', err);
      }
    }

    async function inspectPatient(patientId, name, unit) {
      const detailView = document.getElementById('patientDetailView');
      if (!detailView) return;

      detailView.classList.remove('hidden');
      document.getElementById('patientDetailName').textContent = name;
      document.getElementById('patientDetailMeta').textContent = `Unit ID: ${unit}`;

      try {
        const todoRes = await window.MediAPI.getTodayTodos(patientId);
        const streak = todoRes.data?.streakCount || 0;
        const progress = todoRes.data?.progressPercentage || 0;

        document.getElementById('docPatientStreak').textContent = `${streak} Days 🔥`;
        document.getElementById('docPatientRate').textContent = `(${progress}% adherence)`;

        const feelRes = await window.MediAPI.getFeelingHistory(patientId, 14);
        const feelings = feelRes.data?.history || [];
        const synBox = document.getElementById('docFeelingSynopsis');
        if (synBox) {
          if (feelings.length === 0) {
            synBox.innerHTML = `<span style="font-size:13px; color:#7c7480;">No feeling logs in past 14 days.</span>`;
          } else {
            synBox.innerHTML = feelings
              .map((f) => {
                const emoji = f.status === 'GREEN' ? '🟢' : f.status === 'ORANGE' ? '🟡' : '🔴';
                return `<span title="${f.date}: ${f.status}" style="font-size:16px; cursor:help;">${emoji}</span>`;
              })
              .join('');
          }
        }
      } catch (e) {
        console.warn('Doctor patient stats error:', e);
      }

      try {
        const timeRes = await window.MediAPI.getTimeline(patientId);
        const timeline = timeRes.data?.timeline || [];
        const tBox = document.getElementById('docPatientTimeline');

        if (tBox) {
          if (timeline.length === 0) {
            tBox.innerHTML = `<p style="color:#7c7480; font-size:13px;">No uploaded medical records for this patient.</p>`;
          } else {
            tBox.innerHTML = timeline
              .map(
                (g) => `
              <div class="timeline-card-item">
                <span class="timeline-date-chip">${esc(g.date)}</span>
                <div style="display:grid; gap:8px; margin-top:8px;">
                  ${g.records
                    .map(
                      (r) => `
                    <div style="background:#faf8fc; border:1px solid #ebe2ef; border-radius:12px; padding:12px;">
                      <strong style="color:#462c57;">${esc(r.title)}</strong> (${esc(r.type)})
                      <div style="font-size:12.5px; color:#6e6475; margin-top:4px;">Diagnoses: ${(r.diagnoses || []).join(', ') || 'None recorded'}</div>
                    </div>`
                    )
                    .join('')}
                </div>
              </div>`
              )
              .join('');
          }
        }
      } catch (e) {
        console.warn('Doctor patient timeline error:', e);
      }
    }

    document.getElementById('closePatientDetailBtn')?.addEventListener('click', () => {
      document.getElementById('patientDetailView')?.classList.add('hidden');
    });

    loadAuthorizedPatients();
  }

  // Hospital portal
  async function bindHospitalPortal() {
    const user = window.MediAPI.getCurrentUser();
    if (!user || user.role !== 'HOSPITAL') {
      location.href = 'login.html?role=hospital';
      return;
    }

    document.querySelectorAll('[data-provider-name]').forEach((e) => (e.textContent = user.name || 'Hospital'));
    document.querySelectorAll('[data-provider-unit]').forEach((e) => (e.textContent = user.medilockerId || '—'));
    document.querySelectorAll('[data-provider-initials]').forEach((e) => (e.textContent = initials(user.name)));

    const intakeModal = document.getElementById('hospitalConsentModal');
    document.getElementById('openHospitalIntakeBtn')?.addEventListener('click', () => {
      intakeModal?.classList.remove('hidden');
    });
    document.getElementById('closeHospitalModal')?.addEventListener('click', () => {
      intakeModal?.classList.add('hidden');
    });

    document.getElementById('hospitalIntakeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const unitId = document.getElementById('intakeUnitId')?.value.trim().toUpperCase();
      const mpin = document.getElementById('intakeMpin')?.value.trim();
      const btn = document.getElementById('confirmIntakeBtn');

      if (!unitId || mpin.length !== 6) {
        alert('Please enter the 9-digit Unit ID and the patient-entered 6-digit MPIN.');
        return;
      }

      try {
        btn.disabled = true;
        btn.textContent = 'Processing Admission...';
        await window.MediAPI.authorizePatient(unitId, mpin);
        intakeModal?.classList.add('hidden');
        btn.disabled = false;
        btn.textContent = 'Verify MPIN & Authorize Admission ↗';
        alert('Patient admitted and authorized for institutional care.');
        loadHospitalPatients();
      } catch (err) {
        alert('Intake failed: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Verify MPIN & Authorize Admission ↗';
      }
    });

    async function loadHospitalPatients() {
      const listEl = document.getElementById('hospitalPatientsList');
      const selectEl = document.getElementById('allotPatientSelect');
      if (!listEl) return;

      try {
        const res = await window.MediAPI.getAuthorizedPatients();
        const patients = res.data?.patients || [];

        if (patients.length === 0) {
          listEl.innerHTML = `
            <div style="padding:20px; background:#faf8fc; border-radius:14px; color:#7c7480; font-size:13.5px;">
              No current admitted patients. Click <strong>Admit Patient</strong> to process intake.
            </div>`;
          return;
        }

        listEl.innerHTML = patients
          .map(
            (p) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#ffffff; border:1px solid #e7dfed; border-radius:14px;">
            <div>
              <strong style="font-size:16px; color:#2c2730;">${esc(p.name)}</strong>
              <p style="margin:2px 0 0 0; font-size:13px; color:#6e6475;">Unit ID: <strong>${esc(p.medilockerId)}</strong> · Status: Inpatient</p>
            </div>
            <span class="status-pill" style="background:#e0e7ff; color:#3730a3;">Admitted</span>
          </div>`
          )
          .join('');

        if (selectEl) {
          selectEl.innerHTML =
            `<option value="">Choose patient...</option>` +
            patients.map((p) => `<option value="${p.id}">${esc(p.name)} (${esc(p.medilockerId)})</option>`).join('');
        }
      } catch (err) {
        console.warn('Hospital patients fallback:', err);
      }
    }

    document.getElementById('allotDoctorForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const patientId = document.getElementById('allotPatientSelect')?.value;
      const doctorId = document.getElementById('allotDoctorId')?.value.trim();

      if (!patientId || !doctorId) {
        alert('Please select an admitted patient and specify the attending doctor.');
        return;
      }

      try {
        await window.MediAPI.allotDoctor(patientId, doctorId, 'Inpatient Allotment');
        alert(`Patient successfully allotted to attending doctor (${doctorId}). Least-privilege clinical access granted.`);
      } catch (err) {
        alert('Doctor allotment error: ' + err.message);
      }
    });

    loadHospitalPatients();
  }

  // Profile
  async function bindProfile() {
    const user = window.MediAPI.getCurrentUser();
    if (!user) {
      location.href = 'login.html?role=patient';
      return;
    }

    document.querySelectorAll('[data-user-name]').forEach((e) => (e.textContent = user.name || 'Patient'));
    document.querySelectorAll('[data-user-unit]').forEach((e) => (e.textContent = user.medilockerId || '—'));
    document.querySelectorAll('[data-user-initials]').forEach((e) => (e.textContent = initials(user.name)));

    try {
      const res = await window.MediAPI.getCurrentUserProfile();
      const p = res.data?.user?.patientProfile || {};

      const fields = {
        fullName: p.fullName || user.name || '',
        dateBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : 'Not provided',
        bloodGroup: p.bloodGroup || 'Not specified',
        phone: p.emergencyContact || 'Not provided',
        email: user.email || '',
        location: [p.city, p.state].filter(Boolean).join(', ') || 'Not provided',
        govid: p.governmentId || 'Not provided',
        insurance: p.insuranceInfo || 'Not provided',
        allergy: p.allergies || 'None recorded',
        medications: p.currentMedications || 'None recorded',
        history: p.medicalHistory || 'Not provided',
        emergency: p.emergencyContact || 'Not provided',
        address: p.address || 'Not provided',
      };

      Object.entries(fields).forEach(([k, v]) => {
        document.querySelectorAll(`[data-field="${k}"]`).forEach((e) => (e.value = v));
      });
    } catch (err) {
      console.warn('Profile fetch error:', err);
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    bindAccessibility();
    bindLanguage();
    bindLocation();
    window.applyLanguage?.(localStorage.getItem('medilockerLanguage') || 'en');
    bindLogout();

    if (document.body.classList.contains('login-page') && document.getElementById('loginForm')) {
      bindLogin();
    }
    if (document.getElementById('signupForm')) {
      bindSignup();
    }
    if (document.querySelector('.patient-dashboard') && document.getElementById('dashboardRecordCount')) {
      bindPatientDashboard();
    }
    if (document.querySelector('.patient-records')) {
      bindPatientRecords();
    }
    if (document.getElementById('fileInput') && document.getElementById('saveUploadBtn')) {
      bindUpload();
    }
    if (document.getElementById('medTimeSlotsContainer')) {
      bindMedicationsPage();
    }
    if (document.body.dataset.providerRole === 'doctor') {
      bindDoctorPortal();
    }
    if (document.body.dataset.providerRole === 'hospital') {
      bindHospitalPortal();
    }
    if (document.querySelector('.profile-card') && document.querySelector('[data-field="fullName"]')) {
      bindProfile();
    }
  });
})();
