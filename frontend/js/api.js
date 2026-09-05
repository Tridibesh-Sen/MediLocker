(function (global) {
  const API_BASE = window.API_BASE_URL || 'http://localhost:5000/api/v1';
  const TOKEN_KEY = 'medilocker_token';
  const USER_KEY = 'medilocker_user';

  const MediAPI = {
    // Session
    getToken() {
      return localStorage.getItem(TOKEN_KEY) || null;
    },

    setSession(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem('medilockerSession', JSON.stringify({
        unit: user.medilockerId,
        email: user.email,
        name: user.name,
        role: (user.role || 'patient').toLowerCase(),
      }));
    },

    getCurrentUser() {
      try {
        return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      } catch (e) {
        return null;
      }
    },

    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('medilockerSession');
    },

    isAuthenticated() {
      return !!this.getToken();
    },

    // Request dispatcher
    async request(endpoint, options = {}) {
      const url = `${API_BASE}${endpoint}`;
      const headers = options.headers || {};

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
          throw new Error(errorMsg);
        }

        return data;
      } catch (err) {
        console.error(`[MediAPI Error] ${endpoint}:`, err);
        throw err;
      }
    },

    // Auth
    async signup(payload) {
      const role = payload.role.toLowerCase();
      return this.request(`/auth/signup/${role}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async loginPassword(email, password) {
      const data = await this.request('/auth/login/password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.data?.token) {
        this.setSession(data.data.token, data.data.user);
      }
      return data;
    },

    async loginMpin(medilockerId, mpin) {
      const data = await this.request('/auth/login/mpin', {
        method: 'POST',
        body: JSON.stringify({ medilockerId, mpin }),
      });
      if (data.data?.token) {
        this.setSession(data.data.token, data.data.user);
      }
      return data;
    },

    // WebAuthn
    async getWebAuthnOptions(email) {
      return this.request('/auth/webauthn/generate-options', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    async verifyWebAuthn(email, assertionResponse) {
      const data = await this.request('/auth/webauthn/verify', {
        method: 'POST',
        body: JSON.stringify({ email, assertionResponse }),
      });
      if (data.data?.token) {
        this.setSession(data.data.token, data.data.user);
      }
      return data;
    },

    async getCurrentUserProfile() {
      return this.request('/auth/me');
    },

    // Records
    async uploadRecord(file, recordType = 'PRESCRIPTION') {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('recordType', recordType);

      return this.request('/records/upload', {
        method: 'POST',
        body: formData,
      });
    },

    async listRecords(patientId = null, type = null) {
      let query = '';
      const params = new URLSearchParams();
      if (patientId) params.append('patientId', patientId);
      if (type) params.append('type', type);
      if (params.toString()) query = `?${params.toString()}`;

      return this.request(`/records${query}`);
    },

    async getRecordById(recordId) {
      return this.request(`/records/${recordId}`);
    },

    // Timeline
    async getTimeline(patientId = null) {
      const query = patientId ? `?patientId=${patientId}` : '';
      return this.request(`/timeline${query}`);
    },

    // Todo
    async getTodayTodos(patientId = null) {
      const query = patientId ? `?patientId=${patientId}` : '';
      return this.request(`/todo/today${query}`);
    },

    async toggleTodoItem(todoId) {
      return this.request(`/todo/${todoId}/toggle`, {
        method: 'PATCH',
      });
    },

    async submitFeeling(status, notes = '') {
      return this.request('/todo/feeling', {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      });
    },

    async getFeelingHistory(patientId = null, days = 30) {
      const params = new URLSearchParams({ days });
      if (patientId) params.append('patientId', patientId);
      return this.request(`/todo/feeling-history?${params.toString()}`);
    },

    // Inventory
    async getCabinet(patientId = null) {
      const query = patientId ? `?patientId=${patientId}` : '';
      return this.request(`/inventory/cabinet${query}`);
    },

    async addCabinetItem(payload) {
      return this.request('/inventory/cabinet', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async scanBarcode(barcode) {
      return this.request('/inventory/cabinet/barcode', {
        method: 'POST',
        body: JSON.stringify({ barcode }),
      });
    },

    async getRefills(patientId = null) {
      const query = patientId ? `?patientId=${patientId}` : '';
      return this.request(`/inventory/refills${query}`);
    },

    async updateRefillStock(refillId, purchasedQuantity) {
      return this.request(`/inventory/refills/${refillId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ purchasedQuantity: Number(purchasedQuantity) }),
      });
    },

    // AI companion
    async aiChat(symptoms) {
      return this.request('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ symptoms }),
      });
    },

    async scanFoil(file) {
      const formData = new FormData();
      formData.append('file', file);
      return this.request('/ai/scan-foil', {
        method: 'POST',
        body: formData,
      });
    },

    // Delegation
    async authorizePatient(patientUnitId, mpin) {
      return this.request('/delegation/authorize', {
        method: 'POST',
        body: JSON.stringify({ patientUnitId, mpin }),
      });
    },

    async getAuthorizedPatients() {
      return this.request('/delegation/patients');
    },

    async allotDoctor(patientId, doctorId, notes = '') {
      return this.request('/delegation/allot', {
        method: 'POST',
        body: JSON.stringify({ patientId, doctorId, notes }),
      });
    },

    async getHospitalDoctors() {
      return this.request('/delegation/hospital/allotments');
    },
  };

  global.MediAPI = MediAPI;
})(window);
