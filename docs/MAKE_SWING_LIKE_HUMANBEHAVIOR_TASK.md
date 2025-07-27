# Task: Transform Swing SDK to Match HumanBehavior SDK

Transform the existing **Swing JS SDK** to be functionally identical to **HumanBehavior SDK** by implementing all missing features and architectural changes documented in the analysis.

## 📋 Current State Analysis

**Existing Swing SDK**: Pure rrweb + Next.js route tracking + React provider pattern
**Target HumanBehavior SDK**: rrweb + structured event layer + advanced data transmission + session persistence

---

## 🎯 Required Transformations

### 1. **Add Structured Event Tracking System**

Implement **6 types of automatic event tracking** that inject Type 5 custom events into the rrweb stream:

#### **1.1 Button Click Tracking**

```typescript
// Add to SwingRecorder class
private setupAutomaticButtonTracking(): void {
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;

    if (target.tagName === 'BUTTON' || target.closest('button')) {
      const button = target.tagName === 'BUTTON'
        ? target as HTMLButtonElement
        : target.closest('button') as HTMLButtonElement;

      await this.addCustomEvent({
        type: 5,
        data: {
          payload: {
            eventType: 'button_clicked',
            buttonId: button.id || null,
            buttonType: button.type || 'button',
            buttonText: button.textContent?.trim() || null,
            buttonClass: button.className || null,
            page: window.location.pathname,
            timestamp: Date.now()
          }
        },
        timestamp: Date.now()
      });
    }
  });
}
```

#### **1.2 Link Click Tracking**

```typescript
private setupAutomaticLinkTracking(): void {
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;

    if (target.tagName === 'A' || target.closest('a')) {
      const link = target.tagName === 'A'
        ? target as HTMLAnchorElement
        : target.closest('a') as HTMLAnchorElement;

      await this.addCustomEvent({
        type: 5,
        data: {
          payload: {
            eventType: 'link_clicked',
            linkUrl: link.href || null,
            linkId: link.id || null,
            linkTarget: link.target || null,
            linkText: link.textContent?.trim() || null,
            linkClass: link.className || null,
            page: window.location.pathname,
            timestamp: Date.now()
          }
        },
        timestamp: Date.now()
      });
    }
  });
}
```

#### **1.3 Form Submission Tracking**

```typescript
private setupAutomaticFormTracking(): void {
  document.addEventListener('submit', async (event) => {
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    await this.addCustomEvent({
      type: 5,
      data: {
        payload: {
          eventType: 'form_submitted',
          formId: form.id || null,
          formAction: form.action || null,
          formMethod: form.method || 'get',
          fields: Array.from(formData.keys()),
          formClass: form.className || null,
          page: window.location.pathname,
          timestamp: Date.now()
        }
      },
      timestamp: Date.now()
    });
  });
}
```

#### **1.4 Console Log Tracking**

```typescript
private originalConsole: {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
} | null = null;

public enableConsoleTracking(): void {
  this.originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };

  console.log = (...args) => {
    this.trackConsoleEvent('log', args);
    this.originalConsole!.log(...args);
  };

  console.warn = (...args) => {
    this.trackConsoleEvent('warn', args);
    this.originalConsole!.warn(...args);
  };

  console.error = (...args) => {
    this.trackConsoleEvent('error', args);
    this.originalConsole!.error(...args);
  };
}

private trackConsoleEvent(level: 'log' | 'warn' | 'error', args: any[]): void {
  this.addCustomEvent({
    type: 5,
    data: {
      payload: {
        eventType: 'console',
        level: level,
        message: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '),
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    },
    timestamp: Date.now()
  });
}
```

#### **1.5 Enhanced Navigation Tracking**

```typescript
// Expand existing navigation tracking to match HumanBehavior format
private trackNavigationEvent(type: string, fromUrl: string, toUrl: string): void {
  this.addCustomEvent({
    type: 5,
    data: {
      payload: {
        eventType: 'navigation',
        type: type,
        from: fromUrl,
        to: toUrl,
        timestamp: new Date().toISOString(),
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer
      }
    },
    timestamp: Date.now()
  });
}
```

