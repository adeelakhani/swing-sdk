# Swing JS - Session Replay SDK for Next.js

A comprehensive session replay SDK designed exclusively for Next.js applications. Swing JS provides pixel-perfect session recording with automatic business intelligence tracking, making it a drop-in replacement for HumanBehavior SDK.

## 🚀 Features

- **Complete Session Recording**: Pixel-perfect rrweb-based recording
- **Automatic Event Tracking**: Button clicks, link clicks, form submissions, console logs, and navigation
- **Business Intelligence**: Structured event data for analytics and insights
- **Advanced Data Transmission**: Chunked uploads with multiple fallback methods
- **Persistent Sessions**: Cross-page session continuity with 30-minute timeout
- **User Management**: Automatic user identification and cross-session tracking
- **Privacy Controls**: Built-in data redaction and masking
- **Next.js Optimized**: Works with both App Router and Pages Router
- **Global Singleton**: Persistent tracking across page changes
- **TypeScript Support**: Full type definitions included

## 📦 Installation

```bash
npm install swing-sdk-js
```

## 🔧 Quick Start

### App Router (Next.js 13+)

```tsx
// app/layout.tsx
import { SwingProvider } from "swing-sdk-js/react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SwingProvider
          apiKey="your-api-key"
          ingestionUrl="https://your-api.com"
          options={{
            enableAutomaticTracking: true,
            enableConsoleTracking: true,
            debug: process.env.NODE_ENV === "development",
          }}
        >
          {children}
        </SwingProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/page.tsx
"use client";
import { useSwing, useSwingUser, useSwingEvents } from "swing-sdk-js/react";

export default function HomePage() {
  const { sessionId, isRecording } = useSwing();
  const { addUserInfo, getUserId } = useSwingUser();
  const { sendCustomEvent } = useSwingEvents();

  const handleLogin = async () => {
    await addUserInfo("user-123", {
      email: "user@example.com",
      plan: "premium",
      name: "John Doe",
    });
  };

  const handlePurchase = async () => {
    await sendCustomEvent("purchase", {
      amount: 99.99,
      currency: "USD",
      product: "Pro Plan",
    });
  };

  return (
    <div>
      <h1>Welcome to Swing JS</h1>
      <p>Session ID: {sessionId}</p>
      <p>Recording: {isRecording ? "Active" : "Inactive"}</p>

      <button onClick={handleLogin}>Login User</button>
      <button onClick={handlePurchase}>Track Purchase</button>
    </div>
  );
}
```

### Pages Router (Legacy)

```tsx
// pages/_app.tsx
import { SwingProvider } from "swing-sdk-js/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SwingProvider apiKey="your-api-key" ingestionUrl="https://your-api.com">
      <Component {...pageProps} />
    </SwingProvider>
  );
}
```

### Global Singleton Usage

```tsx
// Anywhere in your app
import { SwingTracker, initSwing } from "swing-sdk-js";

// Initialize and auto-start
const tracker = initSwing("your-api-key", "https://your-api.com", {
  enableAutomaticTracking: true,
  enableConsoleTracking: true,
});

// Or manually control
const tracker = SwingTracker.init("your-api-key", "https://your-api.com");
await tracker.start();

// Add user information
await tracker.addUserInfo("user-123", {
  email: "user@example.com",
  plan: "premium",
});

// Send custom events
await tracker.sendCustomEvent("feature_used", {
  feature: "advanced_search",
  timestamp: Date.now(),
});
```

## ⚙️ Configuration Options

```tsx
interface SwingOptions {
  // Core settings
  debug?: boolean;
  ingestionUrl?: string;

  // Automatic tracking
  enableAutomaticTracking?: boolean;
  automaticTrackingOptions?: {
    trackButtons?: boolean;
    trackLinks?: boolean;
    trackForms?: boolean;
    includeText?: boolean;
    includeClasses?: boolean;
  };

  // Console tracking
  enableConsoleTracking?: boolean;

  // Privacy controls
  redactFields?: string[];

  // Upload configuration
  upload?: {
    flushInterval?: number; // Default: 5000ms
    maxBatchSize?: number; // Default: 50 events
    uploadOnUnload?: boolean; // Default: true
  };

  // Sampling rates
  sampling?: {
    mousemove?: number; // Default: 0.1
    mouseInteraction?: number; // Default: 1
    scroll?: number; // Default: 0.1
    media?: number; // Default: 1
    input?: number; // Default: 1
  };

  // rrweb specific options
  recordOptions?: {
    blockClass?: string | RegExp;
    maskTextClass?: string | RegExp;
    maskInputOptions?: Record<string, boolean>;
    // ... other rrweb options
  };
}
```

## 🎣 React Hooks

### Core Hooks

```tsx
import {
  useSwing,
  useSwingTracker,
  useSwingSession,
  useSwingUser,
  useSwingEvents,
  useSwingPrivacy,
} from "swing-sdk-js/react";

// Main hook
const { tracker, sessionId, isRecording } = useSwing();

// Direct tracker access
const tracker = useSwingTracker();

// Session information
const { sessionId, isRecording } = useSwingSession();

// User management
const { addUserInfo, authenticateUser, getUserId } = useSwingUser();

// Custom events
const { sendCustomEvent } = useSwingEvents();

// Privacy controls
const { setRedactedFields } = useSwingPrivacy();
```

