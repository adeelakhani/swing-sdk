# 🏗️ Swing SDK Architecture & File Structure

This document provides a comprehensive technical overview of the Swing SDK architecture, explaining the purpose of each file and how they integrate with rrweb to provide complete session replay functionality.

## 📁 File Structure Overview

```
src/
├── index.ts                 # 📦 Main entry point & exports
├── types.ts                 # 🔷 TypeScript type definitions
├── tracker.ts               # 🎯 Core tracker class (main rrweb integration)
├── api.ts                   # 🌐 Data transmission & API communication
├── session-manager.ts       # 💾 Session persistence & lifecycle
├── user-manager.ts          # 👤 User identification & tracking
├── redaction-manager.ts     # 🔒 Privacy controls & data masking
├── nextjs-integration.ts    # ⚛️ Next.js specific functionality
├── react.tsx                # ⚛️ React provider & hooks
└── recorder.ts              # 📹 Legacy recorder (backward compatibility)
```

---

## 🎯 Core Files & rrweb Integration

### **📦 `src/index.ts` - Main Entry Point**

**Purpose**: Defines the public API surface and exports for the SDK.

```typescript
// Main tracker class (new global singleton)
export { SwingTracker } from "./tracker";

// Core classes and managers
export { SwingAPI } from "./api";
export { SwingSessionManager } from "./session-manager";
// ... other exports

// Utility functions
export const initSwing = (
  apiKey: string,
  ingestionUrl?: string,
  options?: SwingOptions
) => {
  const tracker = SwingTracker.init(
    apiKey,
    ingestionUrl || "https://ingest.swing.co",
    options
  );
  // Auto-start if in browser environment
  if (typeof window !== "undefined") {
    tracker.start().catch((error) => {
      console.error("[Swing] Failed to auto-start tracker:", error);
    });
  }
  return tracker;
};
```

**rrweb Connection**: No direct rrweb usage. Acts as the public interface to access rrweb functionality through exported classes.

---

### **🔷 `src/types.ts` - Type Definitions**

**Purpose**: Comprehensive TypeScript definitions for the entire SDK, including rrweb event types and custom business intelligence events.

```typescript
// rrweb compatibility
type RecordPlugin = any;

// Core SDK types
export interface SwingConfig {
  apiKey: string;
  endpoint: string;
  options?: SwingOptions;
}

// Custom events that extend rrweb's event system
export interface SwingCustomEvent extends SwingEvent {
  type: 5; // Custom event type (rrweb uses 0-4, we use 5)
  data: {
    payload: CustomEventPayload;
  };
}

// Business intelligence event payloads
export interface CustomEventPayload {
  eventType:
    | "button_clicked"
    | "link_clicked"
    | "form_submitted"
    | "console"
    | "navigation";
  // ... specific payload fields
}
```

**rrweb Connection**:

- Defines `SwingEvent` interface compatible with rrweb events
- Extends rrweb's event system with custom Type 5 events
- Provides type safety for rrweb configuration options

---

### **🎯 `src/tracker.ts` - Core Tracker Class** ⭐ _Main rrweb Integration_

**Purpose**: The heart of the SDK. Manages rrweb recording, event processing, and coordinates all other components.

#### **rrweb Integration Points:**

**1. Recording Initialization:**

```typescript
import { record } from "rrweb";

private startRRWebRecording(): void {
  const recordOptions = this.options.recordOptions || {};

  this.stopFn = (record as any)({
    emit: (event: any, isCheckout?: boolean) => {
      this.handleEvent(event, isCheckout); // Process each rrweb event
    },
    checkoutEveryNms: recordOptions.checkoutEveryNms || 10 * 1000,
    blockClass: recordOptions.blockClass || "swing-block",
    maskTextClass: recordOptions.maskTextClass || "swing-mask",
    maskInputOptions: recordOptions.maskInputOptions || { password: true },
    slimDOMOptions: recordOptions.slimDOMOptions || "all",
    sampling: {
      mousemove: this.options.sampling?.mousemove ?? 0.1,
      mouseInteraction: this.options.sampling?.mouseInteraction ?? 1,
      scroll: this.options.sampling?.scroll ?? 0.1,
      media: this.options.sampling?.media ?? 1,
      input: this.options.sampling?.input ?? 1,
    },
    // ... other rrweb options
  });
}
```

