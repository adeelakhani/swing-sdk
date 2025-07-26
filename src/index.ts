import * as rrweb from 'rrweb';
import type { eventWithTime } from '@rrweb/types/dist';

// SDK options interface
interface SwingSDKOptions {
  apiKey: string;
  userId?: string;
  sessionId?: string;
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
  } = options;

  const endpoint = process.env.BACKEND_URL || 'http://localhost:8000/upload';
  
  console.log('SwingSDK: Using endpoint:', endpoint);

  let events: eventWithTime[] = [];
  let stopped = false;
  let stopRecording: (() => void) | undefined;

  // Simple rrweb recording - just like the working example
  stopRecording = rrweb.record({
    emit(event: eventWithTime) {
      events.push(event);
      console.log('SwingSDK: Event captured:', event.type, 'at', new Date(event.timestamp).toLocaleTimeString());
    },
    checkoutEveryNth: 1,
    checkoutEveryNms: 1000,
  });

  console.log('SwingSDK: Recording started');

  // Helper to send events
  async function sendEvents() {
    if (events.length === 0) return;
    
    const payload = {
      projectId: apiKey,
      userId,
      sessionId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      events: events,
    };
    
    const payloadSize = JSON.stringify(payload).length;
    console.log('SwingSDK: Attempting to send events to:', endpoint);
    console.log('SwingSDK: Payload size:', payloadSize, 'bytes');
    console.log('SwingSDK: Events to send:', events.length);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('SwingSDK: Events sent successfully');
    } catch (err) {
      console.error('SwingSDK upload failed', err);
    }
    events = [];
  }

  // Send data every 10 seconds
  const interval = setInterval(() => {
    if (!stopped) sendEvents();
  }, 10000);

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
        navigator.sendBeacon(endpoint, JSON.stringify(payload));
      } catch (e) {
        console.error('SwingSDK sendBeacon failed', e);
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