### User Management Examples

```tsx
// Add user information
await addUserInfo("user-123", {
  email: "user@example.com",
  plan: "premium",
  signupDate: "2023-01-01",
});

// Authenticate user with specific fields
await authenticateUser(
  "user-123",
  {
    id: "user-123",
    email: "user@example.com",
  },
  ["id", "email"]
);
```

## 🔒 Privacy & Data Protection

### Automatic Redaction

```tsx
// Configure sensitive fields to redact
const { setRedactedFields } = useSwingPrivacy();

setRedactedFields([
  'input[type="password"]',
  "#credit-card-number",
  ".sensitive-data",
  "[data-private]",
]);
```

### Manual Privacy Controls

```tsx
// Block specific elements from recording
<div className="swing-block">
  This content will not be recorded
</div>

// Mask text content
<div className="swing-mask">
  This text will be replaced with ***
</div>

// Ignore element changes
<div className="swing-ignore">
  Changes to this element will be ignored
</div>
```

## 📊 Event Tracking

Swing JS automatically captures structured business events:

### Automatic Events

- **Button Clicks**: `button_clicked` with ID, type, text, and CSS classes
- **Link Clicks**: `link_clicked` with URL, target, text, and CSS classes
- **Form Submissions**: `form_submitted` with form fields and metadata
- **Console Logs**: `console` with log level and messages
- **Navigation**: `navigation` with route changes and navigation type

### Custom Events

```tsx
// Track business events
await sendCustomEvent("conversion", {
  type: "signup",
  value: 0,
  currency: "USD",
});

await sendCustomEvent("feature_interaction", {
  feature: "search",
  query: "typescript hooks",
  resultsCount: 42,
});
```

## 🔄 Data Transmission

### Multiple Upload Methods

1. **Chunked HTTP POST**: Primary method with 1MB chunk size
2. **Navigator.sendBeacon**: Fallback for page unload
3. **Session Initialization**: Establishes session context
4. **User Data Sync**: Dedicated user information endpoints

### API Endpoints

```
POST /api/ingestion/init              # Session initialization
POST /api/ingestion/events            # Event data upload
POST /api/ingestion/user              # User information
POST /api/ingestion/user/auth         # User authentication
POST /api/ingestion/customEvent       # Single custom event
POST /api/ingestion/customEvent/batch # Batch custom events
```

## 🔧 Advanced Usage

### Manual Session Management

```tsx
import { SwingTracker } from "swing-sdk-js";

const tracker = SwingTracker.init("api-key", "https://api.com");

// Start tracking
await tracker.start();

// Add user info
await tracker.addUserInfo("user-123", { plan: "pro" });

// Set privacy controls
tracker.setRedactedFields(['input[type="password"]']);

// Enable console tracking
tracker.enableConsoleTracking();

// Stop tracking
tracker.stop();
```

### Custom Event Integration

```tsx
// Track page views
await tracker.sendCustomEvent("page_view", {
  page: "/dashboard",
  referrer: document.referrer,
  timestamp: Date.now(),
});

// Track errors
window.addEventListener("error", async (event) => {
  await tracker.sendCustomEvent("javascript_error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});
```

## 📈 Migration from HumanBehavior

Swing JS is designed as a drop-in replacement for HumanBehavior SDK:

```tsx
// Before: HumanBehavior
import { HumanBehaviorProvider } from "humanbehavior-js/react";

// After: Swing JS
import { SwingProvider } from "swing-sdk-js/react";

// API compatibility
<SwingProvider apiKey="..." ingestionUrl="...">
  {children}
</SwingProvider>;
```

## 🐛 Debugging

Enable debug mode to see detailed logging:

```tsx
<SwingProvider apiKey="your-api-key" options={{ debug: true }}>
  {children}
</SwingProvider>
```

Debug output includes:

- Session initialization
- Event recording and processing
- Upload attempts and results
- Error messages and warnings

## 📋 Requirements

- **Next.js**: 12.0+ (App Router or Pages Router)
- **React**: 17.0+
- **TypeScript**: 4.5+ (optional but recommended)
- **Browser**: Modern browsers with ES2018 support

## 🔗 API Reference

### SwingTracker

- `SwingTracker.init(apiKey, ingestionUrl?, options?)` - Create singleton instance
- `tracker.start()` - Start recording
- `tracker.stop()` - Stop recording
- `tracker.getSessionId()` - Get current session ID
- `tracker.getUserId()` - Get current user ID
- `tracker.addUserInfo(userId, properties)` - Add user information
- `tracker.sendCustomEvent(name, properties?)` - Send custom event
- `tracker.setRedactedFields(fields)` - Configure privacy redaction

### React Hooks

- `useSwing()` - Main context hook
- `useSwingTracker()` - Direct tracker access
- `useSwingSession()` - Session information
- `useSwingUser()` - User management
- `useSwingEvents()` - Custom event tracking
- `useSwingPrivacy()` - Privacy controls

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

---

Built with ❤️ for the Next.js community
