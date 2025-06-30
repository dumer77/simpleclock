// SimpleClock.online - Main Application
// Version: 1.0.0

// Global variables
let alarms = [];
let timerRemaining = 0;
let timerInterval = null;
let chronoInterval = null;
let chronoStartTime = null;
let elapsedTime = 0;

// World time zones configuration
const worldTimeZones = [
  { label: "New York", zone: "America/New_York" },
  { label: "Los Angeles", zone: "America/Los_Angeles" },
  { label: "London", zone: "Europe/London" },
  { label: "Paris", zone: "Europe/Paris" },
  { label: "Dubai", zone: "Asia/Dubai" },
  { label: "Mumbai", zone: "Asia/Kolkata" },
  { label: "Singapore", zone: "Asia/Singapore" },
  { label: "Tokyo", zone: "Asia/Tokyo" },
  { label: "Sydney", zone: "Australia/Sydney" },
  { label: "São Paulo", zone: "America/Sao_Paulo" }
];

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
  // Initialize all modules
  initializeApp();
});

// Main initialization function
function initializeApp() {
  try {
    // Initialize audio system
    if (typeof initAudioSystem !== 'undefined') {
      initAudioSystem();
    }
    
    // Update clock every second
    setInterval(updateClock, 1000);
    setInterval(updateWorldTimes, 1000);
    
    // Initialize UI
    if (typeof updateTranslations !== 'undefined') {
      updateTranslations();
    }
    populateAlarmSelectors();
    populateTimerSelectors();
    
    // Set current time as default alarm
    const now = new Date();
    document.getElementById("alarmHour").value = now.getHours().toString().padStart(2, "0");
    document.getElementById("alarmMinute").value = now.getMinutes().toString().padStart(2, "0");
    document.getElementById("alarmSecond").value = "00";
    
    // Bind event listeners
    setupEventListeners();
    
    // Load user preferences
    loadUserPreferences();
    
    // Update status
    if (typeof updateAudioStatus !== 'undefined') {
      updateAudioStatus("SimpleClock ready", "success");
    }
    
    // Track initial page view
    if (typeof trackEvent !== 'undefined') {
      trackEvent('page_view', 'initial_load', window.location.pathname);
    }
    
  } catch (e) {
    console.error("Error initializing app:", e);
    if (typeof updateAudioStatus !== 'undefined') {
      updateAudioStatus("Error: " + e.message, "error");
    }
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Alarm controls
  document.getElementById("setAlarmBtn").addEventListener("click", setAlarmFromSelect);
  document.getElementById("testAlarmBtn").addEventListener("click", testAlarm);
  document.getElementById("stopAlarmSoundBtn").addEventListener("click", () => {
    if (typeof stopAlarmSound !== 'undefined') {
      stopAlarmSound();
    }
  });
  
  // Timer controls
  document.getElementById("setTimerBtn").addEventListener("click", setTimerFromSelect);
  document.getElementById("startTimerBtn").addEventListener("click", startTimer);
  document.getElementById("stopTimerBtn").addEventListener("click", stopTimer);
  document.getElementById("resetTimerBtn").addEventListener("click", resetTimer);
  document.getElementById("stopTimerSoundBtn").addEventListener("click", () => {
    if (typeof stopTimerSound !== 'undefined') {
      stopTimerSound();
    }
  });
  
  // Chronometer controls
  document.getElementById("startChronoBtn").addEventListener("click", startChronometer);
  document.getElementById("stopChronoBtn").addEventListener("click", stopChronometer);
  document.getElementById("resetChronoBtn").addEventListener("click", resetChronometer);
  
  // Settings
  document.getElementById("languageSelect").addEventListener("change", () => {
    if (typeof updateTranslations !== 'undefined') {
      updateTranslations();
    }
    saveUserPreferences();
    if (typeof trackEvent !== 'undefined') {
      trackEvent('settings', 'language_change', document.getElementById("languageSelect").value);
    }
  });
  
  document.getElementById("timezoneSelect").addEventListener("change", () => {
    saveUserPreferences();
    if (typeof trackEvent !== 'undefined') {
      trackEvent('settings', 'timezone_change', document.getElementById("timezoneSelect").value);
    }
  });
}

// Clock Functions
function getTimePartsInTimeZone(timeZone) {
  const now = new Date();
  const options = {
    timeZone: timeZone === "local" ? undefined : timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  };
  
  try {
    const parts = new Intl.DateTimeFormat("en-US", options).formatToParts(now);
    let timeParts = {};
    parts.forEach((part) => {
      if (part.type === "hour") timeParts.hour = part.value;
      if (part.type === "minute") timeParts.minute = part.value;
      if (part.type === "second") timeParts.second = part.value;
    });
    return timeParts;
  } catch (e) {
    console.error("Error getting time for timezone:", timeZone, e);
    // Fallback to local time
    return {
      hour: now.getHours().toString().padStart(2, "0"),
      minute: now.getMinutes().toString().padStart(2, "0"),
      second: now.getSeconds().toString().padStart(2, "0")
    };
  }
}

function updateClock() {
  const timeZone = document.getElementById("timezoneSelect").value;
  const timeParts = getTimePartsInTimeZone(timeZone);
  const currentTime = `${timeParts.hour}:${timeParts.minute}:${timeParts.second}`;
  document.getElementById("clock").textContent = currentTime;
  
  // Check alarms
  alarms.forEach((alarm, index) => {
    if (alarm === currentTime) {
      triggerAlarm();
      alarms.splice(index, 1);
      updateAlarmList();
    }
  });
}

// Alarm Functions
function setAlarmFromSelect() {
  const hour = document.getElementById("alarmHour").value;
  const minute = document.getElementById("alarmMinute").value;
  const second = document.getElementById("alarmSecond").value;
  const newAlarm = `${hour}:${minute}:${second}`;
  
  // Check if alarm already exists
  if (alarms.includes(newAlarm)) {
    alert(typeof getTranslation !== 'undefined' ? 
      getTranslation('alarmAlreadySet') : 'This alarm is already set!');
    return;
  }
  
  alarms.push(newAlarm);
  updateAlarmList();
  
  if (typeof trackEvent !== 'undefined') {
    trackEvent('alarm', 'alarm_set', newAlarm);
  }
  
  const message = (typeof getTranslation !== 'undefined' ? 
    getTranslation('alarmSetFor') : 'Alarm set for') + " " + newAlarm;
  
  if (typeof updateAudioStatus !== 'undefined') {
    updateAudioStatus(message, "success");
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
}

function updateAlarmList() {
  const alarmListElement = document.getElementById("alarmList");
  
  if (alarms.length === 0) {
    alarmListElement.innerHTML = `<div style="color: #999;">${
      typeof getTranslation !== 'undefined' ? 
      getTranslation('noAlarmsSet') : 'No alarms set'
    }</div>`;
    return;
  }
  
  let html = "";
  alarms.forEach((alarm, index) => {
    html += `<div role="listitem">
      ${alarm} 
      <button data-index="${index}" class="deleteAlarmBtn" aria-label="Delete alarm ${alarm}">
        ×
      </button>
    </div>`;
  });
  
  alarmListElement.innerHTML = html;
  
  // Re-bind delete buttons
  document.querySelectorAll(".deleteAlarmBtn").forEach((button) => {
    button.addEventListener("click", function() {
      const idx = parseInt(this.getAttribute("data-index"));
      deleteAlarm(idx);
    });
  });
}

function deleteAlarm(index) {
  if (typeof trackEvent !== 'undefined') {
    trackEvent('alarm', 'alarm_deleted', alarms[index]);
  }
  
  alarms.splice(index, 1);
  updateAlarmList();
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
}

function triggerAlarm() {
  if (typeof startLoopingAlarmSound !== 'undefined') {
    startLoopingAlarmSound();
  }
  
  const alarmMessage = document.getElementById("alarmMessage");
  alarmMessage.textContent = typeof getTranslation !== 'undefined' ? 
    getTranslation('alarmMessage') : 'Alarm ringing! Wake up!';
  alarmMessage.classList.add("alarm-active");
}

function testAlarm() {
  if (typeof trackEvent !== 'undefined') {
    trackEvent('alarm', 'test_alarm');
  }
  
  if (typeof startLoopingAlarmSound !== 'undefined') {
    startLoopingAlarmSound();
  }
  
  // Auto-stop after 3 seconds
  setTimeout(() => {
    if (typeof stopAlarmSound !== 'undefined') {
      stopAlarmSound();
    }
  }, 3000);
}

// Timer Functions
function setTimerFromSelect() {
  const hour = parseInt(document.getElementById("timerHour").value);
  const minute = parseInt(document.getElementById("timerMinute").value);
  const second = parseInt(document.getElementById("timerSecond").value);
  
  timerRemaining = hour * 3600 + minute * 60 + second;
  
  if (timerRemaining === 0) {
    alert(typeof getTranslation !== 'undefined' ? 
      getTranslation('invalidTime') : 'Please select a valid time');
    return;
  }
  
  updateTimerDisplay();
  
  if (typeof trackEvent !== 'undefined') {
    trackEvent('timer', 'timer_set', `${hour}h ${minute}m ${second}s`);
  }
  
  const message = `${typeof getTranslation !== 'undefined' ? 
    getTranslation('timerSet') : 'Timer set for'}: ${hour}h ${minute}m ${second}s`;
  
  if (typeof updateAudioStatus !== 'undefined') {
    updateAudioStatus(message, "success");
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
}

function startTimer() {
  if (timerRemaining <= 0) {
    alert(typeof getTranslation !== 'undefined' ? 
      getTranslation('invalidTime') : 'Please set a timer first!');
    return;
  }
  
  if (typeof trackEvent !== 'undefined') {
    trackEvent('timer', 'timer_started');
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
  
  if (timerInterval) clearInterval(timerInterval);
  
  if (typeof updateAudioStatus !== 'undefined') {
    updateAudioStatus("Timer running", "info");
  }
  
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    timerRemaining--;
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      updateTimerDisplay();
      
      if (typeof startLoopingTimerSound !== 'undefined') {
        startLoopingTimerSound();
      }
      
      const timerDisplay = document.getElementById("timerDisplay");
      timerDisplay.textContent = "00:00:00 - " + 
        (typeof getTranslation !== 'undefined' ? 
        getTranslation('timerFinished') : 'Timer Finished!');
      timerDisplay.classList.add("alarm-active");
    } else {
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  if (typeof trackEvent !== 'undefined') {
    trackEvent('timer', 'timer_stopped');
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    
    if (typeof updateAudioStatus !== 'undefined') {
      updateAudioStatus("Timer paused", "info");
    }
  }
}

function resetTimer() {
  if (typeof trackEvent !== 'undefined') {
    trackEvent('timer', 'timer_reset');
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
  
  stopTimer();
  timerRemaining = 0;
  const timerDisplay = document.getElementById("timerDisplay");
  timerDisplay.textContent = "00:00:00";
  timerDisplay.classList.remove("alarm-active");
  
  if (typeof updateAudioStatus !== 'undefined') {
    updateAudioStatus("Timer reset", "info");
  }
}

function updateTimerDisplay() {
  const hours = Math.floor(timerRemaining / 3600);
  const minutes = Math.floor((timerRemaining % 3600) / 60);
  const seconds = timerRemaining % 60;
  const pad = (num) => num.toString().padStart(2, "0");
  
  const timerDisplay = document.getElementById("timerDisplay");
  timerDisplay.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  timerDisplay.classList.remove("alarm-active");
}

// Chronometer Functions
function updateChronometer() {
  const now = Date.now();
  const diff = now - chronoStartTime + elapsedTime;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  const milliseconds = diff % 1000;
  const pad = (num, size) => ("000" + num).slice(-size);
  
  document.getElementById("chronometerDisplay").textContent =
    pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "." + pad(milliseconds, 3);
}

function startChronometer() {
  if (typeof trackEvent !== 'undefined') {
    trackEvent('stopwatch', 'stopwatch_started');
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
  
  if (!chronoInterval) {
    chronoStartTime = Date.now();
    chronoInterval = setInterval(updateChronometer, 50);
    
    if (typeof updateAudioStatus !== 'undefined') {
      updateAudioStatus("Stopwatch started", "info");
    }
  }
}

function stopChronometer() {
  if (typeof trackEvent !== 'undefined') {
    trackEvent('stopwatch', 'stopwatch_stopped');
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
  
  if (chronoInterval) {
    clearInterval(chronoInterval);
    chronoInterval = null;
    elapsedTime += Date.now() - chronoStartTime;
    
    if (typeof updateAudioStatus !== 'undefined') {
      updateAudioStatus("Stopwatch stopped", "info");
    }
  }
}

function resetChronometer() {
  if (typeof trackEvent !== 'undefined') {
    trackEvent('stopwatch', 'stopwatch_reset');
  }
  
  if (typeof playBeep !== 'undefined') {
    playBeep();
  }
  
  clearInterval(chronoInterval);
  chronoInterval = null;
  chronoStartTime = null;
  elapsedTime = 0;
  document.getElementById("chronometerDisplay").textContent = "00:00:00.000";
  
  if (typeof updateAudioStatus !== 'undefined') {
    updateAudioStatus("Stopwatch reset", "info");
  }
}

// World Time Functions
function updateWorldTimes() {
  let html = "";
  worldTimeZones.forEach((item) => {
    try {
      const parts = getTimePartsInTimeZone(item.zone);
      const timeString = `${parts.hour}:${parts.minute}:${parts.second}`;
      html += `<div class="world-time-item" role="listitem">
        <strong>${item.label}</strong>
        ${timeString}
      </div>`;
    } catch (e) {
      console.error(`Error getting time for zone ${item.zone}:`, e);
      html += `<div class="world-time-item" role="listitem">
        <strong>${item.label}</strong>
        Error
      </div>`;
    }
  });
  document.getElementById("worldTimes").innerHTML = html;
}

// Selector Population Functions
function populateAlarmSelectors() {
  const alarmHour = document.getElementById("alarmHour");
  const alarmMinute = document.getElementById("alarmMinute");
  const alarmSecond = document.getElementById("alarmSecond");
  
  alarmHour.innerHTML = '';
  alarmMinute.innerHTML = '';
  alarmSecond.innerHTML = '';
  
  for (let i = 0; i < 24; i++) {
    const option = document.createElement("option");
    option.value = i.toString().padStart(2, "0");
    option.text = i.toString().padStart(2, "0");
    alarmHour.appendChild(option);
  }
  
  for (let i = 0; i < 60; i++) {
    const optionM = document.createElement("option");
    optionM.value = i.toString().padStart(2, "0");
    optionM.text = i.toString().padStart(2, "0");
    alarmMinute.appendChild(optionM);
    
    const optionS = document.createElement("option");
    optionS.value = i.toString().padStart(2, "0");
    optionS.text = i.toString().padStart(2, "0");
    alarmSecond.appendChild(optionS);
  }
}

function populateTimerSelectors() {
  const timerHour = document.getElementById("timerHour");
  const timerMinute = document.getElementById("timerMinute");
  const timerSecond = document.getElementById("timerSecond");
  
  timerHour.innerHTML = '';
  timerMinute.innerHTML = '';
  timerSecond.innerHTML = '';
  
  for (let i = 0; i < 24; i++) {
    const option = document.createElement("option");
    option.value = i.toString().padStart(2, "0");
    option.text = i.toString().padStart(2, "0");
    timerHour.appendChild(option);
  }
  
  for (let i = 0; i < 60; i++) {
    const optionM = document.createElement("option");
    optionM.value = i.toString().padStart(2, "0");
    optionM.text = i.toString().padStart(2, "0");
    timerMinute.appendChild(optionM);
    
    const optionS = document.createElement("option");
    optionS.value = i.toString().padStart(2, "0");
    optionS.text = i.toString().padStart(2, "0");
    timerSecond.appendChild(optionS);
  }
  
  // Set default timer to 5 minutes
  timerMinute.value = "05";
}

// User Preferences
function loadUserPreferences() {
  try {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    
    if (langParam && typeof translations !== 'undefined' && translations[langParam]) {
      document.getElementById("languageSelect").value = langParam;
      if (typeof updateTranslations !== 'undefined') {
        updateTranslations();
      }
      return;
    }
    
    // Load from localStorage
    const savedLang = localStorage.getItem('simpleclock_language');
    const savedTz = localStorage.getItem('simpleclock_timezone');
    
    if (savedLang && typeof translations !== 'undefined' && translations[savedLang]) {
      document.getElementById("languageSelect").value = savedLang;
      if (typeof updateTranslations !== 'undefined') {
        updateTranslations();
      }
    }
    
    if (savedTz) {
      document.getElementById("timezoneSelect").value = savedTz;
    }
  } catch (e) {
    console.log("Could not load preferences:", e);
  }
}

function saveUserPreferences() {
  try {
    localStorage.setItem('simpleclock_language', document.getElementById("languageSelect").value);
    localStorage.setItem('simpleclock_timezone', document.getElementById("timezoneSelect").value);
  } catch (e) {
    console.log("Could not save preferences:", e);
  }
}

// Page Visibility API
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Page is hidden
    if ((typeof currentAlarmSource !== 'undefined' && currentAlarmSource) || 
        (typeof currentTimerSource !== 'undefined' && currentTimerSource)) {
      if (typeof updateAudioStatus !== 'undefined') {
        updateAudioStatus("Page hidden - sounds may be muted", "warning");
      }
    }
  } else {
    // Page is visible again
    if (typeof audioCtx !== 'undefined' && audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }
});

// Service Worker Registration (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}