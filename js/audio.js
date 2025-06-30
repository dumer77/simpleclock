// SimpleClock.online - Audio Module
// Version: 1.0.0

// Audio context and global variables
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let alarmBuffer = null;
let timerBuffer = null;
let currentAlarmSource = null;
let currentTimerSource = null;

// Fallback HTML Audio elements
const alarmAudio = new Audio();
const timerAudio = new Audio();

// Sound URLs with multiple fallbacks
const soundURLs = {
  alarm: [
    "https://actions.google.com/sounds/v1/alarms/medium_bell_ringing.ogg",
    "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg",
    "https://www.soundjay.com/misc/bell-ringing-05.wav",
    "https://freesound.org/data/previews/316/316920_52593-lq.mp3"
  ],
  timer: [
    "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
    "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm.ogg",
    "https://www.soundjay.com/misc/sounds/bell-ringing-01.mp3",
    "https://freesound.org/data/previews/320/320655_5060451-lq.mp3"
  ]
};

// Initialize audio context
function initializeAudio() {
  try {
    audioCtx = new AudioContext();
    updateAudioStatus("Audio initialized", "success");
    return true;
  } catch (e) {
    console.error("Error creating AudioContext:", e);
    updateAudioStatus("Audio initialization failed", "error");
    return false;
  }
}

// Update audio status display
function updateAudioStatus(message, type = "info") {
  const statusElement = document.getElementById("audioStatus");
  if (statusElement) {
    statusElement.textContent = message;
    
    // Update background color based on status type
    switch(type) {
      case "success":
        statusElement.style.backgroundColor = "#336633";
        break;
      case "error":
        statusElement.style.backgroundColor = "#663333";
        break;
      case "warning":
        statusElement.style.backgroundColor = "#666633";
        break;
      default:
        statusElement.style.backgroundColor = "#555";
    }
  }
}

// Load sound from URL
async function loadSound(url) {
  try {
    updateAudioStatus("Loading audio...", "info");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error("Error loading sound from", url, err);
    return null;
  }
}

// Try loading sounds from multiple URLs
async function tryLoadSounds() {
  // Try to load alarm sounds
  for (const url of soundURLs.alarm) {
    try {
      const buffer = await loadSound(url);
      if (buffer) {
        alarmBuffer = buffer;
        alarmAudio.src = url;
        updateAudioStatus("Alarm sound loaded", "success");
        break;
      }
    } catch (e) {
      console.error("Failed to load alarm sound:", url, e);
    }
  }
  
  // Try to load timer sounds
  for (const url of soundURLs.timer) {
    try {
      const buffer = await loadSound(url);
      if (buffer) {
        timerBuffer = buffer;
        timerAudio.src = url;
        updateAudioStatus("Timer sound loaded", "success");
        break;
      }
    } catch (e) {
      console.error("Failed to load timer sound:", url, e);
    }
  }
  
  // Generate fallback sounds if loading failed
  if (!alarmBuffer) {
    alarmBuffer = generateBeepSound(440, 1.0); // A4 note
    updateAudioStatus("Using generated alarm sound", "warning");
  }
  
  if (!timerBuffer) {
    timerBuffer = generateBeepSound(660, 0.5); // E5 note
    updateAudioStatus("Using generated timer sound", "warning");
  }
}

// Generate a beep sound programmatically
function generateBeepSound(frequency = 440, duration = 1.0) {
  if (!audioCtx) return null;
  
  try {
    const sampleRate = audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate a sine wave with envelope
    for (let i = 0; i < buffer.length; i++) {
      // Sine wave
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      
      // Apply envelope to avoid clicks
      const fadeTime = 0.05; // 50ms fade in/out
      const fadeSamples = fadeTime * sampleRate;
      
      if (i < fadeSamples) {
        // Fade in
        data[i] *= (i / fadeSamples);
      } else if (i > buffer.length - fadeSamples) {
        // Fade out
        data[i] *= ((buffer.length - i) / fadeSamples);
      }
      
      // Add some harmonics for a richer sound
      data[i] += 0.3 * Math.sin(4 * Math.PI * frequency * i / sampleRate);
      data[i] += 0.1 * Math.sin(6 * Math.PI * frequency * i / sampleRate);
      
      // Normalize
      data[i] *= 0.5;
    }
    
    return buffer;
  } catch (e) {
    console.error("Error generating sound:", e);
    return null;
  }
}

// Setup HTML Audio loops
function setupAudioLoop(audioElement) {
  audioElement.loop = true;
  audioElement.volume = 0.7;
  
  audioElement.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    updateAudioStatus("Audio playback error", "error");
  });
  
  audioElement.addEventListener('canplaythrough', () => {
    console.log('Audio can play through');
  });
}

// Play sound from buffer
function playSoundFromBuffer(buffer, loop = false) {
  if (!audioCtx || !buffer) {
    console.error("AudioContext or buffer not available");
    return null;
  }
  
  try {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    
    // Add gain node for volume control
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.7;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Resume AudioContext if suspended
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    
    source.start(0);
    return source;
  } catch (e) {
    console.error("Error playing sound:", e);
    return null;
  }
}

