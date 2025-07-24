# 🚀 Swing JS

A session replay SDK for Next.js applications using [rrweb](https://github.com/rrweb-io/rrweb). Record user sessions with a clean, developer-friendly API.

## ✨ Features

- 🎯 **Next.js Optimized**: Works seamlessly with both App Router and Pages Router
- 🔄 **Automatic Route Tracking**: Captures navigation changes automatically
- 🛡️ **SSR Compatible**: Safe for server-side rendering
- 📱 **Lightweight**: Minimal bundle size impact
- 🎛️ **Configurable**: Extensive customization options
- 🔒 **Privacy-First**: Built-in data masking and blocking capabilities

## 📦 Installation

```bash
npm install swing-js
```

## 🚀 Quick Start

### App Router (Next.js 13+)

Add the `SwingProvider` to your root layout:

```tsx
// app/layout.tsx
import { SwingProvider } from "swing-js/react";

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
          endpoint="https://your-api.com/sessions"
        >
          {children}
        </SwingProvider>
      </body>
    </html>
  );
}
```

### Pages Router (Next.js 12 and below)

Add the `SwingProvider` to your `_app.tsx`:

```tsx
// pages/_app.tsx
import { SwingProvider } from "swing-js/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SwingProvider
      apiKey="your-api-key"
      endpoint="https://your-api.com/sessions"
    >
      <Component {...pageProps} />
    </SwingProvider>
  );
}
```

## ⚙️ Configuration

### Basic Configuration

```tsx
<SwingProvider
  apiKey="your-api-key"
  endpoint="https://your-api.com/sessions"
  options={{
    debug: true, // Enable debug logging
    sampling: {
      mousemove: 0.1, // Sample 10% of mouse movements
      scroll: 0.5, // Sample 50% of scroll events
    },
    upload: {
      flushInterval: 10000, // Upload every 10 seconds
      maxBatchSize: 100, // Upload after 100 events
      uploadOnUnload: true, // Upload when page unloads
    },
  }}
>
  {children}
</SwingProvider>
```

### Privacy & Data Masking

```tsx
<SwingProvider
  apiKey="your-api-key"
  endpoint="https://your-api.com/sessions"
  options={{
    recordOptions: {
      // Block elements with these classes
      blockClass: "swing-block",
      blockSelector: "[data-sensitive]",

      // Mask text content
      maskTextClass: "swing-mask",
      maskTextSelector: ".sensitive-text",

      // Mask input values
      maskInputOptions: {
        password: true,
        email: true,
        tel: true,
      },

      // Slim DOM to reduce payload size
      slimDOMOptions: {
        script: true,
        comment: true,
        headFavicon: true,
      },
    },
  }}
>
  {children}
</SwingProvider>
```

## 🎯 React Hooks

### useSwing

Access the full Swing context:

```tsx
import { useSwing } from "swing-js/react";

function MyComponent() {
  const { recorder, sessionId, isRecording } = useSwing();

  return (
    <div>
      <p>Session ID: {sessionId}</p>
      <p>Recording: {isRecording ? "Yes" : "No"}</p>
    </div>
  );
}
```

### useSwingRecorder

Direct access to the recorder instance:

```tsx
import { useSwingRecorder } from "swing-js/react";

function RecorderControls() {
  const recorder = useSwingRecorder();

  const handleStop = () => {
    recorder?.stop();
  };

  const handleStart = () => {
    recorder?.start();
  };

  return (
    <div>
      <button onClick={handleStop}>Stop Recording</button>
      <button onClick={handleStart}>Start Recording</button>
    </div>
  );
}
```

### useSwingSession

Access session information:

```tsx
import { useSwingSession } from "swing-js/react";

function SessionInfo() {
  const { sessionId, isRecording } = useSwingSession();

  return (
    <div>
      <h3>Session Status</h3>
      <p>ID: {sessionId}</p>
      <p>Recording: {isRecording ? "🔴 Active" : "⭕ Stopped"}</p>
    </div>
  );
}
```

## 🛠️ Advanced Usage

### Custom Event Handling

```tsx
import { SwingRecorder, SwingConfig } from "swing-js";

const config: SwingConfig = {
  apiKey: "your-api-key",
  endpoint: "https://your-api.com/sessions",
  options: {
    recordOptions: {
      emit: (event, isCheckout) => {
        // Custom event processing
        console.log("Event recorded:", event.type);
      },
    },
  },
};

const recorder = new SwingRecorder(config);
recorder.start();
```

### Manual Integration

If you prefer not to use the React provider:

```tsx
import { SwingRecorder, NextJSIntegration } from "swing-js";

useEffect(() => {
  const recorder = new SwingRecorder({
    apiKey: "your-api-key",
    endpoint: "https://your-api.com/sessions",
  });

  const integration = new NextJSIntegration(recorder);

  recorder.start();
  integration.setupRouteTracking();

  return () => {
    recorder.stop();
    integration.cleanup();
  };
}, []);
```

## 📊 Data Format

The SDK sends data in the following format:

```json
{
  "sessionId": "swing_1234567890_abc123",
  "apiKey": "your-api-key",
  "session": {
    "id": "swing_1234567890_abc123",
    "startTime": 1634567890123,
    "url": "https://example.com/page",
    "userAgent": "Mozilla/5.0...",
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "events": [
      {
        "type": 2,
        "data": {...},
        "timestamp": 1634567890456,
        "delay": 0
      }
    ]
  }
}
```

## 🔧 API Reference

### SwingConfig

| Property   | Type           | Required | Description                      |
| ---------- | -------------- | -------- | -------------------------------- |
| `apiKey`   | `string`       | ✅       | Your API key for authentication  |
| `endpoint` | `string`       | ✅       | Upload endpoint URL              |
| `options`  | `SwingOptions` | ❌       | Additional configuration options |

### SwingOptions

| Property        | Type      | Default | Description                   |
| --------------- | --------- | ------- | ----------------------------- |
| `debug`         | `boolean` | `false` | Enable debug logging          |
| `sampling`      | `object`  | `{}`    | Event sampling configuration  |
| `recordOptions` | `object`  | `{}`    | rrweb recording options       |
| `upload`        | `object`  | `{}`    | Upload behavior configuration |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © Swing

---

Made with ❤️ for Next.js developers