#### **1.6 User Activity Tracking**

```typescript
private setupActivityTracking(): void {
  const updateActivity = () => {
    localStorage.setItem('swing_last_activity', Date.now().toString());
  };

  window.addEventListener('click', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('scroll', updateActivity);
  window.addEventListener('mousemove', updateActivity);
}
```

### 2. **Implement Advanced Data Transmission System**

Replace the current simple upload mechanism with HumanBehavior's sophisticated multi-endpoint system:

#### **2.1 Create API Class with Multiple Endpoints**

```typescript
export class SwingAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor({
    apiKey,
    ingestionUrl,
  }: {
    apiKey: string;
    ingestionUrl: string;
  }) {
    this.apiKey = apiKey;
    this.baseUrl = ingestionUrl;
  }

  // Session initialization
  public async init(sessionId: string, userId: string | null) {
    const response = await fetch(`${this.baseUrl}/api/ingestion/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Referer: document.referrer || "",
      },
      body: JSON.stringify({
        sessionId: sessionId,
        endUserId: userId,
        entryURL: window.location.href,
        referrer: document.referrer,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize ingestion: ${response.statusText}`);
    }

    return await response.json();
  }

  // Chunked events upload
  async sendEventsChunked(events: any[], sessionId: string, userId?: string) {
    const MAX_CHUNK_SIZE_BYTES = 1024 * 1024; // 1MB
    const results = [];
    let currentChunk: any[] = [];

    for (const event of events) {
      const nextChunkSize = new TextEncoder().encode(
        JSON.stringify({
          sessionId,
          events: [...currentChunk, event],
        })
      ).length;

      if (nextChunkSize > MAX_CHUNK_SIZE_BYTES && currentChunk.length > 0) {
        // Send current chunk
        const response = await fetch(`${this.baseUrl}/api/ingestion/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            sessionId,
            events: currentChunk,
            endUserId: userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send events: ${response.statusText}`);
        }

        results.push(await response.json());
        currentChunk = [event];
      } else {
        currentChunk.push(event);
      }
    }

    // Send remaining events
    if (currentChunk.length > 0) {
      const response = await fetch(`${this.baseUrl}/api/ingestion/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          sessionId,
          events: currentChunk,
          endUserId: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send events: ${response.statusText}`);
      }

      results.push(await response.json());
    }

    return results.flat();
  }

  // Navigator.sendBeacon fallback
  public sendBeaconEvents(events: any[], sessionId: string): boolean {
    const payload = {
      sessionId: sessionId,
      events: events,
      endUserId: null,
      apiKey: this.apiKey,
    };

    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });

    return navigator.sendBeacon(`${this.baseUrl}/api/ingestion/events`, blob);
  }

  // User data endpoints
  async sendUserData(
    userId: string,
    userData: Record<string, any>,
    sessionId: string
  ) {
    const response = await fetch(`${this.baseUrl}/api/ingestion/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        userId: userId,
        userAttributes: userData,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send user data: ${response.statusText}`);
    }

    return await response.json();
  }

  // Custom events API
  async sendCustomEvent(
    sessionId: string,
    eventName: string,
    eventProperties?: Record<string, any>
  ) {
    const response = await fetch(`${this.baseUrl}/api/ingestion/customEvent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        sessionId: sessionId,
        eventName: eventName,
        eventProperties: eventProperties || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send custom event: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

### 3. **Implement Persistent Session Management**

Transform from page-level sessions to cross-page persistent sessions:

#### **3.1 Session Persistence Logic**

```typescript
export class SwingSessionManager {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public getOrCreateSession(): string {
    // Check for existing session
    const existingSessionId = this.getCookie(`swing_session_${this.apiKey}`);
    const lastActivity = localStorage.getItem("swing_last_activity");

    // Check if session is still valid (30 minutes)
    if (existingSessionId && this.isSessionValid(lastActivity)) {
      return existingSessionId;
    }

    // Create new session
    const newSessionId = this.generateSessionId();
    this.setCookie(`swing_session_${this.apiKey}`, newSessionId, 1); // 1 day expiry
    return newSessionId;
  }

  private isSessionValid(lastActivity: string | null): boolean {
    if (!lastActivity) return false;

    const lastActivityTime = parseInt(lastActivity);
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    return lastActivityTime > thirtyMinutesAgo;
  }

  private setCookie(name: string, value: string, days: number): void {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;

    // Set cookie
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;

    // Backup in localStorage
    localStorage.setItem(name, value);
  }

  private getCookie(name: string): string | null {
    // Try cookie first
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }

    // Fallback to localStorage
    return localStorage.getItem(name);
  }

  private generateSessionId(): string {
    return `swing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 4. **Add User Tracking and Management**

Implement automatic user identification and cross-session tracking:

#### **4.1 User Management System**

```typescript
export class SwingUserManager {
  private apiKey: string;
  private api: SwingAPI;
  private userProperties: Record<string, any> = {};
  private endUserId: string | null = null;

  constructor(apiKey: string, api: SwingAPI) {
    this.apiKey = apiKey;
    this.api = api;
    this.initializeUser();
  }

  private initializeUser(): void {
    // Get or create user ID
    this.endUserId =
      this.getCookie(`swing_end_user_id_${this.apiKey}`) ||
      this.generateUserId();
    this.setCookie(`swing_end_user_id_${this.apiKey}`, this.endUserId, 365);
  }

  public async addUserInfo(
    userId: string,
    userProperties: Record<string, any>,
    sessionId: string
  ): Promise<void> {
    this.userProperties = userProperties;
    await this.api.sendUserData(userId, userProperties, sessionId);

    // Update user ID if provided
    if (userId) {
      this.endUserId = userId;
      this.setCookie(`swing_end_user_id_${this.apiKey}`, userId, 365);
    }
  }

  public isPreexistingUser(): boolean {
    const existingUserId = this.getCookie(`swing_end_user_id_${this.apiKey}`);
    return existingUserId !== null && existingUserId !== this.endUserId;
  }

  public getUserId(): string | null {
    return this.endUserId;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setCookie(name: string, value: string, days: number): void {
    // Same implementation as SessionManager
  }

  private getCookie(name: string): string | null {
    // Same implementation as SessionManager
  }
}
```

### 5. **Implement Global Singleton Pattern**

Transform from React Provider pattern to HumanBehavior's global singleton:

#### **5.1 Global Tracker Class**

```typescript
export class SwingTracker {
  private static instance: SwingTracker | null = null;
  private sessionManager: SwingSessionManager;
  private userManager: SwingUserManager;
  private api: SwingAPI;
  private sessionId: string;
  private isRecording: boolean = false;

  private constructor(apiKey: string, ingestionUrl: string) {
    this.api = new SwingAPI({ apiKey, ingestionUrl });
    this.sessionManager = new SwingSessionManager(apiKey);
    this.userManager = new SwingUserManager(apiKey, this.api);
    this.sessionId = this.sessionManager.getOrCreateSession();
  }

  public static init(
    apiKey: string,
    ingestionUrl: string = "https://ingest.swing.co"
  ): SwingTracker {
    if (typeof window !== "undefined" && SwingTracker.instance) {
      return SwingTracker.instance;
    }

    SwingTracker.instance = new SwingTracker(apiKey, ingestionUrl);

    // Make globally available
    if (typeof window !== "undefined") {
      (window as any).SwingTracker = SwingTracker;
      (window as any).__swingGlobalTracker = SwingTracker.instance;
    }

    return SwingTracker.instance;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    // Initialize session with API
    await this.api.init(this.sessionId, this.userManager.getUserId());

    // Start rrweb recording
    this.startRRWebRecording();

    // Setup all automatic tracking
    this.setupAutomaticTracking();

    // Enable console tracking
    this.enableConsoleTracking();

    // Setup activity tracking
    this.setupActivityTracking();

    // Setup unload handlers
    this.setupUnloadHandlers();

    this.isRecording = true;
  }

  // ... implement all the tracking methods from above
}

// Export for window global access
if (typeof window !== "undefined") {
  (window as any).SwingTracker = SwingTracker;
}
```

### 6. **Update React Integration**

Modify the React provider to use the global singleton:

#### **6.1 Updated React Provider**

```typescript
interface SwingProviderProps {
  apiKey: string;
  ingestionUrl?: string;
  options?: SwingOptions;
  children: ReactNode;
}

export const SwingProvider: React.FC<SwingProviderProps> = ({
  apiKey,
  ingestionUrl = "https://ingest.swing.co",
  options = {},
  children,
}) => {
  const [tracker, setTracker] = useState<SwingTracker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use global singleton
    const swingTracker = SwingTracker.init(apiKey, ingestionUrl);

    swingTracker.start().then(() => {
      setTracker(swingTracker);
      setIsInitialized(true);
    });

    return () => {
      // Don't stop - let it persist across page changes
    };
  }, [apiKey, ingestionUrl]);

  return (
    <SwingContext.Provider value={tracker}>{children}</SwingContext.Provider>
  );
};
```

### 7. **Add Data Redaction System**

Implement HumanBehavior's redaction manager:

#### **7.1 Redaction Manager**

```typescript
export class SwingRedactionManager {
  private redactedFields: string[] = [];
  private redactedText: string = "***";

  public setRedactedFields(fields: string[]): void {
    this.redactedFields = fields;
  }

  public processEvent(event: any): any {
    if (!this.isActive()) return event;

    // Process different event types
    switch (event.type) {
      case 3: // IncrementalSnapshot
        return this.redactIncrementalSnapshot(event);
      case 2: // FullSnapshot
        return this.redactFullSnapshot(event);
      default:
        return event;
    }
  }

  private isActive(): boolean {
    return this.redactedFields.length > 0;
  }

  private redactIncrementalSnapshot(event: any): any {
    // Redact input values, text content based on selectors
    // Implementation based on HumanBehavior's redaction logic
    return event;
  }

  private redactFullSnapshot(event: any): any {
    // Redact DOM snapshot based on selectors
    return event;
  }
}
```

### 8. **Configuration and Options**

Update configuration to match HumanBehavior's options:

#### **8.1 Configuration Interface**

```typescript
interface SwingOptions {
  debug?: boolean;
  ingestionUrl?: string;
  redactFields?: string[];
  enableAutomaticTracking?: boolean;
  automaticTrackingOptions?: {
    trackButtons?: boolean;
    trackLinks?: boolean;
    trackForms?: boolean;
    includeText?: boolean;
    includeClasses?: boolean;
  };
  enableConsoleTracking?: boolean;
}
```

---

## 🎯 Implementation Priority

1. **Phase 1**: Add structured event tracking system (button, link, form, console, navigation)
2. **Phase 2**: Implement advanced data transmission with chunking and multiple endpoints
3. **Phase 3**: Add persistent session management with cookies/localStorage
4. **Phase 4**: Implement user tracking and management
5. **Phase 5**: Transform to global singleton pattern
6. **Phase 6**: Add redaction system
7. **Phase 7**: Update React integration to use singleton

## ✅ Success Criteria

After implementation, Swing SDK should be functionally identical to HumanBehavior SDK:

- ✅ Capture all 6 types of structured events automatically
- ✅ Use Type 5 custom events mixed with rrweb stream
- ✅ Implement chunked data transmission with fallbacks
- ✅ Provide persistent cross-page sessions with 30-min timeout
- ✅ Support automatic user tracking and identification
- ✅ Use global singleton pattern with React wrapper
- ✅ Include data redaction capabilities
- ✅ Match HumanBehavior's API surface and behavior

The resulting SDK will be a drop-in replacement for HumanBehavior SDK with identical functionality and developer experience.
