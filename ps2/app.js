const state = {
  running: true,
  tick: 0,
  rangeMinutes: 30,
  telemetry: [],
  replayTimer: null,
  replayRunning: false,
  settings: {
    missionProfile: "cruise",
    altitude: 7000,
    temperature: 42,
    humidity: 30,
    wind: 18,
    throttle: 82,
    duration: 120,
  },
};

const profiles = {
  takeoff: { missionProfile: "takeoff", altitude: 900, temperature: 28, humidity: 50, wind: 12, throttle: 96, duration: 12 },
  climb: { missionProfile: "climb", altitude: 3600, temperature: 22, humidity: 38, wind: 24, throttle: 88, duration: 35 },
  "hot-endurance": { missionProfile: "cruise", altitude: 7000, temperature: 42, humidity: 30, wind: 18, throttle: 82, duration: 120 },
  loiter: { missionProfile: "loiter", altitude: 5200, temperature: 18, humidity: 45, wind: 10, throttle: 58, duration: 240 },
  descent: { missionProfile: "descent", altitude: 2600, temperature: 16, humidity: 60, wind: 20, throttle: 38, duration: 30 },
  cold: { missionProfile: "cruise", altitude: 6500, temperature: -12, humidity: 24, wind: 35, throttle: 70, duration: 90 },
};

const missionReplayProfiles = {
  "mission-001": { name: "Mission 001", altitude: 7200, temperature: 41, humidity: 28, throttle: 84, duration: 135, missionProfile: "cruise" },
  "mission-002": { name: "Mission 002", altitude: 4800, temperature: 24, humidity: 44, throttle: 56, duration: 260, missionProfile: "loiter" },
  "mission-003": { name: "Mission 003", altitude: 3000, temperature: 31, humidity: 35, throttle: 92, duration: 45, missionProfile: "transition" },
};

const seriesConfig = [
  { key: "rpm", label: "RPM (x100)", color: "#28a8ff", scale: (v) => v / 30 },
  { key: "cht", label: "CHT (\u00b0C)", color: "#ff5865", scale: (v) => v * 3.15 },
  { key: "egt", label: "EGT (\u00b0C)", color: "#ffad32", scale: (v) => v },
  { key: "oilPressure", label: "Oil Pressure (bar)", color: "#31e486", scale: (v) => v * 35 },
  { key: "fuelFlow", label: "Fuel Flow (L/hr)", color: "#b070ff", scale: (v) => v * 24 },
  { key: "vibration", label: "Vibration (g)", color: "#39d6ff", scale: (v) => v * 42 },
];

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  renderLegend();
  hydrateHistory();
  bindEvents();
  updateClock();
  applySettingsToInputs();
  pushTelemetry(true);
  renderAll();
  setInterval(updateClock, 1000);
  setInterval(() => {
    if (!state.running) return;
    state.tick += 1;
    pushTelemetry();
    renderAll();
  }, 1000);
});

function cacheElements() {
  [
    "clock", "streamToggle", "kpiRpm", "kpiCht", "kpiEgt", "kpiOil", "kpiFuel", "kpiVibration",
    "rpmTrend", "chtTrend", "egtTrend", "fuelTrend", "vibrationTrend", "calloutRpm", "calloutFuel",
    "calloutCht", "calloutEgt", "calloutOil", "calloutVibe", "engineParamList", "subsystemList",
    "healthIndex", "healthLabel", "advisoryRul", "advisoryRisk", "advisoryCause", "advisoryRecommendation",
    "trendChart", "chartTooltip", "chartLegend", "rangeSelect", "resetZoom", "missionProfile", "altitude",
    "temperature", "humidity", "wind", "throttle", "duration", "altitudeValue", "temperatureValue",
    "humidityValue", "windValue", "throttleValue", "resetSimulation", "faultTable", "rulValue",
    "confidenceValue", "degradationValue", "degradationChart", "degradationTrend", "missionReplaySelect",
    "playReplay", "pauseReplay", "resetReplay", "replayTimeline", "replaySummary", "engineStage",
    "thermalCombustionTemp", "thermalHeadTemp", "thermalOilTemp", "thermalCoolingTemp",
    "thermalGenerated", "thermalRejected", "thermalBalance", "thermalAirDensity", "thermalGradient",
    "thermalStress", "thermalBarHeat", "thermalBarCooling", "thermalBarMargin", "thermalEquation", "heatFlowText",
    "cycleStroke", "cycleState", "cycleChart", "cycleMap", "cycleCompressionRatio", "cycleCompressionPressure",
    "cyclePeakPressure", "cycleBmep", "cycleEfficiency",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((link) => link.classList.remove("active"));
      item.classList.add("active");
    });
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      elements.engineStage.classList.toggle("external", button.dataset.view === "external");
    });
  });

  elements.streamToggle.addEventListener("click", () => {
    state.running = !state.running;
    elements.streamToggle.textContent = state.running ? "II" : ">";
    elements.streamToggle.ariaLabel = state.running ? "Pause live stream" : "Start live stream";
    elements.streamToggle.title = elements.streamToggle.ariaLabel;
  });

  ["missionProfile", "altitude", "temperature", "humidity", "wind", "throttle", "duration"].forEach((id) => {
    elements[id].addEventListener("input", () => {
      state.settings[id] = id === "missionProfile" ? elements[id].value : Number(elements[id].value);
      updateInputOutputs();
      pushTelemetry();
      renderAll();
    });
  });

  document.getElementById("simulationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.tick = 0;
    hydrateHistory();
    renderAll();
  });

  elements.resetSimulation.addEventListener("click", () => {
    state.settings = { ...profiles["hot-endurance"] };
    state.tick = 0;
    hydrateHistory();
    applySettingsToInputs();
    renderAll();
  });

  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-profile]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.settings = { ...profiles[button.dataset.profile] };
      state.tick = 0;
      hydrateHistory();
      applySettingsToInputs();
      renderAll();
    });
  });

  elements.rangeSelect.addEventListener("change", () => {
    state.rangeMinutes = Number(elements.rangeSelect.value);
    hydrateHistory();
    renderAll();
  });

  elements.resetZoom.addEventListener("click", () => {
    state.rangeMinutes = 30;
    elements.rangeSelect.value = "30";
    hydrateHistory();
    renderAll();
  });

  elements.trendChart.addEventListener("mousemove", showChartTooltip);
  elements.trendChart.addEventListener("mouseleave", () => {
    elements.chartTooltip.hidden = true;
  });

  elements.missionReplaySelect.addEventListener("change", () => updateReplaySummary());
  elements.replayTimeline.addEventListener("input", () => updateReplaySummary());
  elements.playReplay.addEventListener("click", playReplay);
  elements.pauseReplay.addEventListener("click", pauseReplay);
  elements.resetReplay.addEventListener("click", resetReplay);

  window.addEventListener("resize", () => {
    drawTrendChart();
    drawDegradationChart(currentTelemetry());
    drawCycleChart(currentTelemetry());
  });
}

