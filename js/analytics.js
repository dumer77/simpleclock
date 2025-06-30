// SimpleClock.online - Analytics Module
// Version: 1.0.0

// Analytics Helper Functions
function trackEvent(category, action, label = null, value = null) {
  if (typeof gtag !== 'undefined') {
    gtag('event', action, {
      'event_category': category,
      'event_label': label,
      'value': value
    });
  }
}

// Track page timing
window.addEventListener('load', function() {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'timing_complete', {
      'name': 'load',
      'value': Math.round(performance.now())
    });
  }
});

// Track errors
window.addEventListener('error', function(e) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'exception', {
      'description': e.message,
      'fatal': false
    });
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { trackEvent };
}