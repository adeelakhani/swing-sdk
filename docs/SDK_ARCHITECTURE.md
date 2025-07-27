# Swing SDK Architecture Documentation

## Overview

The Swing SDK is a session replay library built on top of [rrweb](https://github.com/rrweb-io/rrweb) that captures user interactions and sends them to a backend server for replay and analysis.

## File Structure

```
swingsdk/
├── src/
│   ├── index.ts          # Main SDK implementation
│   └── react.tsx         # React wrapper components
├── dist/                 # Built files
├── package.json          # Package configuration
├── rollup.config.js      # Build configuration
└── docs/
    └── SDK_ARCHITECTURE.md  # This file
```

## Core Files

### `src/index.ts` - Main SDK Implementation

**Purpose**: The core SDK that handles session recording and event transmission.

**Key Features**:
- **Session Recording**: Uses rrweb's `record()` function to capture DOM events
- **Event Batching**: Collects events and sends them in batches every 5 seconds
- **Payload Management**: Handles large payloads and retry logic
- **Global Exposure**: Exposes `SwingSDK` function to the global `window` object

**rrweb Integration**:
```typescript
stopRecording = rrweb.record({
  emit(event: eventWithTime) {
    events.push(event);
    console.log('SwingSDK: Event captured:', event.type);
  },
  checkoutEveryNth: 100,        // Full snapshot every 100 events
  checkoutEveryNms: 30 * 1000,  // Full snapshot every 30 seconds
  recordCanvas: false,           // Disabled for performance
  collectFonts: false,           // Disabled for performance
  inlineStylesheet: false,       // Disabled for performance
});
```

**Event Types Captured**:
- `type: 2` - Full snapshot (DOM structure)
- `type: 3` - Incremental snapshot (DOM mutations)
- `type: 4` - Mouse/touch interactions
- `type: 5` - Scroll events
- `type: 6` - Viewport resize events

**Payload Structure**:
```typescript
{
  projectId: string,      // API key
  userId?: string,        // Optional user identifier
  sessionId?: string,     // Optional session identifier
  url: string,           // Current page URL
  timestamp: string,     // ISO timestamp
  events: eventWithTime[] // Array of rrweb events
}
```

### `src/react.tsx` - React Integration

**Purpose**: Provides React components for easy integration into React applications.

**Components**:

#### `SwingProvider`
- **Props**: `apiKey`, `children`, `options` (userId, sessionId)
- **Functionality**: Initializes the SDK when the component mounts
- **Usage**: Wrap your app with this provider

```tsx
<SwingProvider apiKey="your-api-key">
  <YourApp />
</SwingProvider>
```

#### `useSwingSDK`
- **Returns**: Context with `apiKey` and `isInitialized` status
- **Usage**: Access SDK state in child components

**rrweb Integration**:
- Calls `window.SwingSDK()` with React props
- Manages SDK lifecycle with React component lifecycle
- Provides TypeScript types for React integration

## Build Configuration

### `rollup.config.js`
**Purpose**: Bundles the SDK for different module formats.

**Outputs**:
- `dist/index.cjs.js` - CommonJS format
- `dist/index.esm.js` - ES Module format  
- `dist/index.umd.min.js` - UMD format (minified)

**External Dependencies**:
- `react` and `react-dom` are external to avoid bundling
- `rrweb` is bundled with the SDK

### `package.json`
**Key Fields**:
- `main`: Points to CommonJS build
- `module`: Points to ES Module build
- `types`: Points to TypeScript declarations
- `files`: Only includes `dist` folder for npm

## rrweb Integration Details

### Event Capture Strategy
The SDK uses rrweb's recording capabilities with optimized settings:

1. **Performance Optimizations**:
   - Disabled canvas recording (`recordCanvas: false`)
   - Disabled font collection (`collectFonts: false`)
   - Disabled inline stylesheet capture (`inlineStylesheet: false`)

2. **Snapshot Strategy**:
   - Full snapshots every 100 events or 30 seconds
   - Incremental snapshots for DOM mutations
   - Mouse/touch interaction capture

3. **Event Processing**:
   - Events are buffered in memory
   - Sent in batches every 5 seconds
   - Automatic retry on network failures
   - `sendBeacon` for page unload events

### Event Types and Their Purpose

| Type | Name | Description |
|------|------|-------------|
| 2 | Full Snapshot | Complete DOM structure capture |
| 3 | Incremental Snapshot | DOM mutations (add/remove/change) |
| 4 | Mouse/Touch | User interaction events |
| 5 | Scroll | Scroll position changes |
| 6 | Viewport Resize | Window resize events |

### Replay Integration
The backend uses rrweb's `Replayer` class to reconstruct sessions:

```javascript
replayer = new rrweb.Replayer(events, {
  root: containerElement,
  speed: 1,
  showWarning: false,
  showDebug: true,
  mouseTail: true,
  liveMode: false,
});
```

## Usage Patterns

### 1. Script Tag Usage
```html
<script src="swing-sdk/dist/index.umd.min.js"></script>
<script>
  const stopSDK = SwingSDK('your-api-key');
  // Later: stopSDK();
</script>
```

### 2. React Usage
```tsx
import { SwingProvider } from 'swing-sdk';

function App() {
  return (
    <SwingProvider apiKey="your-api-key">
      <YourApp />
    </SwingProvider>
  );
}
```

### 3. Module Import
```javascript
import SwingSDK from 'swing-sdk';

const stopSDK = SwingSDK('your-api-key');
```

## Configuration Options

### SDK Options
```typescript
interface SwingSDKOptions {
  apiKey: string;        // Required: Your project API key
  userId?: string;       // Optional: User identifier
  sessionId?: string;    // Optional: Session identifier
}
```

### Environment Variables
- `BACKEND_URL`: Custom backend endpoint (defaults to `http://localhost:8000/upload`)
- `NODE_ENV`: Environment detection for error handling

## Error Handling

The SDK includes comprehensive error handling:

1. **Network Failures**: Automatic retry with exponential backoff
2. **Payload Size Limits**: Handles large event batches
3. **Browser Compatibility**: Graceful degradation for older browsers
4. **Initialization Guards**: Prevents double initialization

## Performance Considerations

1. **Memory Management**: Events are cleared after successful upload
2. **Network Optimization**: Batched requests reduce server load
3. **Browser Performance**: Disabled heavy features (canvas, fonts)
4. **Payload Size**: Automatic size checking and limiting

## Security Features

1. **Input Masking**: Sensitive form inputs are masked
2. **URL Sanitization**: URLs are captured but can be filtered
3. **User Consent**: Designed for opt-in usage patterns
4. **Data Minimization**: Only captures necessary interaction data

## Development Workflow

1. **Source Code**: Edit files in `src/`
2. **Build**: Run `npm run build` to generate `dist/`
3. **Testing**: Use the backend replay page for testing
4. **Publishing**: Update version in `package.json` and publish

This architecture provides a robust, performant session replay solution that integrates seamlessly with both vanilla JavaScript and React applications while leveraging rrweb's powerful recording capabilities. 