function updateClock() {
  const now = new Date();
  elements.clock.dateTime = now.toISOString();
  elements.clock.innerHTML = `${now.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}<br />${now.toLocaleTimeString()}`;
}

function applySettingsToInputs() {
  Object.entries(state.settings).forEach(([key, value]) => {
    elements[key].value = value;
  });
  updateInputOutputs();
}

function updateInputOutputs() {
  elements.altitudeValue.value = elements.altitude.value;
  elements.temperatureValue.value = elements.temperature.value;
  elements.humidityValue.value = elements.humidity.value;
  elements.windValue.value = elements.wind.value;
  elements.throttleValue.value = elements.throttle.value;
}

function hydrateHistory() {
  state.telemetry = [];
  const samples = state.rangeMinutes + 1;
  for (let i = samples - 1; i >= 0; i -= 1) {
    state.telemetry.push(simulateTelemetry(state.settings, state.tick - i, -i));
  }
}

function pushTelemetry(force = false) {
  const next = simulateTelemetry(state.settings, state.tick, 0);
  if (force || state.telemetry.length === 0) {
    hydrateHistory();
    return;
  }
  state.telemetry.push(next);
  const maxSamples = state.rangeMinutes + 1;
  while (state.telemetry.length > maxSamples) {
    state.telemetry.shift();
  }
}

