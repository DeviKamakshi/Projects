/**
 * HydroShield AI - Pure Emergency Agent Engine
 * Focuses purely on real-time weather monitoring, route calculations, and cell alerts.
 */

export class AgentBrain {
  constructor(telemetryEngine) {
    this.telemetry = telemetryEngine;
    this.isProcessing = false;

    this.logContainer = document.getElementById('agent-log-stream');
    this.globalBadge = document.getElementById('global-status-badge');
    this.globalBadgeText = document.getElementById('global-status-text');

    this.weaTextEl = document.getElementById('wea-text-content');

    this.guideCardEl = document.getElementById('safety-guide-card');
    this.guideTitleEl = document.getElementById('guide-status-title');
    this.guideDetailsEl = document.getElementById('guide-details-list');
  }

  log(msg, type = 'system') {
    if (!this.logContainer) return;
    const timeStr = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerHTML = `<span style="color:#64748b">[${timeStr}]</span> ${msg}`;
    this.logContainer.appendChild(div);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  async runReasoningCycle(forceTrigger = false) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const state = this.telemetry.state;

    this.log(`Checking weather & route safety for ${state.locationName}...`, 'system');
    await this.delay(300);

    if (state.riskTier === 0) {
      this.setNormalStatus(state);
      this.log(`Result: Safe baseline.`, 'system');
    } 
    else if (state.riskTier === 1) {
      this.updateAdvisoryStatus(state);
      this.log(`Result: Advisory. Rain rising.`, 'thinking');
    } 
    else if (state.riskTier >= 2) {
      const isEmergency = state.riskTier === 3;
      const alertTitle = isEmergency ? 'FLOOD EMERGENCY DANGER' : 'FLOOD WARNING';

      this.log(`🚨 CRITICAL: ${alertTitle}! Calculating emergency guidance...`, 'alert');
      this.updateDangerStatus(state, isEmergency);

      await this.delay(300);
      this.log(`Action: Safe route computed (${state.safeRoute}).`, 'tool-call');

      await this.delay(300);
      this.log(`Action: Emergency Phone Alert drafted for ${state.locationName}.`, 'tool-call');
      this.dispatchWEA(state, isEmergency);
    }

    this.isProcessing = false;
  }

  setNormalStatus(state) {
    if (this.globalBadge) {
      this.globalBadge.className = 'agent-status-badge status-normal';
      this.globalBadgeText.textContent = 'EVERYTHING SAFE';
    }
    if (this.weaTextEl) {
      this.weaTextEl.textContent = 'Weather is clear. No phone alert needed.';
    }

    if (this.guideCardEl && this.guideTitleEl && this.guideDetailsEl) {
      this.guideCardEl.style.background = 'rgba(16, 185, 129, 0.08)';
      this.guideTitleEl.textContent = 'ALL ROADS CLEAR & SAFE';
      this.guideTitleEl.style.color = '#10b981';

      this.guideDetailsEl.innerHTML = `
        <p>🌊 River: Safe inside banks in ${state.locationName}.</p>
        <p>🚗 Roads: ${state.blockedRoad} is open & clear.</p>
        <p>🟢 Safe Route: ${state.safeRoute} (${state.estTime}).</p>
        <p>🏥 Shelter: ${state.shelter}.</p>
      `;
    }
  }

  updateAdvisoryStatus(state) {
    if (this.globalBadge) {
      this.globalBadge.className = 'agent-status-badge status-advisory-theme';
      this.globalBadgeText.textContent = 'FLOOD ADVISORY';
    }
    if (this.weaTextEl) {
      this.weaTextEl.textContent = `FLOOD ADVISORY: Rain is rising in ${state.locationName}. Drive carefully near low river bridges.`;
    }

    if (this.guideCardEl && this.guideTitleEl && this.guideDetailsEl) {
      this.guideCardEl.style.background = 'rgba(245, 158, 11, 0.1)';
      this.guideTitleEl.textContent = 'FLOOD ADVISORY - CAUTION';
      this.guideTitleEl.style.color = '#f59e0b';

      this.guideDetailsEl.innerHTML = `
        <p>🌊 River: Water rising in ${state.locationName}.</p>
        <p>🚗 Caution: ${state.blockedRoad} may accumulate water soon.</p>
        <p>🟢 Safe Route: ${state.safeRoute} (${state.estTime}).</p>
      `;
    }
  }

  updateDangerStatus(state, isEmergency) {
    if (this.globalBadge) {
      this.globalBadge.className = 'agent-status-badge status-danger-theme';
      this.globalBadgeText.textContent = isEmergency ? 'FLOOD EMERGENCY DANGER' : 'FLOOD WARNING';
    }

    if (this.guideCardEl && this.guideTitleEl && this.guideDetailsEl) {
      this.guideCardEl.style.background = 'rgba(239, 68, 68, 0.15)';
      this.guideTitleEl.textContent = `🚨 FLOOD DANGER IN ${state.locationName.toUpperCase()}`;
      this.guideTitleEl.style.color = '#ef4444';

      this.guideDetailsEl.innerHTML = `
        <p>🌊 River: Overflowing banks (${state.riverLevel.toFixed(1)}m deep).</p>
        <p>❌ Blocked Road: ${state.blockedRoad} is FLOODED & CLOSED.</p>
        <p>🟢 Real-Time Safe Route: Take ${state.safeRoute} (${state.estTime}).</p>
        <p>🏥 Shelter: ${state.shelter}.</p>
      `;
    }
  }

  dispatchWEA(state, isEmergency) {
    if (!this.weaTextEl) return;
    const msg = isEmergency
      ? `🚨 EMERGENCY FLOOD ALERT for ${state.locationName}! River water is ${state.riverLevel.toFixed(1)}m high. EVACUATE TO HIGH GROUND NOW!`
      : `⚠️ FLOOD WARNING for ${state.locationName}: Heavy rain storm. Main Street bridge flooded.`;
    this.weaTextEl.textContent = msg;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
