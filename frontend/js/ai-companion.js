(function (global) {
  function initAICompanion() {
    const isPatientPage =
      document.querySelector('.patient-dashboard') ||
      document.querySelector('.patient-records') ||
      document.body.classList.contains('patient-page') ||
      location.pathname.includes('dashboard.html') ||
      location.pathname.includes('medications.html') ||
      location.pathname.includes('records.html') ||
      location.pathname.includes('profile.html') ||
      location.pathname.includes('upload.html');

    if (!isPatientPage) return;
    if (document.getElementById('mediAICompanionRoot')) return;

    // AI companion root
    const root = document.createElement('div');
    root.id = 'mediAICompanionRoot';
    root.innerHTML = `
      <!-- Trigger button -->
      <button id="mediAITrigger" class="medi-ai-trigger" title="Ask Medi-AI Health Companion">
        <span class="pulse-ring"></span>
        <span class="ai-icon">✨</span>
        <span class="ai-label">Medi-AI Companion</span>
      </button>

      <!-- Chat drawer -->
      <div id="mediAIDrawer" class="medi-ai-drawer hidden">
        <div class="ai-drawer-header">
          <div class="ai-drawer-title">
            <div class="ai-avatar">✦</div>
            <div>
              <h3>Medi-AI Companion</h3>
              <p>Safe Clinical Guidance & Triage</p>
            </div>
          </div>
          <button id="mediAIClose" class="ai-drawer-close" aria-label="Close Chat">&times;</button>
        </div>

        <!-- Emergency banner -->
        <div id="aiEmergencyAlert" class="ai-emergency-banner hidden">
          <div class="emergency-icon">🚨</div>
          <div class="emergency-content">
            <h4>EMERGENCY DETECTED</h4>
            <p id="aiEmergencyText">Life-threatening symptoms detected. Do not wait for chat advice.</p>
            <div class="emergency-actions">
              <a href="tel:112" class="btn-call-emergency">Call 112</a>
              <a href="tel:108" class="btn-call-emergency">Call 108</a>
            </div>
          </div>
        </div>

        <!-- Chat body -->
        <div id="aiChatBody" class="ai-chat-body">
          <div class="ai-msg ai-bot">
            <div class="ai-msg-bubble">
              <p>Hello! I am your <strong>Medi-AI Health Companion</strong>. You can describe any acute symptoms you are feeling, or ask questions about medications in your home cabinet.</p>
              <small class="ai-disclaimer">Triage & safe advice only. Never replaces emergency medical care.</small>
            </div>
          </div>
        </div>

        <!-- Suggestion chips -->
        <div class="ai-quick-chips">
          <button class="ai-chip" data-query="I have a sudden high fever and body ache">High Fever & Ache</button>
          <button class="ai-chip" data-query="Mild tension headache and eye strain">Headache & Eye Strain</button>
          <button class="ai-chip" data-query="Severe acidity and burning sensation after dinner">Acid Reflux</button>
          <button class="ai-chip" data-query="Can I take Paracetamol with my current prescriptions?">Paracetamol Safety</button>
        </div>

        <!-- Chat form -->
        <form id="aiChatForm" class="ai-chat-form">
          <input
            type="text"
            id="aiChatInput"
            placeholder="Describe your symptoms (e.g. mild fever, cough)..."
            autocomplete="off"
            required
          />
          <button type="submit" id="aiSendBtn" class="ai-send-btn" aria-label="Send message">
            <span>➤</span>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(root);

    // Event bindings
    const trigger = document.getElementById('mediAITrigger');
    const drawer = document.getElementById('mediAIDrawer');
    const closeBtn = document.getElementById('mediAIClose');
    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiChatInput');
    const body = document.getElementById('aiChatBody');
    const emergencyBanner = document.getElementById('aiEmergencyAlert');
    const emergencyText = document.getElementById('aiEmergencyText');

    trigger.addEventListener('click', () => {
      drawer.classList.toggle('hidden');
      if (!drawer.classList.contains('hidden')) {
        input.focus();
      }
    });

    closeBtn.addEventListener('click', () => {
      drawer.classList.add('hidden');
    });

    // Quick chips
    document.querySelectorAll('.ai-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        input.value = chip.dataset.query;
        form.dispatchEvent(new Event('submit'));
      });
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      appendMessage('user', text);
      input.value = '';

      const loadingId = appendLoading();

      try {
        if (!window.MediAPI) {
          throw new Error('MediAPI client not loaded.');
        }

        const res = await window.MediAPI.aiChat(text);
        removeLoading(loadingId);

        const aiData = res.data || {};

        if (aiData.isEmergency) {
          emergencyBanner.classList.remove('hidden');
          emergencyText.innerHTML = `<strong>WARNING:</strong> ${aiData.emergencyMessage || 'Immediate medical attention is required. Please call 112 or 108.'}`;
        }

        appendAIResponse(aiData);
      } catch (err) {
        removeLoading(loadingId);
        appendMessage(
          'bot',
          `Sorry, I encountered an error checking your symptoms: ${err.message}. If you are feeling unwell, please consult a physician immediately.`
        );
      }
    });

    function appendMessage(sender, text) {
      const msg = document.createElement('div');
      msg.className = `ai-msg ai-${sender}`;
      msg.innerHTML = `<div class="ai-msg-bubble"><p>${escapeHtml(text)}</p></div>`;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function appendLoading() {
      const id = 'loading_' + Date.now();
      const msg = document.createElement('div');
      msg.id = id;
      msg.className = 'ai-msg ai-bot';
      msg.innerHTML = `
        <div class="ai-msg-bubble ai-loading-bubble">
          <span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span>
        </div>`;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
      return id;
    }

    function removeLoading(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    }

    function appendAIResponse(data) {
      const msg = document.createElement('div');
      msg.className = 'ai-msg ai-bot';

      let html = `<div class="ai-msg-bubble">`;

      if (data.triageLevel) {
        const triageClass = `triage-${data.triageLevel.toLowerCase()}`;
        html += `<span class="ai-triage-badge ${triageClass}">Triage Level: ${data.triageLevel}</span>`;
      }

      if (data.remedyAdvice) {
        html += `<div class="ai-advice-content">${data.remedyAdvice.replace(/\n/g, '<br>')}</div>`;
      }

      if (data.contraindications && data.contraindications.length > 0) {
        html += `
          <div class="ai-contraindication-box">
            <strong>⚠️ Contraindications & Safety Alerts:</strong>
            <ul>
              ${data.contraindications.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      if (data.disclaimer) {
        html += `<small class="ai-disclaimer">${escapeHtml(data.disclaimer)}</small>`;
      }

      html += `</div>`;
      msg.innerHTML = html;
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    function escapeHtml(s) {
      return String(s || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
    }
  }

  document.addEventListener('DOMContentLoaded', initAICompanion);
  global.initAICompanion = initAICompanion;
})(window);
