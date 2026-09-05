const API_BASE = '/api/v1';
const TOKEN_KEY = 'medilocker_token';
const USER_KEY = 'medilocker_user';
const STORAGE_PREFIX = 'medilocker_';

// Initial fallback mock state
const DEFAULT_USER = {
  id: 'usr-pat-001',
  medilockerId: 'ML-842-194-672',
  abhaNumber: '91-4829-1092-4820',
  name: 'Ananya Sharma',
  email: 'ananya.sharma@example.com',
  phone: '+91 98765 43210',
  role: 'patient',
  dob: '1996-08-14',
  gender: 'Female',
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Sulfa drugs'],
  chronicConditions: ['Mild Asthma', 'Migraine'],
  emergencyContact: {
    name: 'Rajesh Sharma',
    relation: 'Father',
    phone: '+91 98765 11223'
  }
};

const DEFAULT_RECORDS = [
  {
    id: 'rec-001',
    eventDateDdmmyyyy: '04092026',
    dateFormatted: '04 Sep 2026',
    category: 'Prescription',
    doctorName: 'Dr. Ramesh K. Verma',
    clinicName: 'Apollo Clinics, Indiranagar',
    diagnoses: ['Acute Bronchitis', 'Mild Pyrexia'],
    clinicalSummary: 'Patient presented with chest tightness and productive cough for 3 days. Prescribed bronchodilator and antipyretic.',
    prescribedMedications: [
      { medicineName: 'Dolo 650', dosage: '650mg', frequency: '1-0-1', duration: '5 days', timing: 'After Food' },
      { medicineName: 'Azithromycin 500mg', dosage: '500mg', frequency: '0-0-1', duration: '3 days', timing: 'After Dinner' }
    ],
    testsDue: [{ testName: 'Complete Blood Count (CBC)', dueWithinDays: 5 }]
  },
  {
    id: 'rec-002',
    eventDateDdmmyyyy: '18082026',
    dateFormatted: '18 Aug 2026',
    category: 'Lab Report',
    doctorName: 'Dr. Sunita Sen (Pathologist)',
    clinicName: 'SRL Diagnostics Central Lab',
    diagnoses: ['Annual Lipid & HbA1c Screen'],
    clinicalSummary: 'HbA1c 5.6% (Normal glycemic range). Total cholesterol 182 mg/dL. All metabolic parameters optimal.',
    prescribedMedications: [],
    testsDue: []
  },
  {
    id: 'rec-003',
    eventDateDdmmyyyy: '12052026',
    dateFormatted: '12 May 2026',
    category: 'Vaccine Certificate',
    doctorName: 'Dr. Arvind Swamy',
    clinicName: 'BBMP Urban Primary Health Centre',
    diagnoses: ['Annual Influenza Prophylaxis'],
    clinicalSummary: 'Quadrivalent Influenza Vaccine administered intramuscularly left deltoid. No acute reaction.',
    prescribedMedications: [],
    testsDue: []
  }
];

const DEFAULT_MEDICATIONS = [
  {
    id: 'med-001',
    name: 'Dolo 650',
    activeSalt: 'Paracetamol',
    dosage: '650mg',
    frequency: '1-0-1',
    route: 'Oral',
    timing: 'After Food',
    remainingCount: 14,
    totalCount: 20,
    slot: 'Morning',
    takenToday: true,
    expiryDate: '2027-11-30'
  },
  {
    id: 'med-002',
    name: 'Azithromycin 500mg',
    activeSalt: 'Azithromycin',
    dosage: '500mg',
    frequency: '0-0-1',
    route: 'Oral',
    timing: 'After Dinner',
    remainingCount: 2,
    totalCount: 3,
    slot: 'Night',
    takenToday: false,
    expiryDate: '2026-12-15'
  },
  {
    id: 'med-003',
    name: 'Montelukast 10mg',
    activeSalt: 'Montelukast Sodium',
    dosage: '10mg',
    frequency: '0-0-1',
    route: 'Oral',
    timing: 'Bedtime',
    remainingCount: 28,
    totalCount: 30,
    slot: 'Night',
    takenToday: false,
    expiryDate: '2028-03-31'
  }
];

// Helper to get from localStorage or initialize
function getLocalItem(key, fallback) {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setLocalItem(key, val) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch (e) {}
}

