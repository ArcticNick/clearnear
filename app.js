// Refocus App - Full SPA
(function() {
  'use strict';

  // --- STATE ---
  const defaultState = {
    device: 'phone',
    clarityLevel: 3,
    leftLevel: 0,
    rightLevel: 0,
    calibrated: false,
    darkMode: false,
    units: 'cm',
    sessions: 0,
    disclaimerCount: 0,
    estimatedDistanceCm: null,
    distanceBand: '--'
  };

  let state = loadState();

  function loadState() {
    try {
      const s = localStorage.getItem('refocusState');
      return s ? Object.assign({}, defaultState, JSON.parse(s)) : Object.assign({}, defaultState);
    } catch(e) { return Object.assign({}, defaultState); }
  }

  function saveState() {
    try { localStorage.setItem('refocusState', JSON.stringify(state)); } catch(e) {}
  }

  // --- SCREENS ---
  const screens = {
    home: document.getElementById('screen-home'),
    calibration: document.getElementById('screen-calibration'),
    devices: document.getElementById('screen-devices'),
    settings: document.getElementById('screen-settings'),
    insights: document.getElementById('screen-insights')
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[name]) screens[name].classList.add('active');
    // Update nav
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === name);
    });
    // Camera
    if (name === 'calibration') startCamera();
    else stopCamera();
    // Track session
    if (name === 'home') {
      state.sessions++;
      saveState();
    }
  }

  // --- BOTTOM NAV ---
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  // --- DISCLAIMER ---
  const disclaimerBanner = document.getElementById('disclaimer-banner');
  const btnDismiss = document.getElementById('btn-dismiss-disclaimer');
  if (state.disclaimerCount < 3) {
    disclaimerBanner.classList.remove('hidden');
    state.disclaimerCount++;
    saveState();
  }
  btnDismiss.addEventListener('click', () => disclaimerBanner.classList.add('hidden'));

  // --- DEVICE MODES ---
  const deviceDefaults = {
    phone: { clarity: 4, fontSize: 1.1 },
    tablet: { clarity: 3, fontSize: 1.2 },
    laptop: { clarity: 2, fontSize: 1.3 },
    tv: { clarity: 1, fontSize: 1.6 }
  };
  const modeLabels = { phone: 'Phone', tablet: 'Tablet', laptop: 'Laptop', tv: 'TV' };
  const btnMode = document.getElementById('btn-mode');
  btnMode.textContent = modeLabels[state.device] || 'Phone';
  btnMode.addEventListener('click', () => showScreen('devices'));

  document.querySelectorAll('.device-card').forEach(card => {
    if (card.dataset.device === state.device) card.classList.add('active');
    card.addEventListener('click', () => {
      document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.device = card.dataset.device;
      state.clarityLevel = deviceDefaults[state.device].clarity;
      saveState();
      btnMode.textContent = modeLabels[state.device];
      sliderClarity.value = state.clarityLevel;
      clarityValue.textContent = state.clarityLevel;
      updatePreview();
      showScreen('home');
    });
  });

  // --- HOME CLARITY SLIDER ---
  const sliderClarity = document.getElementById('slider-clarity');
  const clarityValue = document.getElementById('clarity-value');
  const previewText = document.getElementById('preview-text');
  sliderClarity.value = state.clarityLevel;
  clarityValue.textContent = state.clarityLevel;

  function updatePreview() {
    const level = parseInt(sliderClarity.value, 10);
    const baseFontSize = deviceDefaults[state.device]?.fontSize || 1.2;
    const fontSize = baseFontSize + (level * 0.08);
    previewText.style.fontSize = fontSize + 'rem';
    if (level <= 1) previewText.style.filter = 'blur(1.2px)';
    else if (level <= 2) previewText.style.filter = 'blur(0.4px)';
    else previewText.style.filter = 'none';
  }

  sliderClarity.addEventListener('input', () => {
    const v = parseInt(sliderClarity.value, 10);
    clarityValue.textContent = v;
    state.clarityLevel = v;
    saveState();
    updatePreview();
  });
  updatePreview();

  // --- SAVE BUTTON ---
  document.getElementById('btn-save-home').addEventListener('click', () => {
    saveState();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = 'Settings saved!';
    document.getElementById('screen-home').appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  });

  // --- CALIBRATION ---
  const btnCalibrate = document.getElementById('btn-calibrate');
  const btnCalBack = document.getElementById('btn-cal-back');
  const btnCalStep1Next = document.getElementById('btn-cal-step1-next');
  const btnCalSave = document.getElementById('btn-cal-save');
  const calStep1 = document.getElementById('cal-step-1');
  const calStep2 = document.getElementById('cal-step-2');
  const calStepIndicator = document.getElementById('cal-step-indicator');
  const calTextBlock = document.getElementById('cal-text-block');
  const calToast = document.getElementById('cal-toast');
  const sliderLeft = document.getElementById('slider-left');
  const sliderRight = document.getElementById('slider-right');
  const labelLeftValue = document.getElementById('label-left-value');
  const labelRightValue = document.getElementById('label-right-value');

  sliderLeft.value = state.leftLevel;
  sliderRight.value = state.rightLevel;
  labelLeftValue.textContent = state.leftLevel;
  labelRightValue.textContent = state.rightLevel;

  btnCalibrate.addEventListener('click', () => {
    calStep1.classList.add('active');
    calStep2.classList.remove('active');
    calStepIndicator.textContent = 'Step 1 of 2';
    calToast.classList.add('hidden');
    showScreen('calibration');
  });

  btnCalBack.addEventListener('click', () => showScreen('home'));

  btnCalStep1Next.addEventListener('click', () => {
    calStep1.classList.remove('active');
    calStep2.classList.add('active');
    calStepIndicator.textContent = 'Step 2 of 2';
    stopCamera();
  });

  function updateCalText() {
    const avg = (parseInt(sliderLeft.value) + parseInt(sliderRight.value)) / 2;
    const fs = 1.0 + (avg * 0.1);
    calTextBlock.style.fontSize = fs + 'rem';
    if (avg <= 1) calTextBlock.style.filter = 'blur(1.5px)';
    else if (avg <= 2) calTextBlock.style.filter = 'blur(0.5px)';
    else calTextBlock.style.filter = 'none';
  }

  sliderLeft.addEventListener('input', () => {
    labelLeftValue.textContent = sliderLeft.value;
    state.leftLevel = parseInt(sliderLeft.value);
    saveState();
    updateCalText();
  });
  sliderRight.addEventListener('input', () => {
    labelRightValue.textContent = sliderRight.value;
    state.rightLevel = parseInt(sliderRight.value);
    saveState();
    updateCalText();
  });

  btnCalSave.addEventListener('click', () => {
    state.calibrated = true;
    saveState();
    calToast.classList.remove('hidden');
    setTimeout(() => {
      calToast.classList.add('hidden');
      showScreen('home');
    }, 2000);
  });

  // --- CAMERA ---
  let cameraStream = null;
  let faceCanvas = null;
  let faceCtx = null;
  let detectionInterval = null;
  const cameraFeed = document.getElementById('camera-feed');
  const distanceLabel = document.getElementById('distance-label');
  const distanceBar = document.getElementById('distance-bar');
  const distanceBand = document.getElementById('distance-band');
  const statusDistance = document.getElementById('status-distance');

  async function startCamera() {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
      });
      cameraFeed.srcObject = cameraStream;
      cameraFeed.play();
      if (!faceCanvas) {
        faceCanvas = document.createElement('canvas');
        faceCtx = faceCanvas.getContext('2d');
      }
      detectionInterval = setInterval(estimateDistance, 500);
    } catch(e) {
      distanceLabel.textContent = 'Camera not available';
      distanceBand.textContent = 'Manual mode';
    }
  }

  function stopCamera() {
    if (detectionInterval) { clearInterval(detectionInterval); detectionInterval = null; }
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  }

  function estimateDistance() {
    if (!cameraFeed.videoWidth) return;
    const w = 160, h = 120;
    faceCanvas.width = w; faceCanvas.height = h;
    faceCtx.drawImage(cameraFeed, 0, 0, w, h);
    const data = faceCtx.getImageData(0, 0, w, h).data;
    let skinPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r > 95 && g > 40 && b > 20 && r > g && r > b && (r-g) > 15 && (r-b) > 15 && Math.abs(r-g) < 80) skinPixels++;
    }
    const ratio = skinPixels / (w * h);
    let estCm, band, barW, barC;
    if (ratio > 0.35) { estCm=25; band='Very close'; barW=90; barC='#C45C5C'; }
    else if (ratio > 0.20) { estCm=35; band='Close (reading)'; barW=70; barC='#D4925A'; }
    else if (ratio > 0.10) { estCm=50; band='Medium (laptop)'; barW=50; barC='#5AAE72'; }
    else if (ratio > 0.04) { estCm=65; band='Arm length'; barW=35; barC='#4A9E8E'; }
    else { estCm=80; band='Far'; barW=20; barC='#7A7A7A'; }
    state.estimatedDistanceCm = estCm;
    state.distanceBand = band;
    distanceLabel.textContent = 'Distance: ~' + estCm + ' cm';
    distanceBar.style.width = barW + '%';
    distanceBar.style.background = barC;
    distanceBand.textContent = band;
    statusDistance.innerHTML = '<span class="status-icon">&#128207;</span> ~' + estCm + 'cm';
  }

  // --- SETTINGS ---
  const toggleDark = document.getElementById('toggle-dark');
  const selectUnits = document.getElementById('select-units');
  toggleDark.checked = state.darkMode;
  if (state.darkMode) document.body.classList.add('dark');
  selectUnits.value = state.units;

  toggleDark.addEventListener('change', () => {
    state.darkMode = toggleDark.checked;
    document.body.classList.toggle('dark', state.darkMode);
    saveState();
  });
  selectUnits.addEventListener('change', () => {
    state.units = selectUnits.value;
    saveState();
  });

  document.getElementById('btn-recalibrate').addEventListener('click', () => {
    calStep1.classList.add('active');
    calStep2.classList.remove('active');
    calStepIndicator.textContent = 'Step 1 of 2';
    calToast.classList.add('hidden');
    showScreen('calibration');
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Reset all Refocus data?')) {
      localStorage.removeItem('refocusState');
      location.reload();
    }
  });

  // --- INSIGHTS ---
  document.getElementById('btn-view-insights').addEventListener('click', () => showScreen('insights'));
  document.getElementById('btn-insights-back').addEventListener('click', () => showScreen('settings'));

  function levelToRange(level) {
    if (level <= 1) return 'None / minimal';
    if (level <= 3) return '+0.75 to +1.25';
    if (level <= 5) return '+1.25 to +1.75';
    if (level <= 7) return '+1.75 to +2.25';
    if (level <= 9) return '+2.25 to +2.75';
    return '+2.75 to +3.00';
  }

  function updateInsights() {
    document.getElementById('insight-mode').textContent = modeLabels[state.device] || '--';
    document.getElementById('insight-sessions').textContent = state.sessions;
    document.getElementById('insight-left').textContent = state.calibrated ? state.leftLevel : '--';
    document.getElementById('insight-right').textContent = state.calibrated ? state.rightLevel : '--';
    document.getElementById('insight-range-left').textContent = state.calibrated ? levelToRange(state.leftLevel) : '--';
    document.getElementById('insight-range-right').textContent = state.calibrated ? levelToRange(state.rightLevel) : '--';
  }

  // Update insights when navigating there
  const origShow = showScreen;
  // Already handled via nav

  // Run insights update on every screen switch
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(b => b.addEventListener('click', updateInsights));
  updateInsights();

  // --- INIT ---
  showScreen('home');

})();
