/**
 * HydroShield AI - Real-Time Telemetry & Location Safe Route Data Engine
 * Updated with distinct Origin and Destination GPS coordinates for clear Google Maps routing.
 */

export class TelemetryEngine {
  constructor() {
    this.locations = {
      nepal_glacial: { 
        name: 'Langtang / Trishuli River, Nepal 🏔️', 
        originLat: 28.2150, 
        originLon: 85.3850,
        destLat: 28.2580,
        destLon: 85.4200,
        lat: 28.2150, 
        lon: 85.3850,
        blockedRoad: 'Bhote Koshi & Trishuli River Valley Pass',
        safeRoute: 'Himalayan High Ridge Plateau Bypass',
        shelter: 'Langtang High Ridge Emergency Camp (Elev: 2,800m)',
        estTime: '20 mins (High Plateau)'
      },
      nepal: { 
        name: 'Kathmandu Valley, Nepal 🏔️', 
        originLat: 27.7172, 
        originLon: 85.3240,
        destLat: 27.7520,
        destLon: 85.3650,
        lat: 27.7172, 
        lon: 85.3240,
        blockedRoad: 'Bagmati River Low Bridge',
        safeRoute: 'Himalayan Ring Road Bypass East',
        shelter: 'High Plateau Community Shelter (Elev: 1,400m)',
        estTime: '18 mins (High Ground)'
      },
      austin: { 
        name: 'Austin, Texas', 
        originLat: 30.2672, 
        originLon: -97.7431,
        destLat: 30.3220,
        destLon: -97.7150,
        lat: 30.2672, 
        lon: -97.7431,
        blockedRoad: 'Creek Blvd Low-Water Crossing',
        safeRoute: 'I-35 High Elevation Bridge North',
        shelter: 'High Ridge School Shelter (Elev: 240m)',
        estTime: '12 mins (Safe Vector)'
      },
      grandcanyon: { 
        name: 'Grand Canyon, Arizona 🏜️', 
        originLat: 36.1069, 
        originLon: -112.1129,
        destLat: 36.1450,
        destLon: -112.0800,
        lat: 36.1069, 
        lon: -112.1129,
        blockedRoad: 'Bright Angel Trail Creek Crossing',
        safeRoute: 'South Rim Plateau Trail',
        shelter: 'Grand Canyon Rim Visitor Center (Elev: 2,100m)',
        estTime: '25 mins (Plateau Vector)'
      },
      miami: { 
        name: 'Miami, Florida 🌴', 
        originLat: 25.7617, 
        originLon: -80.1918,
        destLat: 25.8050,
        destLon: -80.1600,
        lat: 25.7617, 
        lon: -80.1918,
        blockedRoad: 'Biscayne Lowland Tunnel',
        safeRoute: 'I-95 Elevated Expressway North',
        shelter: 'High Elevation Civic Shelter',
        estTime: '15 mins (Clear Viaduct)'
      }
    };

    this.currentLocationKey = 'nepal_glacial';

    this.state = {
      rainRate: 12.0,
      riverLevel: 1.80,
      soilMoisture: 45,
      locationName: this.locations.nepal_glacial.name,
      blockedRoad: this.locations.nepal_glacial.blockedRoad,
      safeRoute: this.locations.nepal_glacial.safeRoute,
      shelter: this.locations.nepal_glacial.shelter,
      estTime: this.locations.nepal_glacial.estTime,
      isLive: true,
      lastUpdated: 'Just now',
      riskTier: 0
    };

    this.listeners = [];
    this.pollInterval = null;

    this.fetchLiveRealTimeData();
    this.startAutoPolling();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.evaluateRiskTier();
    this.listeners.forEach(fn => fn(this.state));
  }

  setLocation(locKey) {
    if (this.locations[locKey]) {
      this.currentLocationKey = locKey;
      const loc = this.locations[locKey];
      this.state.locationName = loc.name;
      this.state.blockedRoad = loc.blockedRoad;
      this.state.safeRoute = loc.safeRoute;
      this.state.shelter = loc.shelter;
      this.state.estTime = loc.estTime;

      this.fetchLiveRealTimeData();
    }
  }

  async fetchLiveRealTimeData() {
    const loc = this.locations[this.currentLocationKey];
    if (!loc) return;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.originLat}&longitude=${loc.originLon}&current=precipitation,rain,showers,soil_moisture_0_to_1cm`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API fetch failed');

      const data = await res.json();
      const currentRain = (data.current?.precipitation || 0) + (data.current?.rain || 0) + (data.current?.showers || 0);
      const rawSoil = data.current?.soil_moisture_0_to_1cm ?? 0.35;
      const soilPercent = Math.min(100, Math.max(10, Math.round(rawSoil * 200)));

      const baseRiver = (this.currentLocationKey.includes('nepal') || this.currentLocationKey === 'grandcanyon') ? 2.8 : 1.5;
      const calculatedRiver = Math.min(8.0, baseRiver + (currentRain * 0.08) + (soilPercent * 0.015));

      this.state.rainRate = parseFloat(currentRain.toFixed(1));
      this.state.soilMoisture = soilPercent;
      this.state.riverLevel = parseFloat(calculatedRiver.toFixed(2));
      this.state.lastUpdated = new Date().toLocaleTimeString();

      this.notify();
    } catch (err) {
      console.warn('Real-time API fetch fallback:', err);
    }
  }

  startAutoPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (this.state.isLive) {
        this.fetchLiveRealTimeData();
      }
    }, 20000);
  }

  setScenario(preset) {
    this.state.isLive = false;

    switch (preset) {
      case 'baseline':
        this.state.rainRate = 12.0;
        this.state.riverLevel = 1.80;
        this.state.soilMoisture = 45;
        break;

      case 'cloudburst':
        this.state.rainRate = 88.5;
        this.state.riverLevel = 3.90;
        this.state.soilMoisture = 82;
        break;

      case 'dam_release':
        this.state.rainRate = 45.0;
        this.state.riverLevel = 7.50; // Glacial avalanche 30-foot water surge
        this.state.soilMoisture = 94;
        break;
    }

    this.notify();
  }

  evaluateRiskTier() {
    const { rainRate, riverLevel, soilMoisture } = this.state;

    if (riverLevel >= 5.5 || (rainRate >= 80 && soilMoisture >= 85)) {
      this.state.riskTier = 3;
    } else if (riverLevel >= 4.2 || (rainRate >= 50 && soilMoisture >= 70)) {
      this.state.riskTier = 2;
    } else if (riverLevel >= 3.0 || rainRate >= 35) {
      this.state.riskTier = 1;
    } else {
      this.state.riskTier = 0;
    }
  }
}