**2. Event Processing Pipeline:**

```typescript
private handleEvent(event: any, isCheckout?: boolean): void {
  // Convert rrweb event to SwingEvent
  const swingEvent: SwingEvent = {
    type: event.type,      // rrweb event types (0-4)
    data: event.data,      // rrweb event data
    timestamp: event.timestamp,
    delay: event.delay,
  };

  // Process through redaction manager
  const processedEvent = this.redactionManager.processEvent(swingEvent);
  this.eventBuffer.push(processedEvent);
}
```

**3. Custom Event Injection:**

```typescript
private async addCustomEvent(customEvent: SwingCustomEvent): Promise<void> {
  // Inject Type 5 custom events into the rrweb stream
  this.eventBuffer.push(customEvent);
}
```

**4. Automatic Event Tracking:**

```typescript
private setupAutomaticButtonTracking(): void {
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;

    if (target.tagName === 'BUTTON' || target.closest('button')) {
      // Create custom business intelligence event
      await this.addCustomEvent({
        type: 5, // Custom type mixed with rrweb events
        data: {
          payload: {
            eventType: 'button_clicked',
            buttonId: button.id || null,
            buttonText: button.textContent?.trim() || null,
            // ... other metadata
          }
        },
        timestamp: Date.now()
      });
    }
  });
}
```

**Key rrweb Features Used:**

- **Full DOM Recording**: Captures complete page snapshots and mutations
- **Event Sampling**: Optimizes performance by sampling mouse/scroll events
- **Privacy Controls**: Built-in masking and blocking capabilities
- **Checkout System**: Periodic full snapshots for session restoration
- **Plugin System**: Extensible architecture for custom functionality

---

### **🌐 `src/api.ts` - Data Transmission Layer**

**Purpose**: Handles all communication with backend services, including chunked uploads and multiple endpoint management.

```typescript
export class SwingAPI {
  // Chunked events upload - handles large rrweb datasets
  async sendEventsChunked(
    events: SwingEvent[],
    sessionId: string,
    userId?: string
  ): Promise<any[]> {
    const MAX_CHUNK_SIZE_BYTES = 1024 * 1024; // 1MB chunks

    for (const event of events) {
      const nextChunkSize = new TextEncoder().encode(
        JSON.stringify({ sessionId, events: [...currentChunk, event] })
      ).length;

      if (nextChunkSize > MAX_CHUNK_SIZE_BYTES && currentChunk.length > 0) {
        // Send current chunk and start new one
        await this.sendChunk(currentChunk);
        currentChunk = [event];
      }
    }
  }
}
```

**rrweb Connection**:

- Transports rrweb events and custom events to backend
- Handles large rrweb snapshots through intelligent chunking
- Ensures reliable delivery of session replay data

---

### **💾 `src/session-manager.ts` - Session Persistence**

**Purpose**: Manages session lifecycle, persistence across page loads, and session restoration.

```typescript
export class SwingSessionManager {
  public getOrCreateSession(): string {
    // Check for existing session
    const existingSessionId = this.getCookie(`swing_session_${this.apiKey}`);
    const lastActivity = localStorage.getItem("swing_last_activity");

    // Check if session is still valid (30 minutes)
    if (existingSessionId && this.isSessionValid(lastActivity)) {
      return existingSessionId; // Continue existing rrweb session
    }

    // Create new session for new rrweb recording
    const newSessionId = this.generateSessionId();
    this.setCookie(`swing_session_${this.apiKey}`, newSessionId, 1);
    return newSessionId;
  }
}
```

**rrweb Connection**:

- Ensures rrweb recordings are grouped into logical sessions
- Enables cross-page session continuity for complete user journey recording
- Manages session timeout to prevent indefinite recording

