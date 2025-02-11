// SessionRewind Tracker Implementation
declare global {
  interface Window {
    sessionRewind?: {
      startSession: () => void;
      getSessionUrl: (callback: (url: string) => void) => void;
    };
    SessionRewindConfig?: any;
  }
}

export const initTracker = () => {
  if (typeof window === 'undefined') return null;

  // Initialize SessionRewind
  const config = {
    apiKey: '6aZhRQ4bAa5EsmB4SihjZZ4Qgk7ZgYO7vf6JfxW7',
    startRecording: true,
  };

  (function(o) {
    var w = window;
    w.SessionRewindConfig = o;
    var f = document.createElement("script");
    f.async = 1;
    f.crossOrigin = "anonymous";
    f.src = "https://rec.sessionrewind.com/srloader.js";
    var g = document.getElementsByTagName("head")[0];
    g.insertBefore(f, g.firstChild);
  })(config);

  return window.sessionRewind;
};

export const getTracker = () => window.sessionRewind;