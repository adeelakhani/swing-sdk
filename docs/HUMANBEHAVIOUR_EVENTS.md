# HumanBehavior Event Tracking & Data Transmission

This document provides a comprehensive analysis of how HumanBehavior's SDK captures additional structured events on top of raw rrweb data and transmits this information to their servers.

## 📋 Overview

**HumanBehavior = rrweb + Structured Event Layer + Advanced Data Transmission**

- **Base Layer**: Complete rrweb session recording (DOM snapshots + mutations)
- **Enhancement Layer**: Automatic semantic event extraction from user interactions
- **Transmission Layer**: Chunked, reliable data upload with multiple fallback methods

---

## 🎯 Additional Events Captured (Beyond rrweb)

HumanBehavior automatically captures **6 types of structured events** that add semantic meaning to raw DOM interactions:

### 1. **Button Click Events** 🔲

**Trigger**: `document.addEventListener('click')` → `target.tagName === 'BUTTON'` or `target.closest('button')`

```json
{
  "type": 5,
  "data": {
    "payload": {
      "eventType": "button_clicked",
      "buttonId": "submit-btn",
      "buttonType": "submit",
      "buttonText": "Complete Order",
      "buttonClass": "btn btn-primary",
      "page": "/checkout",
      "timestamp": 1634567890123
    }
  },
  "timestamp": 1634567890123
}
```

**Captured Properties**:

- `buttonId`: Element ID attribute
- `buttonType`: Button type (submit, button, reset)
- `buttonText`: Text content inside button
- `buttonClass`: CSS classes (if enabled)
- `page`: Current pathname
- `timestamp`: Event timestamp

### 2. **Link Click Events** 🔗

**Trigger**: `document.addEventListener('click')` → `target.tagName === 'A'` or `target.closest('a')`

```json
{
  "type": 5,
  "data": {
    "payload": {
      "eventType": "link_clicked",
      "linkUrl": "https://example.com/help",
      "linkId": "help-link",
      "linkTarget": "_blank",
      "linkText": "Get Help",
      "linkClass": "external-link",
      "page": "/dashboard",
      "timestamp": 1634567890456
    }
  },
  "timestamp": 1634567890456
}
```

**Captured Properties**:

- `linkUrl`: href attribute
- `linkId`: Element ID attribute
- `linkTarget`: target attribute (\_blank, \_self, etc.)
- `linkText`: Text content inside link
- `linkClass`: CSS classes (if enabled)
- `page`: Current pathname

### 3. **Form Submission Events** 📝

**Trigger**: `document.addEventListener('submit')` → any form submission

```json
{
  "type": 5,
  "data": {
    "payload": {
      "eventType": "form_submitted",
      "formId": "contact-form",
      "formAction": "/api/contact",
      "formMethod": "post",
      "fields": ["name", "email", "message"],
      "formClass": "contact-form",
      "page": "/contact",
      "timestamp": 1634567890789
    }
  },
  "timestamp": 1634567890789
}
```

**Captured Properties**:

- `formId`: Form ID attribute
- `formAction`: Form action URL
- `formMethod`: HTTP method (GET/POST)
- `fields`: Array of field names in the form
- `formClass`: CSS classes (if enabled)
- `page`: Current pathname

### 4. **Console Log Events** 🖥️

**Trigger**: Overrides `console.log`, `console.warn`, `console.error`

```json
{
  "type": 5,
  "data": {
    "payload": {
      "eventType": "console",
      "level": "error",
      "message": "API request failed: 404 Not Found",
      "timestamp": "2023-10-01T12:00:00.000Z",
      "url": "https://example.com/dashboard"
    }
  },
  "timestamp": 1634567891012
}
```

**Captured Properties**:

- `level`: Console level (log, warn, error)
- `message`: Full console message (objects are JSON.stringify'd)
- `timestamp`: ISO timestamp string
- `url`: Full page URL when logged

### 5. **Navigation Events** 🧭

**Trigger**: Overrides `history.pushState`, `history.replaceState` + listens for `popstate`, `hashchange`

```json
{
  "type": 5,
  "data": {
    "payload": {
      "eventType": "navigation",
      "type": "pushState",
      "from": "/home",
      "to": "/about",
      "timestamp": "2023-10-01T12:00:00.000Z",
      "pathname": "/about",
      "search": "?tab=info",
      "hash": "#section1",
      "referrer": "https://google.com"
    }
  },
  "timestamp": 1634567891234
}
```

**Captured Properties**:

- `type`: Navigation type (pushState, replaceState, popstate, hashchange, pageLoad)
- `from`: Previous URL
- `to`: New URL
- `pathname`: URL pathname
- `search`: Query string
- `hash`: URL fragment
- `referrer`: Document referrer

### 6. **User Activity Tracking** 🎮

**Trigger**: `click`, `keydown`, `scroll`, `mousemove` events

```javascript
// Updates localStorage on any user interaction
localStorage.setItem("human_behavior_last_activity", Date.now().toString());
```

**Purpose**: Track user engagement for session timeout and activity analysis.

---

## 🏗️ Data Structure & Event Types

### **rrweb Event Types** (Standard)

- `type: 0` - DomContentLoaded
- `type: 1` - Load
- `type: 2` - FullSnapshot
- `type: 3` - IncrementalSnapshot
- `type: 4` - Meta
- `type: 6` - Plugin

### **HumanBehavior Custom Events**

- `type: 5` - CustomEvent with structured payload

### **Event Processing Flow**

```typescript
// 1. rrweb events captured
rrweb.record({
  emit: (event) => {
    this.addEvent(event); // Raw rrweb event
  }
});

// 2. Custom events added
document.addEventListener('click', async (event) => {
  if (isButton(event.target)) {
    await this.addEvent({
      type: 5, // Custom event type
      data: { payload: { eventType: 'button_clicked', ... } },
      timestamp: Date.now()
    });
  }
});

// 3. All events go to same queue
this.eventIngestionQueue.push(processedEvent);

// 4. Events are processed through redaction
const processedEvent = this.redactionManager.processEvent(event);

// 5. Batched and sent to API
await this.api.sendEventsChunked(events, sessionId, userId);
```

---

## 📡 Data Transmission Methods

HumanBehavior uses a sophisticated **multi-layer data transmission strategy** with chunking, compression, and fallback mechanisms:

### **1. Primary Method: Chunked HTTP POST**

**Endpoint**: `POST https://ingest.humanbehavior.co/api/ingestion/events`

**Headers**:

```http
Content-Type: application/json
Authorization: Bearer {apiKey}
```

**Payload Structure**:

```json
{
  "sessionId": "session_1634567890_abc123",
  "endUserId": "user_def456",
  "events": [
    {
      "type": 2,
      "data": {
        /* rrweb DOM snapshot */
      }
    },
    {
      "type": 3,
      "data": {
        /* rrweb mutation */
      }
    },
    { "type": 5, "data": { "payload": { "eventType": "button_clicked" } } },
    {
      "type": 3,
      "data": {
        /* rrweb input */
      }
    }
  ]
}
```

**Chunking Strategy**:

- **Max chunk size**: 1MB (1,024,000 bytes)
- **Smart splitting**: Large events are automatically split
- **Batch processing**: Multiple chunks sent sequentially

### **2. Fallback Method: Navigator.sendBeacon**

**Used for**:

- Page unload events (`beforeunload`, `visibilitychange`)
- Ensuring data delivery when page is closing

**Endpoint**: `POST https://ingest.humanbehavior.co/api/ingestion/events`

**Special handling**:

```typescript
// API key included in body since headers not supported
const payload = {
  sessionId: sessionId,
  events: events,
  endUserId: null,
  apiKey: this.apiKey, // Special for beacon
};

const blob = new Blob([JSON.stringify(payload)], {
  type: "application/json",
});

navigator.sendBeacon(endpoint, blob);
```

### **3. Session Initialization**

**Endpoint**: `POST https://ingest.humanbehavior.co/api/ingestion/init`

**Purpose**: Establish session and get user ID mapping

```json
{
  "sessionId": "session_1634567890_abc123",
  "endUserId": "user_def456",
  "entryURL": "https://example.com/landing",
  "referrer": "https://google.com/search?q=..."
}
```

**Response**:

```json
{
  "sessionId": "session_1634567890_abc123",
  "endUserId": "user_mapped_789"
}
```

### **4. User Data Endpoints**

**User Properties**: `POST /api/ingestion/user`

```json
{
  "userId": "user_789",
  "userAttributes": {
    "email": "user@example.com",
    "plan": "premium"
  },
  "sessionId": "session_1634567890_abc123"
}
```

**User Authentication**: `POST /api/ingestion/user/auth`

```json
{
  "userId": "user_789",
  "userAttributes": { "id": "user_789" },
  "sessionId": "session_1634567890_abc123",
  "authFields": ["id"]
}
```

### **5. Custom Event API**

**Single Event**: `POST /api/ingestion/customEvent`

```json
{
  "sessionId": "session_1634567890_abc123",
  "eventName": "conversion",
  "eventProperties": {
    "value": 99.99,
    "currency": "USD"
  }
}
```

**Batch Events**: `POST /api/ingestion/customEvent/batch`

```json
{
  "sessionId": "session_1634567890_abc123",
  "events": [
    { "eventName": "page_view", "eventProperties": { "page": "/dashboard" } },
    { "eventName": "feature_used", "eventProperties": { "feature": "export" } }
  ]
}
```

---

## ⏱️ Data Upload Timing

### **Automatic Upload Triggers**

1. **Timer-based**: Every 5 seconds (`FLUSH_INTERVAL_MS = 5000`)
2. **Size-based**: When queue exceeds 1MB
3. **Event count**: Configurable batch sizes
4. **Page unload**: `beforeunload` and `visibilitychange` events

### **Upload Flow**

```typescript
// 1. Events accumulate in queue
this.eventIngestionQueue.push(processedEvent);

// 2. Periodic flush
setInterval(() => {
  this.flush(); // Process and send queue
}, 5000);

// 3. Emergency flush on page unload
window.addEventListener("beforeunload", () => {
  this.api.sendBeaconEvents(this.eventIngestionQueue, this.sessionId);
});
```

---

## 🔒 Data Privacy & Processing

### **Redaction Manager**

All events pass through a redaction layer before transmission:

```typescript
const processedEvent = this.redactionManager.processEvent(event);
```

**Automatic Redaction**:

- Password fields (`input[type="password"]`)
- User-specified selectors
- Sensitive form fields

**Redaction Options**:

```typescript
tracker.setRedactedFields([
  'input[type="password"]',
  "#credit-card",
  ".sensitive-data",
]);
```

### **Data Masking**

- **Text content**: Replaced with `***`
- **Input values**: Masked based on field type
- **DOM attributes**: Sensitive attributes removed

---

## 📊 Key Differences from Pure rrweb

| Feature                   | Pure rrweb            | Swing SDK                   | HumanBehavior                        |
| ------------------------- | --------------------- | --------------------------- | ------------------------------------ |
| **Event Types**           | 6 standard types      | 6 standard + route events   | 6 standard + 1 custom type           |
| **Data Structure**        | Raw DOM events        | Raw DOM + route tracking    | Raw DOM + structured business events |
| **Upload Method**         | Manual implementation | Automatic batched upload    | Automatic chunked upload             |
| **Business Intelligence** | None                  | Route analytics only        | Rich semantic events                 |
| **User Tracking**         | Manual                | React hooks (manual)        | Automatic activity tracking          |
| **Session Management**    | Manual                | In-memory with upload       | Built-in session restoration         |
| **Data Size**             | Smaller (DOM only)    | Medium (DOM + route events) | Larger (DOM + structured events)     |

---

## 🔍 Detailed Feature Comparison: Swing SDK vs HumanBehavior

### 🎯 **Route Events in Swing SDK**

#### **What are Swing's Route Events?**

Swing SDK captures **Next.js navigation changes** as custom DOM events that rrweb then records:

```typescript
// From our NextJS Integration code
private handleRouteChange = (url: string): void => {
  // Create a custom event for route changes that rrweb can capture
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('swing-route-change', {
      detail: {
        url,
        timestamp: Date.now(),
        referrer: document.referrer
      }
    })
    window.dispatchEvent(event)
  }
}
```

#### **Why Do We Have Route Events?**

**Problem**: rrweb captures DOM changes, but **Next.js route changes don't always cause full page reloads**. When users navigate with `router.push('/new-page')`, rrweb might miss that a logical "page change" occurred.

**Solution**: Swing SDK **detects Next.js navigation** and **injects custom events** into the rrweb stream, so when you replay a session, you can see:

- When the user navigated from `/home` to `/dashboard`
- Whether it was programmatic navigation or browser back/forward
- Timing of route transitions

**Technical Implementation**:

```typescript
// We override history methods to catch programmatic navigation
history.pushState = function (...args) {
  originalPushState.apply(history, args);
  setTimeout(checkForRouteChange, 0);
};

// And listen for browser navigation
window.addEventListener("popstate", checkForRouteChange);
```

### 🧠 **Business Intelligence Comparison**

#### **HumanBehavior's Business Intelligence**

HumanBehavior automatically extracts **structured business data** from user interactions:

```typescript
// They automatically capture semantic meaning
{
  eventType: "button_clicked",
  buttonId: "checkout-btn",
  buttonText: "Complete Purchase",
  page: "/cart",
  timestamp: 1634567890
}

{
  eventType: "form_submitted",
  formId: "signup-form",
  fields: ["email", "password", "firstName"],
  formAction: "/api/register"
}

{
  eventType: "console",
  level: "error",
  message: "Payment API failed: 402 Payment Required"
}
```

**Business Value**:

- **Conversion funnel analysis**: Track button clicks → form submissions → purchases
- **Error correlation**: See which console errors coincide with user dropoffs
- **Feature usage**: Understand which buttons/links users interact with most
- **Analytics without setup**: Zero-config capture of business metrics

#### **Swing SDK's Business Intelligence**

Swing SDK only captures **route-level analytics**:

```typescript
// We only track navigation patterns
{
  type: "custom",
  data: {
    tag: "swing-route-change",
    payload: {
      url: "/checkout",
      timestamp: 1634567890,
      referrer: "/cart"
    }
  }
}
```

**Business Value**:

- **User journey mapping**: See the path users take through your app
- **Page-level analysis**: Understand which pages users visit in sequence
- **Navigation debugging**: Identify routing issues or unexpected navigation patterns

**Why the Difference?**

- **Swing**: Focused on **session replay for debugging** → minimal data extraction
- **HumanBehavior**: Focused on **session replay + analytics** → rich data extraction

### 🗄️ **Session Management Comparison**

#### **HumanBehavior's Session Management**

HumanBehavior has **persistent session restoration** across page reloads and browser sessions:

```typescript
// Session restoration logic
public static init(apiKey: string): HumanBehaviorTracker {
  // Check for existing instance
  if (window.__humanBehaviorGlobalTracker) {
    return window.__humanBehaviorGlobalTracker; // Reuse existing
  }

  // Check for existing session in storage
  const existingSessionId = this.getCookie(`human_behavior_session_${apiKey}`);
  const lastActivity = localStorage.getItem('human_behavior_last_activity');

  // Restore session if within 30 minutes
  if (existingSessionId && this.isSessionValid(lastActivity)) {
    tracker.sessionId = existingSessionId;
  }
}

// Activity tracking for session timeout
private updateActivity = () => {
  localStorage.setItem('human_behavior_last_activity', Date.now().toString());
}

// Session persists across page loads
private setCookie(name: string, value: string, daysToExpire: number) {
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
  localStorage.setItem(name, value); // Backup in localStorage
}
```

**Features**:

- **30-minute session timeout**: Sessions persist across page reloads for 30 minutes
- **Cross-page continuity**: Same session ID across `/home` → `/about` → `/checkout`
- **Browser storage**: Uses cookies + localStorage for redundancy
- **Global singleton**: One tracker instance per page, reused across navigation

#### **Swing SDK's Session Management**

Swing SDK uses **in-memory session management** with immediate upload:

```typescript
// Session created per page load
private createSession(): SwingSession {
  return {
    id: this.generateSessionId(), // New ID every time
    startTime: Date.now(),
    events: [],
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight }
  }
}

// No persistence - session dies with page
public start(): void {
  this.session = this.createSession(); // Fresh session
  // Events uploaded immediately, no restoration
}
```

**Features**:

- **Page-level sessions**: New session ID for each page load
- **Immediate upload**: Events sent continuously, not stored locally
- **Memory-only**: No cookies or localStorage for session state
- **Provider-scoped**: Session tied to React component lifecycle

**Why the Difference?**

- **HumanBehavior**: **Cross-page user journey analysis** → needs session continuity
- **Swing**: **Per-page debugging** → each page load is a separate "debugging session"

### 👤 **User Tracking Comparison**

#### **HumanBehavior's User Tracking**

HumanBehavior has **automatic user engagement tracking**:

```typescript
// Automatic activity tracking
private setupActivityTracking(): void {
  const updateActivity = () => {
    localStorage.setItem('human_behavior_last_activity', Date.now().toString());
  };

  // Track ALL user interactions
  window.addEventListener('click', updateActivity);
  window.addEventListener('keydown', updateActivity);
  window.addEventListener('scroll', updateActivity);
  window.addEventListener('mousemove', updateActivity);
}

// User identification and properties
public async addUserInfo({ userId, userProperties }) {
  this.userProperties = userProperties;
  await this.api.sendUserData(userId, userProperties, this.sessionId);

  // Map user across sessions
  this.setCookie(`human_behavior_end_user_id_${this.apiKey}`, userId, 365);
}

// Automatic user session management
public isPreexistingUser(): boolean {
  const existingUserId = this.getCookie(`human_behavior_end_user_id_${this.apiKey}`);
  return existingUserId !== null;
}
```

**Features**:

- **Automatic engagement tracking**: Updates activity timestamp on any interaction
- **User property storage**: Rich user data (email, plan, etc.) sent to backend
- **Cross-session user identity**: User ID persists across multiple sessions
- **Preexisting user detection**: Knows if user has visited before
- **Zero-config**: Works automatically without manual tracking calls

#### **Swing SDK's User Tracking**

Swing SDK provides **manual tracking via React hooks**:

```typescript
// Manual hook-based tracking
export const useSwing = (): SwingContextValue => {
  const context = useContext(SwingContext);
  return context; // Developer decides what to do with this
};

export const useSwingSession = (): {
  sessionId: string | null;
  isRecording: boolean;
} => {
  const { sessionId, isRecording } = useSwing();
  return { sessionId, isRecording }; // Read-only access
};

// Developer must manually track user actions
function MyComponent() {
  const { recorder } = useSwing();

  const handleUserAction = () => {
    // Developer manually decides what to track
    // No automatic user property storage
    // No automatic engagement tracking
  };
}
```

**Features**:

- **Manual control**: Developers choose when/what to track
- **React-first**: Hooks integrate with React component lifecycle
- **No user persistence**: No cross-session user tracking
- **Session-scoped**: User context tied to current recording session
- **Explicit**: All tracking requires deliberate developer action

**Why the Difference?**

- **HumanBehavior**: **Analytics platform** → automatic user journey and engagement tracking
- **Swing**: **Developer tool** → manual control for debugging specific scenarios

### 📊 **Philosophical Differences Summary**

| Aspect               | HumanBehavior                       | Swing SDK                       |
| -------------------- | ----------------------------------- | ------------------------------- |
| **Purpose**          | Business analytics + session replay | Session replay for debugging    |
| **Automation Level** | Fully automatic                     | Developer-controlled            |
| **Data Persistence** | Cross-page, cross-session           | Single page session             |
| **User Focus**       | End user behavior analysis          | Developer debugging experience  |
| **Setup Complexity** | Zero-config analytics               | Minimal config, manual tracking |

**HumanBehavior** treats sessions as **continuous user journeys across multiple pages and visits**, automatically extracting business intelligence.

**Swing SDK** treats sessions as **discrete debugging sessions per page load**, giving developers precise control over what gets recorded for technical analysis.

Both use rrweb as the foundation, but they're solving fundamentally different problems:

- **HumanBehavior**: "What are my users doing and why?"
- **Swing SDK**: "How do I debug this specific user interaction?"

---

## 🎯 Summary

**HumanBehavior's Value Proposition**:

1. **Complete Session Recording**: Full rrweb capture for pixel-perfect replay
2. **Business Intelligence**: Structured events for analytics and insights
3. **Reliable Transmission**: Chunked, redundant upload with multiple fallbacks
4. **Automatic Tracking**: Zero-config capture of common user interactions
5. **Privacy Controls**: Built-in redaction and data masking

**Trade-offs**:

- **Larger payload size** due to dual event streams
- **More complex implementation** vs pure rrweb
- **Vendor lock-in** to HumanBehavior's hosted service
- **Less control** over data transmission vs custom implementation

This architecture makes HumanBehavior a **hybrid solution** that bridges the gap between session replay tools (like LogRocket) and analytics platforms (like Mixpanel), providing both pixel-perfect replay and structured business intelligence in a single SDK.
