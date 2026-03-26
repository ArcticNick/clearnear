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

// Very simple in-memory state
const appState = {
  profile: {
    age: null,
    rxText: '',
    preferredDistanceCm: null
  },
  calibrationSteps: [
    { id: 'near_default', leftLevel: 0, rightLevel: 0 }
  ],
  currentCalIndex: 0
};

// Load from localStorage if present
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
}

// Slider event handlers
sliderLeft.addEventListener('input', () => {
  const v = parseInt(sliderLeft.value, 10);
  labelLeftValue.textContent = v;
  appState.calibrationSteps[appState.currentCalIndex].leftLevel = v;
  saveState();
});

sliderRight.addEventListener('input', () => {
  const v = parseInt(sliderRight.value, 10);
  labelRightValue.textContent = v;
  appState.calibrationSteps[appState.currentCalIndex].rightLevel = v;
  saveState();
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

// Build a simple textual summary
function buildResults() {
  const step = appState.calibrationSteps[0];
  const left = step.leftLevel;
  const right = step.rightLevel;
  const age = appState.profile.age;
  const dist = appState.profile.preferredDistanceCm;

  let html = '';

  html += '<p>Left eye ClearNear level: <strong>' + left + '</strong></p>';
  html += '<p>Right eye ClearNear level: <strong>' + right + '</strong></p>';

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

// Simple HTML escaping for RX text
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Initial screen
showScreen('welcome');
