# Swing SDK

A powerful session recording and user behavior analytics SDK inspired by PostHog and Human Behavior, but built for simplicity and privacy.

## Features

- 🎥 **Session Recording** - Full session replay with rrweb
- 🔍 **Automatic Event Tracking** - Clicks, forms, navigation 
- 📝 **Console Tracking** - Capture console logs and errors
- 👤 **User Management** - Identify and track users
- 📊 **Custom Events** - Track business-specific events
- 🔒 **Privacy Controls** - Simple CSS-based redaction
- ⚛️ **React Integration** - Easy React hooks and provider

## Quick Start

### Installation

```bash
npm install @swing/sdk
```

### Basic Usage

```typescript
import { SwingProvider } from '@swing/sdk';

// Wrap your app
function App() {
  return (
    <SwingProvider apiKey="your-api-key">
      <YourApp />
    </SwingProvider>
  );
}

// Use in components
import { useSwingSDK } from '@swing/sdk';

function LoginComponent() {
  const { identifyUser, sendCustomEvent } = useSwingSDK();
  
  const handleLogin = (user) => {
    identifyUser(user.id, { email: user.email });
    sendCustomEvent('user_login', { method: 'email' });
  };
}
```

## Privacy & Redaction

### Simple CSS Selectors (Human Behavior Style)

```typescript
// Initialize with redaction
<SwingProvider 
  apiKey="your-key"
  options={{
    redactFields: [
      'input[type="password"]',    // All password fields
      'input[type="email"]',       // All email fields  
      '.sensitive-data',           // Any element with this class
      '#credit-card-number',       // Specific element ID
      '[data-private]'             // Any element with data-private attribute
    ]
  }}
>
  <App />
</SwingProvider>

// Update redaction dynamically
const { setRedactedFields, getRedactedFields } = useSwingSDK();

// Add more fields to redact
setRedactedFields([
  ...getRedactedFields(),
  '.payment-info',
  '#social-security'
]);
```

### HTML Examples

```html
<!-- These will be redacted -->
<input type="password" name="password" />
<input type="email" class="sensitive-data" />
<div data-private>Secret content</div>
<span class="credit-card">4111 1111 1111 1111</span>

<!-- These will be recorded normally -->
<input type="text" name="username" />
<button>Submit</button>
<div>Public content</div>
```

## API Reference

### SwingProvider Props

```typescript
interface SwingSDKProviderProps {
  apiKey: string;                    // Your Swing API key
  children: ReactNode;
  options?: {
    userId?: string;                 // Initial user ID
    sessionId?: string;              // Custom session ID
    redactFields?: string[];         // CSS selectors to redact
  };
}
```

### useSwingSDK Hook

```typescript
const {
  // User Management
  setUser,              // (user: SwingUser) => void
  identifyUser,         // (userId: string, properties?) => void  
  clearUser,            // () => void
  
  // Custom Events
  sendCustomEvent,      // (name: string, properties?) => void
  
  // Privacy Controls
  setRedactedFields,    // (selectors: string[]) => void
  getRedactedFields,    // () => string[]
  
  // Status
  isInitialized         // boolean
} = useSwingSDK();
```

## Advanced Usage

### Custom Events

```typescript
const { sendCustomEvent } = useSwingSDK();

// Track business events
sendCustomEvent('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  items: ['product_1', 'product_2']
});

// Track feature usage
sendCustomEvent('feature_used', {
  feature: 'dark_mode',
  enabled: true
});
```

### User Management

```typescript
const { identifyUser, setUser, clearUser } = useSwingSDK();

// Simple identification
identifyUser('user_123');

// With properties
identifyUser('user_123', {
  email: 'john@example.com',
  plan: 'premium',
  signupDate: '2024-01-15'
});

// Full user object
setUser({
  id: 'user_123',
  email: 'john@example.com',
  name: 'John Doe',
  properties: {
    plan: 'premium',
    lastSeen: new Date()
  }
});

// Clear user (logout)
clearUser();
```

### Privacy Controls

```typescript
const { setRedactedFields, getRedactedFields } = useSwingSDK();

// Get current redacted fields
const current = getRedactedFields();
console.log(current); // ['input[type="password"]']

// Add more fields
setRedactedFields([
  ...current,
  '.sensitive',
  '#secret-div',
  'input[name="ssn"]'
]);

// Replace all fields
setRedactedFields([
  'input[type="password"]',
  'input[type="email"]',
  '.payment-form input'
]);
```

## What Gets Tracked Automatically

### 🖱️ Click Events
- Button clicks
- Link clicks  
- Any element clicks
- Element details (tag, id, class, text)

### 📝 Form Events
- Form submissions
- Field data (respecting redaction)
- Form metadata (action, method)

### 🧭 Navigation Events
- Page changes (SPA)
- Route transitions
- URL changes

### 📊 Console Events
- `console.log()`, `console.error()`, `console.warn()`, `console.info()`
- JavaScript errors and stack traces
- Unhandled promise rejections

### 🎥 Session Recording
- DOM changes
- Mouse movements
- Scroll events
- Input interactions (with privacy controls)

## Privacy & Compliance

### Default Privacy
- ✅ **Passwords masked by default**
- ✅ **Simple CSS-based redaction**
- ✅ **No complex configuration needed**

### GDPR/CCPA Ready
```typescript
// Redact PII fields
setRedactedFields([
  'input[type="email"]',
  'input[name*="name"]',
  'input[name*="phone"]',
  '.pii-data',
  '[data-sensitive]'
]);
```

### Production Best Practices
```typescript
<SwingProvider 
  apiKey={process.env.SWING_API_KEY}
  options={{
    redactFields: [
      // Always redact these in production
      'input[type="password"]',
      'input[type="email"]',
      '.payment-info',
      '.personal-data',
      '[data-private]'
    ]
  }}
>
```

## Comparison

| Feature | Swing SDK | PostHog | Human Behavior |
|---------|-----------|---------|----------------|
| Session Recording | ✅ | ✅ | ✅ |
| Auto Event Tracking | ✅ | ✅ | ✅ |
| Console Tracking | ✅ | ❌ | ✅ |
| Simple Privacy | ✅ | ❌ | ✅ |
| React Integration | ✅ | ✅ | ✅ |
| Self-Hosted | ✅ | ✅ | ❌ |

## Backend Integration

The SDK sends data to your Swing backend at `/upload`. See the [Backend Documentation](../swing-backend/docs/README.md) for setup instructions.

## Examples

Check out the [Fitia demo app](../fitia/Fitia/) for complete examples of:
- User login/logout tracking
- Form submission tracking  
- Custom business events
- Privacy redaction
- Session replay

## Support

- 📖 [Full Documentation](./docs/)
- 🐛 [Report Issues](https://github.com/your-org/swing/issues)
- 💬 [Discussions](https://github.com/your-org/swing/discussions)