export const api = {
  // Session & Auth
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  },

  getCurrentUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : getLocalItem('currentUser', DEFAULT_USER);
    } catch (e) {
      return DEFAULT_USER;
    }
  },

  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token || 'jwt-demo-session-token');
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setLocalItem('currentUser', user);
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  async login({ role, identifier, mpin, otp }) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, identifier, mpin, otp }),
      });
      if (res.ok) {
        const json = await res.json();
        this.setSession(json.token, json.user);
        return { success: true, user: json.user };
      }
    } catch (err) {
      console.warn('Backend login unavailable, activating resilient demo session:', err);
    }

    // Local resilient demo session
    const demoUser = {
      ...DEFAULT_USER,
      role: role || 'patient',
      email: identifier.includes('@') ? identifier : `${role || 'user'}@medilocker.gov.in`,
      name: role === 'doctor' ? 'Dr. Ramesh K. Verma (MD)' : role === 'hospital' ? 'Apollo Multi-Specialty Hospital' : DEFAULT_USER.name,
      medilockerId: role === 'doctor' ? 'DOC-912-384' : role === 'hospital' ? 'HOSP-441-209' : DEFAULT_USER.medilockerId,
    };
    this.setSession('demo-jwt-token', demoUser);
    return { success: true, user: demoUser, isDemo: true };
  },

  async signup(data) {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        this.setSession(json.token, json.user);
        return { success: true, user: json.user };
      }
    } catch (err) {
      console.warn('Backend signup offline, creating local profile:', err);
    }

    const randId = 'ML-' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(100 + Math.random() * 900);
    const newUser = {
      ...DEFAULT_USER,
      name: data.fullName || data.name || 'New Patient',
      email: data.email || 'patient@medilocker.gov.in',
      phone: data.phone || '+91 99999 88888',
      medilockerId: randId,
      role: data.role || 'patient',
      bloodGroup: data.bloodGroup || 'O+',
      emergencyContact: {
        name: data.emergencyContactName || 'Family Member',
        phone: data.emergencyContactPhone || '+91 98765 00000',
        relation: data.emergencyContactRelation || 'Spouse',
      }
    };
    this.setSession('demo-signup-token', newUser);
    return { success: true, user: newUser, isDemo: true };
  },

  // Records & Ingestion
  async getRecords() {
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.records) && data.records.length > 0) return data.records;
      }
    } catch (e) {}
    return getLocalItem('records', DEFAULT_RECORDS);
  },

  async createRecord(recordData) {
    let savedRecord = null;
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(recordData)
      });
      if (res.ok) {
        savedRecord = await res.json();
      }
    } catch (e) {}

    // Update local records store
    const current = getLocalItem('records', DEFAULT_RECORDS);
    const newEntry = savedRecord?.record || {
      id: 'rec-' + Date.now(),
      eventDateDdmmyyyy: recordData.eventDateDdmmyyyy || '05092026',
      dateFormatted: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      category: recordData.category || 'Prescription',
      doctorName: recordData.doctorName || 'Dr. Self-Entered',
      clinicName: recordData.clinicName || 'Personal Health Record',
      diagnoses: Array.isArray(recordData.diagnoses) ? recordData.diagnoses : [recordData.diagnoses || 'General Consultation'],
      clinicalSummary: recordData.clinicalSummary || 'Manually submitted medical record.',
      prescribedMedications: recordData.prescribedMedications || [],
      testsDue: recordData.testsDue || []
    };
    const updated = [newEntry, ...current];
    setLocalItem('records', updated);
    return { success: true, record: newEntry };
  },

  // Medications & Routine
  async getMedications() {
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/todo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.todos) && data.todos.length > 0) return data.todos;
      }
    } catch (e) {}
    return getLocalItem('medications', DEFAULT_MEDICATIONS);
  },

  async addMedication(medData) {
    const list = getLocalItem('medications', DEFAULT_MEDICATIONS);
    const newMed = {
      id: 'med-' + Date.now(),
      name: medData.name,
      activeSalt: medData.activeSalt || medData.name,
      dosage: medData.dosage || '1 tablet',
      frequency: medData.frequency || '1-0-1',
      route: medData.route || 'Oral',
      timing: medData.timing || 'After Food',
      remainingCount: Number(medData.quantity || 10),
      totalCount: Number(medData.quantity || 10),
      slot: medData.slot || 'Morning',
      takenToday: false,
      expiryDate: medData.expiryDate || '2028-12-31'
    };
    const updated = [newMed, ...list];
    setLocalItem('medications', updated);
    return { success: true, medication: newMed };
  },

  async toggleMedication(id) {
    const list = getLocalItem('medications', DEFAULT_MEDICATIONS);
    const updated = list.map(m => m.id === id ? { ...m, takenToday: !m.takenToday } : m);
    setLocalItem('medications', updated);
    return { success: true, list: updated };
  },

  // Medi-AI Companion Chat
  async askAiCompanion(message, context = {}) {
    try {
      const token = this.getToken();
      const res = await fetch(`${API_BASE}/ai/companion-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message, context })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend AI companion offline, utilizing local clinical parser:', e);
    }

    // Emergency triage guardrail
    const lower = message.toLowerCase();
    if (lower.includes('chest pain') || lower.includes('difficulty breathing') || lower.includes('unconscious') || lower.includes('choking') || lower.includes('heart attack')) {
      return {
        emergencyBypass: true,
        response: `🚨 MEDICAL EMERGENCY DETECTED: Symptoms suggest a critical emergency requiring immediate medical intervention. Please call National Emergency Services (112 or 108) immediately or visit the nearest emergency trauma center.`
      };
    }

    // Contextual responses
    if (lower.includes('headache') || lower.includes('fever') || lower.includes('dolo')) {
      return {
        emergencyBypass: false,
        response: `Based on your medical locker records, you have Dolo 650 (Paracetamol) in your home routine. For mild tension headache or pyrexia, an adult dose of Paracetamol 650mg may be taken with water after food. Ensure adequate hydration, rest in a quiet dark room, and avoid alcohol or NSAID duplication. If headache persists beyond 48 hours or is accompanied by stiff neck or visual changes, consult your physician.`
      };
    }

    return {
      emergencyBypass: false,
      response: `Thank you for your question: "${message}". Based on your MediLocker sovereign health profile, always adhere to your doctor's prescribed timing. If you are experiencing new or worsening symptoms, please share your record or consult your registered practitioner.`
    };
  }
};
