import * as rrweb from 'rrweb';
// import axios from 'axios'; // Remove axios
import type { eventWithTime } from '@rrweb/types/dist';
import type { recordOptions } from 'rrweb/typings/types';

// SDK options interface
interface SwingSDKOptions {
  apiKey: string;
  userId?: string;
  sessionId?: string;
  redactFields?: string[]; // CSS selectors for fields to redact (Human Behavior style)
  // rrwebOptions?: Partial<recordOptions<eventWithTime>>; // Disabled for now, enable later if needed
}

// User management interface
interface SwingUser {
  id: string;
  email?: string;
  name?: string;
  properties?: Record<string, any>;
}

// Custom event interface
interface SwingCustomEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

// Business event types
interface BusinessEvent {
  type: 'click' | 'form_submit' | 'navigation' | 'console' | 'error' | 'custom';
  element?: {
    tagName?: string;
    id?: string;
    className?: string;
    text?: string;
    href?: string;
  };
  data?: Record<string, any>;
  timestamp: number;
  url: string;
}

// Prevent double-initialization
let swingSDKActive = false;
let currentUser: SwingUser | null = null;
let businessEvents: BusinessEvent[] = [];
let originalConsole: {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
} | null = null;

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
    redactFields = ['input[type="password"]', '.swing-no-capture', '.swing-mask'], // Default privacy classes
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

  // ===== PRIVACY FUNCTIONS (Human Behavior Style) =====
  let currentRedactFields = [...redactFields];

  function shouldRedactElement(element: Element): boolean {
    return currentRedactFields.some(selector => {
      try {
        return element.matches(selector);
      } catch (e) {
        console.warn('SwingSDK: Invalid CSS selector:', selector);
        return false;
      }
    });
  }

  function redactValue(value: string): string {
    return '[REDACTED]';
  }

  // Public function to update redacted fields
  function setRedactedFields(selectors: string[]) {
    currentRedactFields = [...selectors];
    console.log('SwingSDK: Updated redacted fields:', currentRedactFields);
  }

  // Public function to get current redacted fields
  function getRedactedFields(): string[] {
    return [...currentRedactFields];
  }

  // ===== CONSOLE TRACKING =====
  function setupConsoleTracking() {
    if (typeof window === 'undefined' || !window.console) return;
    
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // Override console methods
    console.log = (...args) => {
      originalConsole?.log(...args);
      captureConsoleEvent('log', args);
    };

    console.error = (...args) => {
      originalConsole?.error(...args);
      captureConsoleEvent('error', args);
    };

    console.warn = (...args) => {
      originalConsole?.warn(...args);
      captureConsoleEvent('warn', args);
    };

    console.info = (...args) => {
      originalConsole?.info(...args);
      captureConsoleEvent('info', args);
    };

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      captureErrorEvent(event.error || event.message, event.filename, event.lineno);
    });

    window.addEventListener('unhandledrejection', (event) => {
      captureErrorEvent(event.reason, 'unhandledrejection', 0);
    });
  }

  function captureConsoleEvent(level: string, args: any[]) {
    const event: BusinessEvent = {
      type: 'console',
      data: {
        level,
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '),
        args: args.map(arg => 
          typeof arg === 'object' ? '[Object]' : String(arg)
        )
      },
      timestamp: Date.now(),
      url: window.location.href
    };
    businessEvents.push(event);
  }

  function captureErrorEvent(error: any, filename?: string, lineno?: number) {
    const event: BusinessEvent = {
      type: 'error',
      data: {
        message: error?.message || String(error),
        stack: error?.stack,
        filename,
        lineno,
        name: error?.name
      },
      timestamp: Date.now(),
      url: window.location.href
    };
    businessEvents.push(event);
  }

  // ===== AUTOMATIC BUSINESS EVENT TRACKING =====
  function setupBusinessEventTracking() {
    if (typeof window === 'undefined') return;

    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const eventData: BusinessEvent = {
        type: 'click',
        element: {
          tagName: target.tagName,
          id: target.id,
          className: target.className,
          text: target.textContent?.slice(0, 100),
          href: (target as HTMLAnchorElement).href
        },
        timestamp: Date.now(),
        url: window.location.href
      };
      businessEvents.push(eventData);
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (!form) return;

      const formData = new FormData(form);
      const formFields: Record<string, string> = {};
      
      // Capture form field data with privacy controls
      for (const [key, value] of formData.entries()) {
        const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
        if (!input) continue;

        let fieldValue = String(value);

        // Apply redaction if element matches redactFields
        if (shouldRedactElement(input)) {
          fieldValue = redactValue(fieldValue);
        }

        formFields[key] = fieldValue;
      }

      const eventData: BusinessEvent = {
        type: 'form_submit',
        element: {
          tagName: form.tagName,
          id: form.id,
          className: form.className
        },
        data: {
          action: form.action,
          method: form.method,
          fields: formFields,
          fieldCount: Object.keys(formFields).length
        },
        timestamp: Date.now(),
        url: window.location.href
      };
      businessEvents.push(eventData);
    });

    // Track navigation (for SPA)
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        const eventData: BusinessEvent = {
          type: 'navigation',
          data: {
            from: currentUrl,
            to: window.location.href
          },
          timestamp: Date.now(),
          url: window.location.href
        };
        businessEvents.push(eventData);
        currentUrl = window.location.href;
      }
    });

    observer.observe(document, { subtree: true, childList: true });
  }

  // ===== USER MANAGEMENT =====
  function setUser(user: SwingUser) {
    currentUser = user;
    console.log('SwingSDK: User set:', user.id);
  }

  function identifyUser(userId: string, properties?: Record<string, any>) {
    setUser({ id: userId, ...properties });
  }

  function clearUser() {
    currentUser = null;
    console.log('SwingSDK: User cleared');
  }

  // ===== CUSTOM EVENT API =====
  function sendCustomEvent(name: string, properties?: Record<string, any>) {
    const event: BusinessEvent = {
      type: 'custom',
      data: {
        name,
        properties
      },
      timestamp: Date.now(),
      url: window.location.href
    };
    businessEvents.push(event);
    console.log('SwingSDK: Custom event sent:', name, properties);
  }

  // Start recording with privacy settings
  stopRecording = rrweb.record({
    emit(event: eventWithTime) {
      events.push(event);
      console.log('SwingSDK: Event captured:', event.type, 'at', new Date(event.timestamp).toLocaleTimeString());
    },
    // Privacy settings (CORRECT rrweb options)
    maskAllInputs: false, // ❌ Don't mask all inputs - be selective  
    blockClass: 'swing-no-capture', // ✅ Block elements with this class
    maskTextClass: 'swing-mask', // ✅ Mask text with this class
    maskTextSelector: 'input[type="password"], .swing-mask', // ✅ Mask specific inputs
    maskInputOptions: {
      color: true,
    },
    // Take full snapshot every 100 events (reasonable)
    checkoutEveryNth: 100,
    // Take full snapshot every 30 seconds (reasonable)
    checkoutEveryNms: 30 * 1000, // 30 seconds
    // Disable heavy features to reduce payload size
    recordCanvas: false,
    collectFonts: false,
    inlineStylesheet: false,
  });

  // Setup tracking
  setupConsoleTracking();
  setupBusinessEventTracking();

  console.log('SwingSDK: Recording started');

  // Helper to send events
  async function sendEvents() {
    if (events.length === 0 && businessEvents.length === 0) return;
    
    // Send all events without size limits
    const eventsToSend = events;
    const businessEventsToSend = businessEvents;
    
    const payload = {
      projectId: apiKey,
      userId: currentUser?.id || userId,
      sessionId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      events: eventsToSend,
      businessEvents: businessEventsToSend,
      user: currentUser
    };
    
    const payloadSize = JSON.stringify(payload).length;
    console.log('SwingSDK: Attempting to send events to:', resolvedEndpoint);
    console.log('SwingSDK: Payload size:', payloadSize, 'bytes');
    console.log('SwingSDK: Events to send:', eventsToSend.length, 'out of', events.length, 'total');
    console.log('SwingSDK: Business events to send:', businessEventsToSend.length);
    
    try {
      const response = await fetch(resolvedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // keepalive: true,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Only clear events on successful upload
      events = [];
      businessEvents = [];
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
      // Don't clear events on failure - they'll be retried
    }
  }

  // Send data every 5 seconds
  const interval = setInterval(() => {
    if (!stopped) sendEvents();
  }, 5000);

  // Flush on unload using sendBeacon
  function handleUnload() {
    stopped = true;
    if (events.length || businessEvents.length) {
      const payload = {
        projectId: apiKey,
        userId: currentUser?.id || userId,
        sessionId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        events,
        businessEvents,
        user: currentUser
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
      businessEvents = [];
    }
    stopRecording?.();
    clearInterval(interval);
    swingSDKActive = false;
    
    // Restore original console methods
    if (originalConsole && typeof window !== 'undefined' && window.console) {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    }
  }
  window.addEventListener('beforeunload', handleUnload);

  // Expose methods on window.swingSDK
  if (typeof window !== 'undefined') {
    window.swingSDK = {
      setUser,
      identifyUser,
      clearUser,
      sendCustomEvent,
      setRedactedFields,
      getRedactedFields
    };
  }

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
  interface Window { 
    SwingSDK?: typeof SwingSDK;
    swingSDK?: {
      setUser: (user: SwingUser) => void;
      identifyUser: (userId: string, properties?: Record<string, any>) => void;
      clearUser: () => void;
      sendCustomEvent: (name: string, properties?: Record<string, any>) => void;
      setRedactedFields: (selectors: string[]) => void;
      getRedactedFields: () => string[];
    };
  }
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