function simulateTelemetry(settings, tick, minuteOffset) {
  const dynamic = missionDynamics(settings, tick, minuteOffset);
  const model = {
    ...settings,
    altitude: dynamic.altitude,
    temperature: dynamic.temperature,
    humidity: dynamic.humidity,
    wind: dynamic.wind,
    throttle: dynamic.throttle,
  };

  const profileLoad = {
    takeoff: 1.18,
    climb: 1.08,
    cruise: 0.98,
    loiter: 0.76,
    descent: 0.55,
    transition: 1.12,
  }[model.missionProfile] || 1;

  const altitudeRatio = clamp(model.altitude / 10000, 0, 1.1);
  const densityFactor = clamp(1 - 0.58 * altitudeRatio, 0.42, 1);
  const throttleRatio = model.throttle / 100;
  const tempStress = clamp((model.temperature - 15) / 45, -0.75, 1.3);
  const humidityStress = model.humidity / 250;
  const windStress = model.wind / 260;
  const enduranceStress = Math.log1p(model.duration) / Math.log(721);
  const transitionWave = model.missionProfile === "transition" ? Math.sin(tick / 2.2) * 0.12 : 0;
  const pulse = Math.sin((tick + minuteOffset * 3) / 5) * 0.018 + Math.sin((tick + minuteOffset) / 13) * 0.012;
  const load = clamp(throttleRatio * profileLoad + transitionWave, 0.2, 1.24);
  const thermalStress = clamp((load * 0.52 + tempStress * 0.28 + altitudeRatio * 0.22 + enduranceStress * 0.12 + humidityStress) * dynamic.thermalLag + dynamic.transientStress * 0.08, 0, 1.45);
  const combustionStress = clamp(load * 0.5 + altitudeRatio * 0.35 + tempStress * 0.12 + dynamic.transientStress * 0.12, 0, 1.35);
  const vibrationStress = clamp(load * 0.35 + windStress + enduranceStress * 0.18 + dynamic.transientStress * 0.72, 0, 1.25);

  const rpm = round(clamp(740 + load * 2200 * densityFactor + pulse * 1200 + dynamic.rpmSurge, 720, 3100), 0);
  const cht = round(clamp(92 + thermalStress * 108 + pulse * 22 + dynamic.thermalSoak, 80, 238), 0);
  const egt = round(clamp(455 + combustionStress * 275 + tempStress * 34 + pulse * 45 + dynamic.exhaustPulse, 410, 850), 0);
  const fuelFlow = round(clamp(2.8 + load * 11.5 + altitudeRatio * 1.6 + (model.missionProfile === "takeoff" ? 2.2 : 0) + dynamic.fuelPulse, 2.5, 19), 1);
  const oilPressure = round(clamp(4.9 - thermalStress * 0.7 + (1 - load) * 0.25 + pulse * 0.3, 2.6, 5.4), 1);
  const oilTemp = round(clamp(72 + thermalStress * 42 + tempStress * 10, 65, 135), 0);
  const vibration = round(clamp(0.22 + vibrationStress * 0.75 + pulse * 1.4, 0.18, 1.65), 2);
  const battery = round(clamp(28.4 - load * 0.25 - altitudeRatio * 0.08, 26.7, 28.6), 1);
  const heatInput = round(fuelFlow * 8.9, 1);
  const shaftPower = round(clamp(load * 56 * densityFactor, 7, 58), 1);
  const rejectedHeat = round(clamp(heatInput - shaftPower * 0.42 + thermalStress * 8, 28, 155), 1);
  const coolingCapacity = round(clamp(92 * densityFactor + model.wind * 0.28 - Math.max(0, model.temperature - 15) * 0.36 - load * 3.5, 36, 118), 1);
  const thermalBalance = round(rejectedHeat - coolingCapacity, 1);
  const coolingMargin = round(clamp((coolingCapacity / rejectedHeat) * 100, 35, 165), 0);
  const airDensity = round(1.225 * densityFactor, 2);
  const headOilGradient = round(cht - oilTemp, 0);
  const combustionTemp = round(clamp(egt + 315 + load * 92, 820, 1290), 0);
  const coolingAirTemp = round(clamp(settings.temperature + thermalStress * 17 - densityFactor * 5, -20, 88), 0);
  const cycle = calculateThermodynamicCycle(model, {
    rpm,
    fuelFlow,
    egt,
    load,
    densityFactor,
    thermalStress,
    combustionStress,
    altitudeRatio,
    dynamic,
  });
  const degradation = round(clamp(4 + thermalStress * 8.5 + vibrationStress * 6.8 + enduranceStress * 5.2, 2, 42), 1);
  const health = round(clamp(100 - degradation - Math.max(0, cht - 190) * 0.34 - Math.max(0, vibration - 0.95) * 10, 38, 98), 0);
  const rul = round(clamp(178 - degradation * 4.1 - thermalStress * 18 - vibrationStress * 14, 18, 170), 0);
  const confidence = round(clamp(94 - vibrationStress * 7 - altitudeRatio * 3 + (settings.duration < 30 ? -5 : 0), 72, 96), 0);

  return {
    time: new Date(Date.now() + minuteOffset * 60000),
    minute: minuteOffset,
    rpm,
    cht,
    egt,
    fuelFlow,
    oilPressure,
    oilTemp,
    vibration,
    battery,
    timing: round(18 + load * 7 - altitudeRatio * 2, 0),
    health,
    rul,
    confidence,
    degradation,
    thermalStress,
    combustionStress,
    vibrationStress,
    densityFactor,
    heatInput,
    shaftPower,
    rejectedHeat,
    coolingCapacity,
    thermalBalance,
    coolingMargin,
    airDensity,
    headOilGradient,
    combustionTemp,
    coolingAirTemp,
    cycle,
  };
}