---

### **👤 `src/user-manager.ts` - User Identification**

**Purpose**: Tracks user identity across sessions and manages user-specific data.

```typescript
export class SwingUserManager {
  public async addUserInfo(
    userId: string,
    userProperties: UserProperties,
    sessionId: string
  ): Promise<void> {
    this.userProperties = userProperties;
    await this.api.sendUserData(userId, userProperties, sessionId);

    // Associate user with current rrweb session
    if (userId) {
      this.endUserId = userId;
      this.setCookie(`swing_end_user_id_${this.apiKey}`, userId, 365);
    }
  }
}
```

**rrweb Connection**:

- Links rrweb recordings to specific users for analysis
- Enables user-specific session replay filtering and search
- Provides context for interpreting rrweb session data

---

### **🔒 `src/redaction-manager.ts` - Privacy Controls**

**Purpose**: Processes rrweb events to redact sensitive information before transmission.

```typescript
export class SwingRedactionManager {
  public processEvent(event: SwingEvent): SwingEvent {
    if (!this.isActive()) return event;

    // Process different rrweb event types
    switch (event.type) {
      case 3: // rrweb IncrementalSnapshot
        return this.redactIncrementalSnapshot(event);
      case 2: // rrweb FullSnapshot
        return this.redactFullSnapshot(event);
      case 5: // Custom events
        return this.redactCustomEvent(event);
      default:
        return event;
    }
  }

  private redactIncrementalSnapshot(event: SwingEvent): SwingEvent {
    // Process rrweb mutations, inputs, and text changes
    if (processedEvent.data && processedEvent.data.source) {
      switch (processedEvent.data.source) {
        case 0: // Mutation
          this.redactMutations(processedEvent.data);
          break;
        case 2: // Input
          this.redactInputs(processedEvent.data);
          break;
        case 3: // Text
          this.redactText(processedEvent.data);
          break;
      }
    }
    return processedEvent;
  }
}
```

**rrweb Connection**:

- Directly processes rrweb DOM snapshots and mutations
- Redacts sensitive data from rrweb input events
- Ensures privacy compliance without breaking rrweb replay functionality

---

### **⚛️ `src/nextjs-integration.ts` - Next.js Optimization**

**Purpose**: Provides Next.js-specific functionality, particularly route change tracking for SPAs.

```typescript
export class NextJSIntegration {
  private handleRouteChange = (
    newUrl: string,
    oldUrl: string,
    navigationType: string
  ): void => {
    // Create custom DOM event that rrweb will capture
    if (typeof window !== "undefined") {
      const event = new CustomEvent("swing-route-change", {
        detail: { url: newUrl, timestamp: Date.now(), type: navigationType },
      });
      window.dispatchEvent(event); // rrweb captures this as a DOM event

      // Also inject structured navigation event
      if (
        this.tracker &&
        typeof this.tracker.trackNavigationEvent === "function"
      ) {
        this.tracker.trackNavigationEvent(navigationType, oldUrl, newUrl);
      }
    }
  };
}
```

**rrweb Connection**:

- Ensures rrweb captures Next.js route changes that don't trigger page reloads
- Creates DOM events that rrweb naturally records
- Provides context for understanding SPA navigation in rrweb replays

---

### **⚛️ `src/react.tsx` - React Integration**

**Purpose**: Provides React components and hooks for easy integration with React/Next.js applications.

```typescript
export const SwingProvider: React.FC<SwingProviderProps> = ({
  apiKey,
  ingestionUrl,
  options,
  children,
}) => {
  const [tracker, setTracker] = useState<SwingTracker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize global singleton tracker with rrweb
    const swingTracker = SwingTracker.init(apiKey, ingestionUrl, options);

    swingTracker.start().then(() => {
      setTracker(swingTracker); // rrweb recording is now active
      setSessionId(swingTracker.getSessionId());
      setIsRecording(true);
    });

    return () => {
      // Don't stop - let global singleton persist across page changes
      // This keeps rrweb recording across React component unmounts
    };
  }, [apiKey, ingestionUrl]);
};
```

