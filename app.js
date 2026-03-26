// Simple SPA-style screen switching
const screens = {
  welcome: document.getElementById('screen-welcome'),
  profile: document.getElementById('screen-profile'),
  calibration: document.getElementById('screen-calibration'),
  results: document.getElementById('screen-results')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  if (name === 'calibration') {
    startCamera();
  } else {
    stopCamera();
  }
}

// Elements
const btnStart = document.getElementById('btn-start');
const btnProfileBack = document.getElementById('btn-profile-back');
const btnProfileNext = document.getElementById('btn-profile-next');
const btnCalBack = document.getElementById('btn-cal-back');
const btnCalNext = document.getElementById('btn-cal-next');
const btnRestart = document.getElementById('btn-restart');

const inputAge = document.getElementById('input-age');
const inputRx = document.getElementById('input-rx');
const inputDistance = document.getElementById('input-distance');

const sliderLeft = document.getElementById('slider-left');
const sliderRight = document.getElementById('slider-right');
const labelLeftValue = document.getElementById('label-left-value');
const labelRightValue = document.getElementById('label-right-value');

const calStepNumber = document.getElementById('cal-step-number');
const resultsSummary = document.getElementById('results-summary');
const calibrationText = document.getElementById('calibration-text');

// Camera elements
const cameraFeed = document.getElementById('camera-feed');
const distanceLabel = document.getElementById('distance-label');
const distanceBar = document.getElementById('distance-bar');
const distanceBand = document.getElementById('distance-band');

// Camera state
let cameraStream = null;
let faceCanvas = null;
let faceCtx = null;
let detectionInterval = null;

// App state
const appState = {
  profile: {
    age: null,
    rxText: '',
    preferredDistanceCm: null
  },
  calibrationSteps: [
    { id: 'near_default', leftLevel: 0, rightLevel: 0 }
  ],
  currentCalIndex: 0,
  estimatedDistanceCm: null,
  distanceBand: '--'
};

// Load from localStorage
(function loadState() {
  try {
    const stored = localStorage.getItem('clearNearState');
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.assign(appState, parsed);
    }
  } catch (e) {
    console.warn('Could not load saved state', e);
  }
})();

function saveState() {
  try {
    localStorage.setItem('clearNearState', JSON.stringify(appState));
  } catch (e) {
    console.warn('Could not save state', e);
  }
}

// ---- CAMERA: face-size based distance estimation ----
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }
    });
    cameraFeed.srcObject = cameraStream;
    cameraFeed.play();

    // Create offscreen canvas for face detection
    if (!faceCanvas) {
      faceCanvas = document.createElement('canvas');
      faceCtx = faceCanvas.getContext('2d');
    }

    // Use basic skin-colour heuristic for face size estimation
    detectionInterval = setInterval(estimateDistance, 500);
    distanceLabel.textContent = 'Distance: detecting...';
  } catch (err) {
    console.warn('Camera not available:', err);
    distanceLabel.textContent = 'Camera not available';
    distanceBand.textContent = 'Manual mode';
  }
}

function stopCamera() {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

function estimateDistance() {
  if (!cameraFeed.videoWidth) return;

  const w = 160;
  const h = 120;
  faceCanvas.width = w;
  faceCanvas.height = h;
  faceCtx.drawImage(cameraFeed, 0, 0, w, h);

  const imageData = faceCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // Simple skin-colour detection to estimate face area
  let skinPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    if (r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        (r - g) > 15 && (r - b) > 15 &&
        Math.abs(r - g) < 80) {
      skinPixels++;
    }
  }

  const totalPixels = w * h;
  const skinRatio = skinPixels / totalPixels;

  // Map skin ratio to approximate distance band
  // Closer = larger face = more skin pixels
  let estCm = 0;
  let band = '--';
  let barWidth = 50;
  let barColor = '#0077cc';

  if (skinRatio > 0.35) {
    estCm = 25; band = 'Very close (phone)'; barWidth = 90; barColor = '#e74c3c';
  } else if (skinRatio > 0.20) {
    estCm = 35; band = 'Close (reading)'; barWidth = 70; barColor = '#e67e22';
  } else if (skinRatio > 0.10) {
    estCm = 50; band = 'Medium (laptop)'; barWidth = 50; barColor = '#27ae60';
  } else if (skinRatio > 0.04) {
    estCm = 65; band = 'Arm length (monitor)'; barWidth = 35; barColor = '#0077cc';
  } else {
    estCm = 80; band = 'Far'; barWidth = 20; barColor = '#8e44ad';
  }

  appState.estimatedDistanceCm = estCm;
  appState.distanceBand = band;

  distanceLabel.textContent = 'Distance: ~' + estCm + ' cm';
  distanceBar.style.width = barWidth + '%';
  distanceBar.style.background = barColor;
  distanceBand.textContent = band;
}