function calculateThermodynamicCycle(model, values) {
  const gamma = 1.36;
  const displacementLiters = 1.8;
  const compressionRatio = round(clamp(8.6 - values.altitudeRatio * 0.25 + values.load * 0.18, 8.2, 9.1), 1);
  const ambientPressure = 101.3 * Math.pow(Math.max(0.35, 1 - 2.25577e-5 * model.altitude), 5.2559);
  const throttleRestriction = 0.32 + (model.throttle / 100) * 0.66;
  const manifoldPressure = round(clamp(ambientPressure * throttleRestriction, 28, 102), 0);
  const intakeTempK = model.temperature + 273.15 + values.thermalStress * 18;
  const compressionTempK = intakeTempK * Math.pow(compressionRatio, gamma - 1);
  const compressionPressureMpa = (manifoldPressure * Math.pow(compressionRatio, gamma)) / 1000;
  const heatReleaseFactor = clamp(3.2 + values.combustionStress * 2.05 + values.dynamic.transientStress * 0.9 + values.load * 2.85, 4, 8.4);
  const peakPressureMpa = clamp(compressionPressureMpa * heatReleaseFactor, 1.6, 7.8);
  const peakTempK = clamp(compressionTempK * (1.18 + values.combustionStress * 0.72), 760, 1650);
  const expansionTempK = clamp(peakTempK / Math.pow(compressionRatio, gamma - 1), 520, 980);
  const exhaustPressureMpa = clamp(manifoldPressure / 1000 + values.load * 0.11 + values.thermalStress * 0.035, 0.11, 0.34);
  const brakePowerKw = clamp((values.rpm * values.load * values.densityFactor) / 65, 8, 62);
  const bmepMpa = round(clamp((120 * brakePowerKw) / (displacementLiters * Math.max(values.rpm, 700)), 0.22, 1.25), 2);
  const ottoEfficiency = round(clamp((1 - 1 / Math.pow(compressionRatio, gamma - 1)) * 100 - values.thermalStress * 4.5, 24, 38), 0);
  const crankAngle = ((state.tick * Math.max(values.rpm, 700) / 60) * 360) % 720;
  const stroke = crankAngle < 180
    ? "Intake"
    : crankAngle < 360
      ? "Compression"
      : crankAngle < 390
        ? "Combustion"
        : crankAngle < 540
          ? "Expansion"
          : "Exhaust";
  const stateText = {
    Intake: "Charge entering cylinder",
    Compression: "Mixture pressure rising",
    Combustion: "Heat addition near TDC",
    Expansion: "Power producing stroke",
    Exhaust: "Heat rejection and scavenging",
  }[stroke];

  return {
    gamma,
    compressionRatio,
    manifoldPressure,
    intakeTempC: round(intakeTempK - 273.15, 0),
    compressionTempC: round(compressionTempK - 273.15, 0),
    peakTempC: round(peakTempK - 273.15, 0),
    expansionTempC: round(expansionTempK - 273.15, 0),
    compressionPressureMpa: round(compressionPressureMpa, 2),
    peakPressureMpa: round(peakPressureMpa, 2),
    exhaustPressureMpa: round(exhaustPressureMpa, 2),
    bmepMpa,
    ottoEfficiency,
    brakePowerKw: round(brakePowerKw, 1),
    stroke,
    stateText,
    crankAngle: round(crankAngle, 0),
  };
}

function missionDynamics(settings, tick, minuteOffset) {
  const horizon = Math.max(12, state.rangeMinutes || 30);
  const elapsed = clamp(horizon + minuteOffset, 0, horizon);
  const progress = elapsed / horizon;
  const eased = smoothstep(progress);
  const engineBeat = Math.sin((elapsed + tick * 0.04) * 1.35);
  const slowWave = Math.sin((elapsed + tick * 0.08) / 4.2);
  const longerWave = Math.sin((elapsed + tick * 0.03) / 8.5);
  let throttle = settings.throttle;
  let altitude = settings.altitude;
  let temperature = settings.temperature;
  let humidity = settings.humidity;
  let wind = settings.wind;
  let transientStress = 0;
  let rpmSurge = 0;
  let exhaustPulse = 0;
  let fuelPulse = 0;

  if (settings.missionProfile === "takeoff") {
    throttle = settings.throttle * (0.68 + 0.34 * eased) + engineBeat * 1.4;
    altitude = settings.altitude * (0.45 + 0.55 * eased);
    transientStress = 0.2 + (1 - Math.exp(-elapsed / 2.8)) * 0.22;
    rpmSurge = 90 * Math.exp(-elapsed / 5);
  } else if (settings.missionProfile === "climb") {
    throttle = settings.throttle + 4 * Math.sin(progress * Math.PI * 1.4) + slowWave * 1.8;
    altitude = settings.altitude * (0.62 + 0.38 * eased);
    transientStress = Math.abs(Math.sin(progress * Math.PI)) * 0.16;
  } else if (settings.missionProfile === "loiter") {
    throttle = settings.throttle - 4 + slowWave * 4.8 + longerWave * 2.1;
    altitude = settings.altitude + slowWave * 95;
    wind = settings.wind + longerWave * 4;
  } else if (settings.missionProfile === "descent") {
    throttle = settings.throttle * (1.18 - 0.48 * eased) + slowWave * 1.5;
    altitude = settings.altitude * (1.08 - 0.48 * eased);
    temperature = settings.temperature + eased * 3;
  } else if (settings.missionProfile === "transition") {
    const transient = Math.sin(progress * Math.PI * 6);
    throttle = settings.throttle + transient * 18 + Math.sin(elapsed * 1.7) * 4;
    transientStress = Math.abs(transient) * 0.55;
    rpmSurge = transient * 120;
    exhaustPulse = Math.max(0, transient) * 34;
    fuelPulse = Math.max(0, transient) * 1.4;
  } else {
    throttle = settings.throttle + slowWave * 2.4 + longerWave * 1.6;
    altitude = settings.altitude + longerWave * 120;
    wind = settings.wind + slowWave * 3;
  }

  const thermalLag = clamp(0.62 + 0.4 * (1 - Math.exp(-(elapsed + 3) / 9)), 0.58, 1.05);
  const thermalSoak = (1 - Math.exp(-(elapsed + 1) / 13)) * (settings.duration / 720) * 18;
  temperature += longerWave * 1.2;
  humidity = clamp(humidity + slowWave * 2.5, 0, 100);

  return {
    altitude: clamp(altitude, 0, 10000),
    temperature: clamp(temperature, -20, 50),
    humidity,
    wind: clamp(wind, 0, 70),
    throttle: clamp(throttle + engineBeat * 0.8, 20, 100),
    thermalLag,
    thermalSoak,
    transientStress,
    rpmSurge,
    exhaustPulse,
    fuelPulse,
  };
}