// Alarm sound functions
function startLoopingAlarmSound() {
  // Track event if analytics is loaded
  if (typeof trackEvent !== 'undefined') {
    trackEvent('alarm', 'alarm_triggered');
  }
  
  // Try Web Audio API first
  if (audioCtx && alarmBuffer) {
    if (currentAlarmSource) {
      try {
        currentAlarmSource.stop();
      } catch (e) {
        console.log("Error stopping previous alarm sound", e);
      }
    }
    
    currentAlarmSource = playSoundFromBuffer(alarmBuffer, true);
    
    if (currentAlarmSource) {
      updateAudioStatus("Alarm playing (Web Audio)", "info");
      return;
    }
  }
  
  // Fallback to HTML Audio
  try {
    alarmAudio.currentTime = 0;
    const playPromise = alarmAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        updateAudioStatus("Alarm playing (HTML Audio)", "info");
      }).catch(e => {
        console.error("Error playing alarm audio:", e);
        updateAudioStatus("Error playing alarm", "error");
        // Ultimate fallback
        alert(getTranslation ? getTranslation('alarmMessage') : "Alarm triggered!");
      });
    }
  } catch (e) {
    console.error("Failed to play alarm sound:", e);
    updateAudioStatus("Failed to play alarm", "error");
    alert(getTranslation ? getTranslation('alarmMessage') : "Alarm triggered!");
  }
}

function stopAlarmSound() {
  // Stop Web Audio source
  if (currentAlarmSource) {
    try {
      currentAlarmSource.stop();
      currentAlarmSource = null;
    } catch (e) {
      console.log("Error stopping alarm source", e);
    }
  }
  
  // Stop HTML Audio
  try {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  } catch (e) {
    console.log("Error stopping alarm audio", e);
  }
  
  updateAudioStatus("Alarm stopped", "info");
  
  // Clear alarm message if exists
  const alarmMessage = document.getElementById("alarmMessage");
  if (alarmMessage) {
    alarmMessage.textContent = "";
    alarmMessage.classList.remove("alarm-active");
  }
}

// Timer sound functions
function startLoopingTimerSound() {
  // Track event if analytics is loaded
  if (typeof trackEvent !== 'undefined') {
    trackEvent('timer', 'timer_finished');
  }
  
  // Try Web Audio API first
  if (audioCtx && timerBuffer) {
    if (currentTimerSource) {
      try {
        currentTimerSource.stop();
      } catch (e) {
        console.log("Error stopping previous timer sound", e);
      }
    }
    
    currentTimerSource = playSoundFromBuffer(timerBuffer, true);
    
    if (currentTimerSource) {
      updateAudioStatus("Timer playing (Web Audio)", "info");
      return;
    }
  }
  
  // Fallback to HTML Audio
  try {
    timerAudio.currentTime = 0;
    const playPromise = timerAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        updateAudioStatus("Timer playing (HTML Audio)", "info");
      }).catch(e => {
        console.error("Error playing timer audio:", e);
        updateAudioStatus("Error playing timer", "error");
        // Ultimate fallback
        alert(getTranslation ? getTranslation('timerFinished') : "Timer finished!");
      });
    }
  } catch (e) {
    console.error("Failed to play timer sound:", e);
    updateAudioStatus("Failed to play timer", "error");
    alert(getTranslation ? getTranslation('timerFinished') : "Timer finished!");
  }
}

function stopTimerSound() {
  // Stop Web Audio source
  if (currentTimerSource) {
    try {
      currentTimerSource.stop();
      currentTimerSource = null;
    } catch (e) {
      console.log("Error stopping timer source", e);
    }
  }
  
  // Stop HTML Audio
  try {
    timerAudio.pause();
    timerAudio.currentTime = 0;
  } catch (e) {
    console.log("Error stopping timer audio", e);
  }
  
  updateAudioStatus("Timer stopped", "info");
}

// Play a short beep for UI feedback
function playBeep() {
  if (audioCtx && timerBuffer) {
    playSoundFromBuffer(timerBuffer, false);
  }
}

// Setup audio for mobile devices
function setupAudioContextForMobile() {
  // Resume audio context on user interaction
  document.body.addEventListener("click", function() {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        updateAudioStatus("Audio context resumed", "success");
      }).catch(e => {
        console.error("Could not resume audio context:", e);
      });
    }
  }, { once: false });
  
  // Also handle touch events
  document.body.addEventListener("touchstart", function() {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }, { once: false });
}

// Initialize audio system
function initAudioSystem() {
  if (initializeAudio()) {
    setupAudioLoop(alarmAudio);
    setupAudioLoop(timerAudio);
    tryLoadSounds();
    setupAudioContextForMobile();
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initAudioSystem,
    startLoopingAlarmSound,
    stopAlarmSound,
    startLoopingTimerSound,
    stopTimerSound,
    playBeep,
    updateAudioStatus
  };
}