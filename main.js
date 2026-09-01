/**
 * HydroShield AI - Main Controller with Distinct Google Maps Route Vector
 */

import { TelemetryEngine } from './simulation.js';
import { MapRenderer } from './map.js';
import { AgentBrain } from './agent.js';

document.addEventListener('DOMContentLoaded', () => {
  const telemetry = new TelemetryEngine();
  const mapRenderer = new MapRenderer('map-canvas-wrapper', telemetry);
  const agent = new AgentBrain(telemetry);

  const selectLoc = document.getElementById('select-location');
  const btnGmaps = document.getElementById('btn-open-gmaps');

  const displayRain = document.getElementById('display-rain-text');
  const displayRiver = document.getElementById('display-river-text');
  const displaySoil = document.getElementById('display-soil-text');

  const riskCard = document.getElementById('overall-risk-card');
  const riskDisplay = document.getElementById('risk-level-display');
  const riskDesc = document.getElementById('risk-description-text');

  const testBtns = document.querySelectorAll('.btn-scenario');

  if (selectLoc) {
    selectLoc.addEventListener('change', (e) => {
      telemetry.setLocation(e.target.value);
    });
  }

  telemetry.onChange((state) => {
    // Update Google Maps Link href with distinct origin and destination
    const loc = telemetry.locations[telemetry.currentLocationKey];
    if (loc && btnGmaps) {
      const orig = `${loc.originLat},${loc.originLon}`;
      const dest = `${loc.destLat},${loc.destLon}`;
      btnGmaps.href = `https://www.google.com/maps/dir/?api=1&origin=${orig}&destination=${dest}&travelmode=driving`;
    }

    if (displayRain) {
      displayRain.textContent = state.rainRate > 60 ? `Heavy Storm (${state.rainRate.toFixed(0)} mm/h)`
        : state.rainRate > 20 ? `Moderate Rain (${state.rainRate.toFixed(0)} mm/h)`
        : `Light Rain (${state.rainRate.toFixed(0)} mm/h)`;
    }

    if (displayRiver) {
      displayRiver.textContent = state.riverLevel >= 5.5 ? `OVERFLOWING (${state.riverLevel.toFixed(1)}m)`
        : state.riverLevel >= 4.2 ? `Flood Warning (${state.riverLevel.toFixed(1)}m)`
        : `Normal (${state.riverLevel.toFixed(1)}m)`;
    }

    if (displaySoil) {
      displaySoil.textContent = state.soilMoisture >= 85 ? `Completely Soaked (${state.soilMoisture}%)`
        : `Normal (${state.soilMoisture}%)`;
    }

    if (riskCard && riskDisplay && riskDesc) {
      if (state.riskTier === 3) {
        riskCard.className = 'threat-card level-danger';
        riskDisplay.textContent = '🚨 FLOOD EMERGENCY DANGER';
        riskDesc.textContent = `CRITICAL: Major river flooding in ${state.locationName}. Follow route to ${state.shelter}.`;
      } else if (state.riskTier === 2) {
        riskCard.className = 'threat-card level-danger';
        riskDisplay.textContent = '⚠️ FLOOD WARNING';
        riskDesc.textContent = `River water is flooding low roads in ${state.locationName}. Safe route active.`;
      } else if (state.riskTier === 1) {
        riskCard.className = 'threat-card level-warning';
        riskDisplay.textContent = '🟡 FLOOD ADVISORY';
        riskDesc.textContent = `Rain is rising near low river bridges in ${state.locationName}.`;
      } else {
        riskCard.className = 'threat-card level-safe';
        riskDisplay.textContent = '🟢 SAFE: NO HAZARD';
        riskDesc.textContent = `Conditions are safe in ${state.locationName}. AI is monitoring.`;
      }
    }

    agent.runReasoningCycle(false);
  });

  testBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      testBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const scenario = btn.getAttribute('data-scenario');
      telemetry.setScenario(scenario);
    });
  });

  telemetry.notify();
});