function renderAll() {
  const current = currentTelemetry();
  renderKpis(current);
  renderEngineParams(current);
  renderHealth(current);
  renderAdvisory(current);
  renderThermalModel(current);
  renderFaults(current);
  drawTrendChart();
  drawDegradationChart(current);
  drawCycleChart(current);
  updateReplaySummary();
}

function currentTelemetry() {
  return state.telemetry[state.telemetry.length - 1] || simulateTelemetry(state.settings, state.tick, 0);
}

function renderKpis(t) {
  elements.kpiRpm.textContent = t.rpm;
  elements.kpiCht.textContent = t.cht;
  elements.kpiEgt.textContent = t.egt;
  elements.kpiOil.textContent = t.oilPressure.toFixed(1);
  elements.kpiFuel.textContent = t.fuelFlow.toFixed(1);
  elements.kpiVibration.textContent = t.vibration.toFixed(2);
  elements.calloutRpm.textContent = t.rpm;
  elements.calloutFuel.textContent = `${t.fuelFlow.toFixed(1)} L/hr`;
  elements.calloutCht.textContent = `${t.cht} \u00b0C`;
  elements.calloutEgt.textContent = `${t.egt} \u00b0C`;
  elements.calloutOil.textContent = `${t.oilPressure.toFixed(1)} bar`;
  elements.calloutVibe.textContent = `${t.vibration.toFixed(2)} g`;

  elements.rpmTrend.textContent = t.rpm > 2650 ? "High load" : t.rpm < 1450 ? "Low load" : "Stable";
  elements.chtTrend.textContent = t.cht > 195 ? "Thermal warning" : "Within range";
  elements.egtTrend.textContent = t.egt > 760 ? "Elevated" : "Nominal";
  elements.fuelTrend.textContent = t.fuelFlow > 14 ? "High burn" : "Load coupled";
  elements.vibrationTrend.textContent = t.vibration > 1 ? "Watch" : "Within limit";

  setKpiState("cht", t.cht > 220 ? "critical" : t.cht > 190 ? "warning" : "healthy");
  setKpiState("egt", t.egt > 810 ? "critical" : t.egt > 745 ? "warning" : "healthy");
  setKpiState("oil", t.oilPressure < 3.1 ? "critical" : t.oilPressure < 3.7 ? "warning" : "healthy");
  setKpiState("vibe", t.vibration > 1.25 ? "critical" : t.vibration > 0.95 ? "warning" : "healthy");
}

function setKpiState(name, status) {
  const card = document.querySelector(`[data-kpi="${name}"]`);
  card.classList.remove("healthy", "warning", "critical", "neutral");
  card.classList.add(status);
}

function renderEngineParams(t) {
  const params = [
    ["RPM", `${t.rpm} rpm`],
    ["CHT", `${t.cht} \u00b0C`],
    ["EGT", `${t.egt} \u00b0C`],
    ["Oil Pressure", `${t.oilPressure.toFixed(1)} bar`],
    ["Oil Temperature", `${t.oilTemp} \u00b0C`],
    ["Fuel Flow", `${t.fuelFlow.toFixed(1)} L/hr`],
    ["Vibration (RMS)", `${t.vibration.toFixed(2)} g`],
    ["Battery Voltage", `${t.battery.toFixed(1)} V`],
    ["Injection Timing", `${t.timing} \u00b0BTDC`],
  ];
  elements.engineParamList.innerHTML = params.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
}

function renderHealth(t) {
  const status = t.health < 62 ? "critical" : t.health < 78 ? "warning" : "healthy";
  const labels = { healthy: "Good", warning: "Watch", critical: "Degraded" };
  const gauge = document.querySelector(".gauge");
  const arc = document.getElementById("healthArc");
  gauge.style.setProperty("--score", t.health);
  arc.style.stroke = status === "critical" ? "var(--red)" : status === "warning" ? "var(--amber)" : "var(--green)";
  elements.healthIndex.textContent = t.health;
  elements.healthLabel.textContent = labels[status];
  elements.healthLabel.style.color = status === "critical" ? "var(--red)" : status === "warning" ? "var(--amber)" : "var(--green)";

  const subsystems = [
    ["Combustion", t.combustionStress],
    ["Cooling / Thermal", t.thermalStress],
    ["Lubrication", t.oilPressure < 3.7 ? 0.9 : 0.35],
    ["Vibration", t.vibrationStress],
    ["Fuel System", t.fuelFlow > 15.5 ? 0.8 : 0.4],
    ["Electrical System", t.battery < 27.1 ? 0.9 : 0.25],
    ["Sensor Confidence", (100 - t.confidence) / 40],
  ];

  const summary = [
    [status === "critical" ? "Critical Fault Watch" : status === "warning" ? "Active Watch Items" : "All Systems Nominal", status],
    ["No Active Critical Faults", status === "critical" ? "warning" : "healthy"],
    ["Operating Within Limits", status === "critical" ? "warning" : "healthy"],
    [`Mission Fit: ${t.health > 64 ? "YES" : "CONDITIONAL"}`, t.health > 64 ? "healthy" : "warning"],
  ];

  elements.subsystemList.innerHTML = [...summary, ...subsystems.map(([name, stress]) => [name, stress > 1 ? "critical" : stress > 0.74 ? "warning" : "healthy"])]
    .map(([label, itemStatus]) => `<li><span class="status-dot ${itemStatus === "healthy" ? "" : itemStatus}"></span>${label}</li>`)
    .join("");
}

