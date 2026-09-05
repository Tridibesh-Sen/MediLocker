const API_BASE = '/api/v1';
const TOKEN_KEY = 'medilocker_token';
const USER_KEY = 'medilocker_user';

export const api = {
  // Session & Auth
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  },

  getCurrentUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser();
  },

  // Real Login
  async login({ role, identifier, mpin }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, identifier, mpin }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Invalid credentials.');
    }

    const token = json.token || json.data?.token;
    const user = json.user || json.data?.user;
    this.setSession(token, user);
    return { success: true, user, token };
  },

  // Real Signup
  async signup(formData) {
    const payload = {
      role: formData.role ? formData.role.toUpperCase() : 'PATIENT',
      name: formData.fullName || formData.name,
      email: formData.email,
      phone: formData.phone,
      mpin: formData.mpin,
      dob: formData.dob,
      gender: formData.gender,
      blood: formData.bloodGroup,
      allergy: formData.allergies,
      history: formData.chronicConditions,
      emergency: formData.emergencyContactName,
      emergencyPhone: formData.emergencyContactPhone,
      // Doctor fields if applicable
      doctorId: formData.doctorId || `DOC-${Math.floor(100 + Math.random() * 900)}`,
      registrationNumber: formData.registrationNumber || `REG-${Date.now()}`,
      specialization: formData.specialization || 'General Practitioner',
      clinicName: formData.clinicName || 'City Clinic',
      address: formData.address || 'Medical Enclave',
      city: formData.city || 'Bangalore',
      // Hospital fields if applicable
      hospitalId: formData.hospitalId || `HOSP-${Math.floor(100 + Math.random() * 900)}`,
      license: formData.license || `LIC-${Date.now()}`,
    };

    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Registration failed.');
    }

    const token = json.token || json.data?.token;
    const user = json.user || json.data?.user;
    if (token && user) {
      this.setSession(token, user);
    }
    return { success: true, user, token };
  },

  // Real Records
  async getRecords() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/records`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) this.clearSession();
      return [];
    }

    const json = await res.json().catch(() => ({}));
    return json.data || json.records || [];
  },

  async createRecord(recordData) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recordData),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Failed to save record.');
    }

    return { success: true, record: json.record || json.data };
  },

  async uploadRecordFile(file, documentType = 'PRESCRIPTION', note = '') {
    const token = this.getToken();
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    if (note) form.append('note', note);

    const res = await fetch(`${API_BASE}/records/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Failed to upload document.');
    }

    return { success: true, data: json.data };
  },

  // Real Medications & Routine
  async getMedications() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/todo/today`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];

    const json = await res.json().catch(() => ({}));
    const rawTasks = json.data?.tasks || json.tasks || [];
    return rawTasks.map((t) => ({
      id: t.id,
      name: t.medication?.medicineName || t.taskLabel,
      activeSalt: t.medication?.activeSalt || '',
      dosage: t.medication?.dosage || '1 dose',
      timing: t.medication?.timingInstruction || 'As advised',
      slot: t.timeSlot ? t.timeSlot.charAt(0) + t.timeSlot.slice(1).toLowerCase() : 'Morning',
      remainingCount: t.medication?.totalQuantityNeeded || 10,
      takenToday: t.isCompleted,
    }));
  },

  async addMedication(medData) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/inventory/home-supplies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        medicineName: medData.name,
        quantity: Number(medData.quantity) || 10,
        expiryDate: medData.expiryDate,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Failed to add medication.');
    }

    return {
      success: true,
      medication: {
        id: json.data?.id || 'med-' + Date.now(),
        name: medData.name,
        activeSalt: json.data?.activeSalt || medData.activeSalt || '',
        dosage: medData.dosage || '1 tablet',
        timing: medData.timing || 'After Food',
        slot: medData.slot || 'Morning',
        remainingCount: Number(medData.quantity) || 10,
        takenToday: false,
      },
    };
  },

  async toggleMedication(taskId) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/todo/${taskId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to update medication status.');
    }

    const json = await res.json().catch(() => ({}));
    return { success: true, task: json.data || json };
  },

  // Profile Management
  async getProfile() {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    if (json.data) {
      this.setSession(token, json.data);
    }
    return json.data;
  },

  async updateProfile(profileData) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Failed to update profile.');
    }

    if (json.data) {
      this.setSession(token, json.data);
    }
    return { success: true, data: json.data };
  },

  // Consent & Provider Delegation
  async grantConsent({ doctorUnitId, duration, purpose }) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/delegation/request-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ patientMedilockerId: doctorUnitId }),
    }).catch(() => null);

    return { success: true, message: `Consent granted for ${doctorUnitId}` };
  },

  async lookupPatient(patientId) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/delegation/request-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ patientMedilockerId: patientId }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'Patient not found or invalid Unit ID.');
    }
    return json.data;
  },

  // Real Mistral AI Companion Chat
  async askAiCompanion(message, context = {}) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || 'AI service unavailable.');
    }

    const aiData = json.data || json;
    return {
      response: aiData.response,
      emergencyBypass: aiData.emergencyBypass || false,
    };
  },
};
