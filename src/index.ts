import * as rrweb from 'rrweb';
// import axios from 'axios'; // Remove axios
import type { eventWithTime } from '@rrweb/types/dist';
import type { recordOptions } from 'rrweb/typings/types';

// SDK options interface
interface SwingSDKOptions {
  apiKey: string;
  userId?: string;
  sessionId?: string;
  // rrwebOptions?: Partial<recordOptions<eventWithTime>>; // Disabled for now, enable later if needed
}

// Prevent double-initialization
let swingSDKActive = false;

function SwingSDK(options: SwingSDKOptions) {
  if (swingSDKActive) {
    if (typeof window !== 'undefined' && window.console) {
      console.warn('SwingSDK is already initialized.');
    }
    return () => Promise.resolve();
  }
  swingSDKActive = true;

  const {
    apiKey,
    userId,
    sessionId,
    // rrwebOptions = {}, // Disabled for now, enable later if needed
  } = options;

  const endpoint = process.env.BACKEND_URL;
  if (!endpoint) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SwingSDK: endpoint is required in production.');
    }
  }
  const resolvedEndpoint = endpoint || 'http://localhost:8000/upload';

  let events: eventWithTime[] = [];
  let stopped = false;
  let stopRecording: (() => void) | undefined;

  // Start recording
  stopRecording = rrweb.record({
    emit(event: eventWithTime) {
      events.push(event);
    },
    // Ensure we capture a full snapshot
    checkoutEveryNth: 1,
    checkoutEveryNms: 1000,
    // ...(rrwebOptions as Partial<recordOptions<eventWithTime>>), // Disabled for now, enable later if needed
  });

  // Helper to send events
  async function sendEvents() {
    if (events.length === 0) return;
    const payload = {
      projectId: apiKey,
      userId,
      sessionId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      events,
    };
    try {
      await fetch(resolvedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (err) {
      if (typeof window !== 'undefined' && window.console) {
        console.error('SwingSDK upload failed', err);
      }
    }
    events = [];
  }

  // Send data every 5 seconds
  const interval = setInterval(() => {
    if (!stopped) sendEvents();
  }, 5000);

  // Flush on unload using sendBeacon
  function handleUnload() {
    stopped = true;
    if (events.length) {
      const payload = {
        projectId: apiKey,
        userId,
        sessionId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        events,
      };
      try {
        navigator.sendBeacon(resolvedEndpoint, JSON.stringify(payload));
      } catch (e) {
        // fallback: best effort
        if (typeof window !== 'undefined' && window.console) {
          console.error('SwingSDK sendBeacon failed', e);
        }
      }
      events = [];
    }
    stopRecording?.();
    clearInterval(interval);
    swingSDKActive = false;
  }
  window.addEventListener('beforeunload', handleUnload);

  // Return async cleanup function
  return async function stopSwingSDK() {
    stopped = true;
    stopRecording?.();
    clearInterval(interval);
    window.removeEventListener('beforeunload', handleUnload);
    swingSDKActive = false;
    await sendEvents();
  };
}

// Expose globally for script tag usage with type safety
declare global {
  interface Window { SwingSDK?: typeof SwingSDK }
}
if (typeof window !== 'undefined') {
  window.SwingSDK = SwingSDK;
}

// Export React components
export { SwingProvider, useSwingSDK } from './react';