**rrweb Connection**:

- Manages rrweb lifecycle within React component tree
- Ensures rrweb recording persists across React re-renders
- Provides React-friendly access to rrweb functionality

---

### **📹 `src/recorder.ts` - Legacy Recorder** _(Backward Compatibility)_

**Purpose**: Original simple recorder class maintained for backward compatibility.

```typescript
export class SwingRecorder {
  public start(): void {
    this.stopFn = (record as any)({
      emit: (event: any, isCheckout?: boolean) => {
        this.handleEvent(event, isCheckout);
      },
      // Basic rrweb configuration
      checkoutEveryNms: options.recordOptions?.checkoutEveryNms || 10 * 1000,
      blockClass: options.recordOptions?.blockClass || "swing-block",
      // ... minimal rrweb setup
    });
  }
}
```

**rrweb Connection**:

- Simpler, direct rrweb integration for basic use cases
- Provides original API for users migrating from v1.x
- Less feature-rich than SwingTracker but maintains rrweb core functionality

---

## 🔄 Data Flow Architecture

### **1. rrweb Event Capture**

```
DOM Changes → rrweb → SwingTracker.handleEvent()
```

### **2. Event Processing Pipeline**

```
rrweb Event → RedactionManager → EventBuffer → API.sendEventsChunked()
```

### **3. Custom Event Injection**

```
User Interaction → Automatic Tracking → Custom Type 5 Event → Mixed with rrweb Stream
```

### **4. Session Management**

```
Page Load → SessionManager.getOrCreateSession() → Continue/Start rrweb Recording
```

## 🎯 rrweb Integration Summary

### **How Swing SDK Uses rrweb:**

1. **Core Recording Engine**: rrweb handles all DOM capture, mutation tracking, and input recording
2. **Event Stream Enhancement**: Custom Type 5 events are injected into rrweb's event stream
3. **Privacy Layer**: rrweb events are processed through redaction before transmission
4. **Session Continuity**: rrweb recordings are organized into logical business sessions
5. **Framework Integration**: Next.js navigation is captured and fed into rrweb naturally

### **Value Added Over Pure rrweb:**

- 🎯 **Business Intelligence**: Automatic extraction of structured business events
- 🔄 **Advanced Upload**: Chunked, reliable data transmission
- 💾 **Session Management**: Cross-page session persistence
- 👤 **User Tracking**: Automatic user identification and linking
- 🔒 **Privacy Controls**: Comprehensive data redaction system
- ⚛️ **Framework Integration**: Next.js/React optimizations
- 🌐 **Global Architecture**: Singleton pattern for SPA compatibility

### **rrweb Configuration Optimizations:**

```typescript
// Optimized for production use
{
  sampling: {
    mousemove: 0.1,        // Reduce mouse event volume
    scroll: 0.1,           // Reduce scroll event volume
    mouseInteraction: 1.0  // Capture all clicks/interactions
  },
  slimDOMOptions: "all",   // Reduce DOM snapshot size
  maskInputOptions: {     // Privacy by default
    password: true
  },
  checkoutEveryNms: 10000  // Balance restoration vs. performance
}
```

## 🏗️ Architecture Benefits

### **Modular Design:**

- Each file has a single responsibility
- Components can be used independently
- Easy to test and maintain

### **rrweb Integration:**

- Leverages rrweb's proven DOM recording technology
- Extends rrweb with business intelligence layer
- Maintains compatibility with rrweb ecosystem

### **Scalability:**

- Chunked uploads handle large datasets
- Global singleton prevents memory leaks
- Configurable sampling for performance tuning

### **Developer Experience:**

- TypeScript for type safety
- React hooks for easy integration
- Comprehensive documentation and examples

---

This architecture makes Swing SDK a **complete session replay solution** that combines rrweb's technical excellence with enterprise-grade features for business intelligence, user tracking, and privacy compliance.