function renderAdvisory(t) {
  const advisory = buildAdvisory(t);
  elements.advisoryRul.textContent = t.rul;
  elements.advisoryRisk.textContent = advisory.risk;
  elements.advisoryCause.textContent = advisory.cause;
  elements.advisoryRecommendation.textContent = advisory.recommendation;
}

function renderThermalModel(t) {
  const balanceText = `${t.thermalBalance >= 0 ? "+" : ""}${t.thermalBalance.toFixed(1)}`;
  elements.thermalCombustionTemp.textContent = `${t.combustionTemp} C`;
  elements.thermalHeadTemp.textContent = `${t.cht} C`;
  elements.thermalOilTemp.textContent = `${t.oilTemp} C`;
  elements.thermalCoolingTemp.textContent = `${t.coolingAirTemp} C`;
  elements.thermalGenerated.textContent = t.rejectedHeat.toFixed(1);
  elements.thermalRejected.textContent = t.coolingCapacity.toFixed(1);
  elements.thermalBalance.textContent = balanceText;
  elements.thermalAirDensity.textContent = t.airDensity.toFixed(2);
  elements.thermalGradient.textContent = t.headOilGradient;
  elements.thermalStress.textContent = Math.round(clamp(t.thermalStress / 1.25, 0, 1) * 100);
  elements.thermalBarHeat.style.width = `${clamp((t.rejectedHeat / 150) * 100, 6, 100)}%`;
  elements.thermalBarCooling.style.width = `${clamp((t.coolingCapacity / 120) * 100, 6, 100)}%`;
  elements.thermalBarMargin.style.width = `${clamp(t.coolingMargin, 6, 100)}%`;
  elements.thermalEquation.textContent = `Qnet = Qrejected - Qcooling = ${balanceText} kW`;
  elements.heatFlowText.textContent = t.thermalBalance > 8
    ? "Heat rejection is above cooling capacity; CHT will trend upward in this scenario."
    : t.thermalBalance > 0
      ? "Cooling margin is narrow; thermal load is being monitored closely."
      : "Cooling capacity exceeds rejected heat; thermal state is stabilizing.";
  elements.thermalBalance.parentElement.style.color = t.thermalBalance > 8 ? "var(--red)" : t.thermalBalance > 0 ? "var(--amber)" : "var(--green)";
  elements.cycleStroke.textContent = t.cycle.stroke;
  elements.cycleState.textContent = t.cycle.stateText;
  elements.cycleMap.textContent = t.cycle.manifoldPressure;
  elements.cycleCompressionRatio.textContent = t.cycle.compressionRatio.toFixed(1);
  elements.cycleCompressionPressure.textContent = t.cycle.compressionPressureMpa.toFixed(2);
  elements.cyclePeakPressure.textContent = t.cycle.peakPressureMpa.toFixed(2);
  elements.cycleBmep.textContent = t.cycle.bmepMpa.toFixed(2);
  elements.cycleEfficiency.textContent = t.cycle.ottoEfficiency;
  document.querySelectorAll("[data-cycle-step]").forEach((item) => {
    item.classList.toggle("active", item.dataset.cycleStep === t.cycle.stroke.toLowerCase());
  });
}

function buildAdvisory(t) {
  if (t.cht > 205 || t.egt > 790) {
    return {
      risk: "Increasing thermal stress",
      cause: "Prolonged high-load operation in hot or thin-air conditions",
      recommendation: "Inspect cooling system and injector condition before extending mission duration.",
    };
  }
  if (t.vibration > 1.05) {
    return {
      risk: "Abnormal vibration trend",
      cause: "Rapid throttle transition, wind loading, or mounting imbalance",
      recommendation: "Reduce transient throttle changes and schedule vibration inspection.",
    };
  }
  if (t.oilPressure < 3.7) {
    return {
      risk: "Lubrication margin reducing",
      cause: "Elevated oil temperature under sustained load",
      recommendation: "Check lubricant level, cooling airflow, and oil temperature trend.",
    };
  }
  return {
    risk: "Low active anomaly likelihood",
    cause: "Stable operating envelope and consistent sensor confidence",
    recommendation: "Continue monitoring; no immediate maintenance action in prototype model.",
  };
}

