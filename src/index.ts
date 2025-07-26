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

function SwingSDK(apiKeyOrOptions: string | SwingSDKOptions) {
  if (swingSDKActive) {
    if (typeof window !== 'undefined' && window.console) {
      console.warn('SwingSDK is already initialized.');
    }
    return () => Promise.resolve();
  }
  swingSDKActive = true;

  // Handle both string apiKey and options object
  let options: SwingSDKOptions;
  if (typeof apiKeyOrOptions === 'string') {
    options = { apiKey: apiKeyOrOptions };
  } else {
    options = apiKeyOrOptions;
  }

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
  
  // Debug the endpoint
  if (typeof window !== 'undefined' && window.console) {
    console.log('SwingSDK: Using endpoint:', resolvedEndpoint);
    console.log('SwingSDK: BACKEND_URL env var:', process.env.BACKEND_URL);
  }

  let events: eventWithTime[] = [];
  let stopped = false;
  let stopRecording: (() => void) | undefined;

  // Start recording immediately to capture the initial state
  stopRecording = rrweb.record({
    emit(event: eventWithTime) {
      events.push(event);
    },
    // Capture full snapshots more frequently
    checkoutEveryNth: 1,
    checkoutEveryNms: 500,
    // Better capture for React/Next.js apps
    recordCanvas: true,
    collectFonts: true,
    inlineStylesheet: true,
    // Capture more comprehensive DOM state
    maskAllInputs: false,
    maskInputOptions: {
      password: true,
    },
    // Ensure we capture the initial state
    recordCrossOriginIframes: true,
    // ...(rrwebOptions as Partial<recordOptions<eventWithTime>>), // Disabled for now, enable later if needed
  });

  // Force a full snapshot after a short delay to ensure we capture the rendered content
  setTimeout(() => {
    if (stopRecording && !stopped) {
      // Trigger a manual full snapshot
      const manualSnapshot = rrweb.record({
        emit(event: eventWithTime) {
          if (event.type === 2) { // FullSnapshot
            events.push(event);
          }
        },
        checkoutEveryNth: 1,
        checkoutEveryNms: 100,
      });
      
      // Stop the manual recording after capturing the snapshot
      setTimeout(() => {
        if (manualSnapshot) {
          manualSnapshot();
        }
      }, 100);
    }
  }, 200);

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
      console.log('SwingSDK: Attempting to send events to:', resolvedEndpoint);
      console.log('SwingSDK: Payload size:', JSON.stringify(payload).length, 'bytes');
      
      const response = await fetch(resolvedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('SwingSDK: Events sent successfully');
    } catch (err) {
      if (typeof window !== 'undefined' && window.console) {
        console.error('SwingSDK upload failed', err);
        console.error('SwingSDK: Endpoint was:', resolvedEndpoint);
        console.error('SwingSDK: Error details:', {
          name: (err as Error).name,
          message: (err as Error).message,
          stack: (err as Error).stack
        });
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
  console.log('SwingSDK: Exposing to window object');
  window.SwingSDK = SwingSDK;
  console.log('SwingSDK: Available on window:', !!window.SwingSDK);
} else {
  console.log('SwingSDK: Window not available (server-side)');
}

// Export React components
export { SwingProvider, useSwingSDK } from './react';
