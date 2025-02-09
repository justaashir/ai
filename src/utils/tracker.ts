import Tracker from '@openreplay/tracker';

let tracker: Tracker | null = null;

export const initTracker = () => {
  if (typeof window === 'undefined') return null;
  if (tracker) return tracker;

  tracker = new Tracker({
    projectKey: "0m2qDO5td8QcT3S7MFnN", 
  });

  // Start tracking
  tracker.start();

  return tracker;
};

export const getTracker = () => tracker;