function renderFaults(t) {
  const faults = [
    ["Misfire", t.combustionStress * 18 + t.vibrationStress * 8],
    ["Injector abnormality", t.fuelFlow > 14 ? 22 + t.combustionStress * 18 : 10 + t.combustionStress * 10],
    ["Lubrication issue", t.oilPressure < 3.7 ? 38 + (3.7 - t.oilPressure) * 20 : 8 + t.thermalStress * 8],
    ["Sensor drift/failure", 7 + (100 - t.confidence) * 0.7],
    ["Combustion instability", 12 + t.combustionStress * 28],
    ["Overheating trend", 9 + t.thermalStress * 42],
    ["Abnormal vibration", 8 + t.vibrationStress * 43],
  ];

  elements.faultTable.innerHTML = faults.map(([condition, raw]) => {
    const probability = clamp(Math.round(raw), 2, 92);
    const severity = probability > 62 ? "High" : probability > 32 ? "Medium" : "Low";
    const status = probability > 62 ? "ALERT" : probability > 32 ? "WATCH" : "NORMAL";
    const badgeClass = probability > 62 ? "critical" : probability > 32 ? "warning" : "";
    return `<tr><td>${condition}</td><td>${probability}%</td><td>${severity}</td><td><span class="badge ${badgeClass}">${status}</span></td></tr>`;
  }).join("");

  elements.rulValue.textContent = `${t.rul} h`;
  elements.confidenceValue.textContent = `${t.confidence}%`;
  elements.degradationValue.textContent = `${t.degradation.toFixed(1)}%`;
  elements.degradationTrend.textContent = `Trend: ${t.degradation > 25 ? "Accelerated degradation" : t.degradation > 15 ? "Moderate degradation" : "Slow degradation"}`;
}

