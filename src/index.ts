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

  // Start recording with minimal capture to reduce data load
  stopRecording = rrweb.record({
    emit(event: eventWithTime) {
      // Only capture essential events to reduce payload size
      if (event.type === 2 || event.type === 3) { // FullSnapshot or IncrementalSnapshot
        events.push(event);
        console.log('SwingSDK: Event captured:', event.type, 'at', new Date(event.timestamp).toLocaleTimeString());
      }
    },
    // Much less frequent capture
    checkoutEveryNth: 10,
    checkoutEveryNms: 5000, // 5 seconds instead of 500ms
    // Disable heavy features
    recordCanvas: false,
    collectFonts: false,
    inlineStylesheet: false,
    // Mask sensitive data
    maskAllInputs: true,
    maskInputOptions: {
      password: true,
    },
    // Disable cross-origin iframes
    recordCrossOriginIframes: false,
  });

  console.log('SwingSDK: Recording started');

  // Helper to send events
  async function sendEvents() {
    if (events.length === 0) return;
    
    // Limit payload size by taking only the most recent events
    const maxEvents = 20; // Limit to 20 events per batch
    const eventsToSend = events.slice(-maxEvents);
    
    const payload = {
      projectId: apiKey,
      userId,
      sessionId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      events: eventsToSend,
    };
    
    const payloadSize = JSON.stringify(payload).length;
    console.log('SwingSDK: Attempting to send events to:', resolvedEndpoint);
    console.log('SwingSDK: Payload size:', payloadSize, 'bytes');
    console.log('SwingSDK: Events to send:', eventsToSend.length, 'out of', events.length, 'total');
    
    // Don't send if payload is too large
    if (payloadSize > 1000000) { // 1MB limit
      console.warn('SwingSDK: Payload too large, skipping send');
      events = [];
      return;
    }
    
    try {
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