// ---- SLIDER: live text adjustment ----
function updateCalibrationText() {
  const left = parseInt(sliderLeft.value, 10);
  const right = parseInt(sliderRight.value, 10);
  const avg = (left + right) / 2;

  // Scale font size: level 0 = 1.0rem, level 10 = 2.0rem
  const fontSize = 1.0 + (avg * 0.1);
  calibrationText.style.fontSize = fontSize + 'rem';

  // Slight blur at extremes to simulate focus difficulty
  if (avg === 0) {
    calibrationText.style.filter = 'blur(1.5px)';
  } else if (avg <= 2) {
    calibrationText.style.filter = 'blur(0.5px)';
  } else {
    calibrationText.style.filter = 'none';
  }
}

// Update UI from state
function updateProfileInputs() {
  if (appState.profile.age) inputAge.value = appState.profile.age;
  if (appState.profile.rxText) inputRx.value = appState.profile.rxText;
  if (appState.profile.preferredDistanceCm) {
    inputDistance.value = appState.profile.preferredDistanceCm;
  }
}

function updateCalibrationUI() {
  const step = appState.calibrationSteps[appState.currentCalIndex];
  calStepNumber.textContent = appState.currentCalIndex + 1;
  sliderLeft.value = step.leftLevel;
  sliderRight.value = step.rightLevel;
  labelLeftValue.textContent = step.leftLevel;
  labelRightValue.textContent = step.rightLevel;
  updateCalibrationText();
}

// Slider event handlers
sliderLeft.addEventListener('input', () => {
  const v = parseInt(sliderLeft.value, 10);
  labelLeftValue.textContent = v;
  appState.calibrationSteps[appState.currentCalIndex].leftLevel = v;
  saveState();
  updateCalibrationText();
});

sliderRight.addEventListener('input', () => {
  const v = parseInt(sliderRight.value, 10);
  labelRightValue.textContent = v;
  appState.calibrationSteps[appState.currentCalIndex].rightLevel = v;
  saveState();
  updateCalibrationText();
});

// Button wiring
btnStart.addEventListener('click', () => {
  updateProfileInputs();
  showScreen('profile');
});

btnProfileBack.addEventListener('click', () => {
  showScreen('welcome');
});

btnProfileNext.addEventListener('click', () => {
  appState.profile.age = inputAge.value ? parseInt(inputAge.value, 10) : null;
  appState.profile.rxText = inputRx.value || '';
  appState.profile.preferredDistanceCm = inputDistance.value
    ? parseInt(inputDistance.value, 10)
    : null;
  saveState();
  appState.currentCalIndex = 0;
  updateCalibrationUI();
  showScreen('calibration');
});

btnCalBack.addEventListener('click', () => {
  showScreen('profile');
});

btnCalNext.addEventListener('click', () => {
  saveState();
  buildResults();
  showScreen('results');
});

btnRestart.addEventListener('click', () => {
  localStorage.removeItem('clearNearState');
  location.reload();
});

// Build results
function buildResults() {
  const step = appState.calibrationSteps[0];
  const left = step.leftLevel;
  const right = step.rightLevel;
  const age = appState.profile.age;
  const dist = appState.profile.preferredDistanceCm;

  let html = '';

  html += '<p>Left eye ClearNear level: <strong>' + left + '</strong></p>';
  html += '<p>Right eye ClearNear level: <strong>' + right + '</strong></p>';

  // Map levels to approximate reader ranges
  html += '<p>Left eye approximate reader range: <strong>' + levelToReaderRange(left) + '</strong></p>';
  html += '<p>Right eye approximate reader range: <strong>' + levelToReaderRange(right) + '</strong></p>';

  if (appState.estimatedDistanceCm) {
    html += '<p>Estimated viewing distance: ~' + appState.estimatedDistanceCm + ' cm (' + appState.distanceBand + ')</p>';
  }

  if (typeof age === 'number') {
    html += '<p>Age: ' + age + '</p>';
  }
  if (typeof dist === 'number') {
    html += '<p>Preferred reading distance: ' + dist + ' cm</p>';
  }
  if (appState.profile.rxText) {
    html += '<p>Existing prescription notes: <br/>' + escapeHtml(appState.profile.rxText) + '</p>';
  }

  html += '<p>Higher ClearNear levels usually mean you may need stronger near support (for example, stronger reading glasses), but these levels are only indicative and should be confirmed by an eye care professional.</p>';

  resultsSummary.innerHTML = html;
}

// Map ClearNear level (0-10) to approximate OTC reader range
function levelToReaderRange(level) {
  if (level <= 1) return 'None or minimal';
  if (level <= 3) return '+0.75 to +1.25';
  if (level <= 5) return '+1.25 to +1.75';
  if (level <= 7) return '+1.75 to +2.25';
  if (level <= 9) return '+2.25 to +2.75';
  return '+2.75 to +3.00';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Initial screen
showScreen('welcome');