function drawTrendChart() {
  const canvas = elements.trendChart;
  const ctx = prepareCanvas(canvas);
  const { width, height } = canvas.getBoundingClientRect();
  const pad = { top: 20, right: 18, bottom: 34, left: 52 };
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(103, 196, 255, 0.12)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((height - pad.top - pad.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = "#9bb6ce";
    ctx.font = "12px Segoe UI";
    ctx.fillText(`${100 - i * 25}%`, 8, y + 4);
  }

  for (let i = 0; i <= 6; i += 1) {
    const x = pad.left + ((width - pad.left - pad.right) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, height - pad.bottom);
    ctx.stroke();
    ctx.fillStyle = "#9bb6ce";
    ctx.fillText(String(Math.round((state.rangeMinutes * i) / 6)), x - 4, height - 10);
  }

  ctx.fillStyle = "#cce2f3";
  ctx.fillText("Time (minutes)", width / 2 - 42, height - 8);
  ctx.save();
  ctx.translate(16, height / 2 + 22);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Relative signal", 0, 0);
  ctx.restore();

  seriesConfig.forEach((series) => {
    const values = state.telemetry.map((point) => point[series.key]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = Math.max(maxValue - minValue, Math.abs(maxValue || 1) * 0.03, 1);
    const floor = minValue - range * 0.12;
    const ceiling = maxValue + range * 0.12;
    ctx.strokeStyle = series.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    state.telemetry.forEach((point, index) => {
      const x = pad.left + ((width - pad.left - pad.right) * index) / (state.telemetry.length - 1 || 1);
      const normalized = (point[series.key] - floor) / (ceiling - floor);
      const y = height - pad.bottom - (height - pad.top - pad.bottom) * clamp(normalized, 0, 1);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function drawDegradationChart(current) {
  const canvas = elements.degradationChart;
  const ctx = prepareCanvas(canvas);
  const { width, height } = canvas.getBoundingClientRect();
  const values = Array.from({ length: 22 }, (_, index) => clamp(current.degradation * (0.72 + index * 0.014) + Math.sin(index / 2) * 1.2, 0, 45));
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(103, 196, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = 15 + (height - 30) * (i / 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = current.degradation > 25 ? "#ff5865" : current.degradation > 15 ? "#ffb237" : "#31e486";
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = (width * index) / (values.length - 1);
    const y = height - 14 - ((height - 30) * value) / 45;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawCycleChart(current) {
  const canvas = elements.cycleChart;
  if (!canvas || !current.cycle) return;
  const ctx = prepareCanvas(canvas);
  const { width, height } = canvas.getBoundingClientRect();
  const pad = { top: 18, right: 24, bottom: 38, left: 54 };
  const points = buildCyclePoints(current.cycle);
  const maxPressure = Math.max(...points.map((point) => point.p)) * 1.12;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(103, 196, 255, 0.13)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#9bb6ce";
  ctx.font = "12px Segoe UI";

  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + ((height - pad.top - pad.bottom) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(`${round(maxPressure * (1 - i / 4), 1)}`, 8, y + 4);
  }

  for (let i = 0; i <= 4; i += 1) {
    const x = pad.left + ((width - pad.left - pad.right) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, height - pad.bottom);
    ctx.stroke();
  }

  ctx.fillStyle = "#cce2f3";
  ctx.fillText("Volume, relative", width / 2 - 44, height - 9);
  ctx.save();
  ctx.translate(16, height / 2 + 42);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Cylinder pressure, MPa", 0, 0);
  ctx.restore();

  const xFor = (v) => pad.left + ((width - pad.left - pad.right) * (v - 1)) / (current.cycle.compressionRatio - 1);
  const yFor = (p) => height - pad.bottom - ((height - pad.top - pad.bottom) * p) / maxPressure;
  const colors = {
    intake: "#39d6ff",
    compression: "#b070ff",
    combustion: "#ff5865",
    expansion: "#ffb237",
    exhaust: "#31e486",
  };

  ["intake", "compression", "combustion", "expansion", "exhaust"].forEach((phase) => {
    const phasePoints = points.filter((point) => point.phase === phase);
    ctx.strokeStyle = colors[phase];
    ctx.lineWidth = phase === current.cycle.stroke.toLowerCase() ? 4 : 2.4;
    ctx.beginPath();
    phasePoints.forEach((point, index) => {
      const x = xFor(point.v);
      const y = yFor(point.p);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  const labels = [
    ["Intake", current.cycle.compressionRatio * 0.78, current.cycle.manifoldPressure / 1000 + 0.06, colors.intake],
    ["Compression", current.cycle.compressionRatio * 0.48, current.cycle.compressionPressureMpa * 0.34, colors.compression],
    ["Heat add", 1.28, current.cycle.peakPressureMpa * 0.72, colors.combustion],
    ["Expansion", current.cycle.compressionRatio * 0.46, current.cycle.peakPressureMpa * 0.52, colors.expansion],
    ["Exhaust", current.cycle.compressionRatio * 0.7, current.cycle.exhaustPressureMpa + 0.18, colors.exhaust],
  ];
  labels.forEach(([label, v, p, color]) => {
    ctx.fillStyle = color;
    ctx.fillText(label, xFor(v), yFor(p));
  });
}

function buildCyclePoints(cycle) {
  const points = [];
  const gamma = cycle.gamma;
  const cr = cycle.compressionRatio;
  const intakeP = cycle.manifoldPressure / 1000;
  const exhaustP = cycle.exhaustPressureMpa;
  for (let i = 0; i <= 18; i += 1) {
    const v = 1 + (cr - 1) * (i / 18);
    points.push({ phase: "intake", v, p: intakeP * (0.96 + i / 500) });
  }
  for (let i = 0; i <= 24; i += 1) {
    const v = cr - (cr - 1) * (i / 24);
    points.push({ phase: "compression", v, p: intakeP * Math.pow(cr / v, gamma) });
  }
  for (let i = 0; i <= 8; i += 1) {
    const p = cycle.compressionPressureMpa + (cycle.peakPressureMpa - cycle.compressionPressureMpa) * smoothstep(i / 8);
    points.push({ phase: "combustion", v: 1, p });
  }
  for (let i = 0; i <= 26; i += 1) {
    const v = 1 + (cr - 1) * (i / 26);
    const p = cycle.peakPressureMpa / Math.pow(v, gamma);
    points.push({ phase: "expansion", v, p: Math.max(p, exhaustP + 0.06) });
  }
  for (let i = 0; i <= 18; i += 1) {
    const v = cr - (cr - 1) * (i / 18);
    points.push({ phase: "exhaust", v, p: exhaustP * (1 + Math.sin((i / 18) * Math.PI) * 0.2) });
  }
  return points;
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function renderLegend() {
  elements.chartLegend.innerHTML = seriesConfig.map((series) => `<span><i style="background:${series.color}"></i>${series.label}</span>`).join("");
}

function showChartTooltip(event) {
  const rect = elements.trendChart.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const index = clamp(Math.round(((x - 52) / Math.max(1, rect.width - 70)) * (state.telemetry.length - 1)), 0, state.telemetry.length - 1);
  const point = state.telemetry[index];
  if (!point) return;
  elements.chartTooltip.hidden = false;
  elements.chartTooltip.style.left = `${clamp(x + 14, 8, rect.width - 175)}px`;
  elements.chartTooltip.style.top = `${event.clientY - rect.top - 20}px`;
  elements.chartTooltip.innerHTML = [
    `<strong>${Math.abs(point.minute)} min ${point.minute === 0 ? "current" : "ago"}</strong>`,
    `RPM: ${point.rpm}`,
    `CHT: ${point.cht} \u00b0C`,
    `EGT: ${point.egt} \u00b0C`,
    `Oil: ${point.oilPressure.toFixed(1)} bar`,
    `Fuel: ${point.fuelFlow.toFixed(1)} L/hr`,
    `Vibration: ${point.vibration.toFixed(2)} g`,
  ].join("<br />");
}

function playReplay() {
  if (state.replayTimer) return;
  state.replayRunning = true;
  state.replayTimer = setInterval(() => {
    const next = Number(elements.replayTimeline.value) + 1;
    elements.replayTimeline.value = next > 100 ? 100 : next;
    updateReplaySummary();
    if (next >= 100) pauseReplay();
  }, 220);
}

function pauseReplay() {
  clearInterval(state.replayTimer);
  state.replayTimer = null;
  state.replayRunning = false;
}

function resetReplay() {
  pauseReplay();
  elements.replayTimeline.value = 0;
  updateReplaySummary();
}

function updateReplaySummary() {
  const profile = missionReplayProfiles[elements.missionReplaySelect.value];
  const pct = Number(elements.replayTimeline.value) / 100;
  const replaySettings = {
    ...state.settings,
    ...profile,
    throttle: profile.throttle + Math.sin(pct * Math.PI * 2) * (profile.missionProfile === "transition" ? 18 : 5),
  };
  const t = simulateTelemetry(replaySettings, Math.round(pct * profile.duration), -Math.round((1 - pct) * profile.duration));
  const advisory = buildAdvisory(t);
  elements.replaySummary.innerHTML = [
    [`${t.rpm} rpm`, "Replay RPM"],
    [`${t.health}%`, "Health Index"],
    [`${t.rul} h`, "Estimated RUL"],
    [advisory.risk, "Maintenance Advisory"],
  ].map(([value, label]) => `<div><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function smoothstep(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}
