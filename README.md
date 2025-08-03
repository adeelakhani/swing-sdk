# Swing SDK

Swing SDK automatically captures user interactions and sends them to our backend for agentic analysis. You get actionable insights, not raw data.

## 🚀 Quick Start

### Installation
```bash
npm install swing-sdk
```

### Basic Setup
```jsx
import { SwingProvider } from 'swing-sdk';

function App() {
  return (
    <SwingProvider apiKey="your-api-key">
      <YourApp />
    </SwingProvider>
  );
}
```

**That's it!** The SDK automatically starts recording and analyzing user interactions.

---

## 📊 Automatic Features

### Session Recording
The SDK automatically captures:
- ✅ **All clicks** - Every button, link, and element interaction
- ✅ **Form submissions** - All form data (passwords automatically masked)
- ✅ **Navigation** - Page changes and URL updates
- ✅ **Console logs** - All console.log, error, warn, and info calls
- ✅ **JavaScript errors** - Unhandled errors and exceptions
- ✅ **Page views** - Every page the user visits

### Agentic Analysis
Our backend automatically analyzes sessions to provide:
- **User journey insights** - How users navigate your app
- **Error patterns** - What causes issues and when
- **Conversion analysis** - Where users drop off and why
- **Performance insights** - Slow interactions and bottlenecks
- **Feature usage** - Which features users engage with most

---

## 🎯 Optional Features

### User Identification
Track specific users across sessions:

```jsx
import { useSwingSDK } from 'swing-sdk';

function LoginComponent() {
  const { identifyUser, clearUser } = useSwingSDK();

  const handleSignIn = (user) => {
    identifyUser(user.id, {
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan  // Custom properties go here
    });
  };

  const handleSignOut = () => {
    clearUser();
  };
}
```

**Benefits:**
- Link insights to specific users
- Track user behavior patterns
- Debug issues for specific users
- Analyze user segments

### Custom Events
Track specific business events for deeper analysis:

```jsx
import { useSwingSDK } from 'swing-sdk';

function MyComponent() {
  const { sendCustomEvent } = useSwingSDK();

  const handlePurchase = () => {
    sendCustomEvent('purchase_completed', {
      amount: 99.99,
      product: 'premium_plan',
      paymentMethod: 'credit_card'
    });
  };

  const handleFeatureUsed = () => {
    sendCustomEvent('feature_used', {
      featureName: 'dark_mode',
      userType: 'premium'
    });
  };
}
```

**Benefits:**
- Track business-specific metrics
- Analyze conversion funnels
- Monitor feature adoption
- Measure user engagement

---

## 🔧 Configuration Options

### Basic Configuration
```jsx
<SwingProvider apiKey="your-api-key">
  <App />
</SwingProvider>
```

### Advanced Configuration
```jsx
<SwingProvider 
  apiKey="your-api-key"
  options={{
    userId: "user123",        // Optional: Track specific user
    sessionId: "session456"   // Optional: Maintain session continuity
  }}
>
  <App />
</SwingProvider>
```

### Environment-Based Configuration
```jsx
<SwingProvider 
  apiKey={process.env.NEXT_PUBLIC_SWING_API_KEY}
  options={{
    userId: process.env.NEXT_PUBLIC_SWING_USER_ID,
    sessionId: process.env.NEXT_PUBLIC_SWING_SESSION_ID
  }}
>
  <App />
</SwingProvider>
```

---

## 📈 What You Get

### Agentic Insights
- **User behavior analysis** - Understand how users actually use your app
- **Error pattern detection** - Identify and fix recurring issues
- **Conversion optimization** - Find and fix drop-off points
- **Performance optimization** - Identify slow interactions
- **Feature usage analysis** - See which features drive engagement

### Business Intelligence
- **User journey mapping** - See complete user paths through your app
- **Conversion funnel analysis** - Track user progression through key flows
- **Error impact analysis** - Understand how errors affect user experience
- **Performance impact** - See how speed affects user behavior
- **Feature adoption insights** - Understand what drives feature usage

---

## 🛡️ Privacy Features

### Automatic Privacy Protection
- **Password masking** - Passwords are automatically hidden from analysis
- **Sensitive data protection** - Form fields can be masked with CSS classes
- **GDPR compliance** - Built-in support for data privacy requirements

### Privacy Controls
```css
/* Block entire elements from recording */
.swing-no-capture {
  /* This element and all children won't be recorded */
}

/* Mask text content */
.swing-mask {
  /* Text content will be replaced with asterisks */
}

/* Ignore input changes */
.swing-ignore-input {
  /* Input changes won't be recorded */
}
```

---

## 🚀 Use Cases

### Product Development
- **User experience research** - Understand how users actually use your app
- **Feature optimization** - See which features are used most and least
- **Conversion optimization** - Identify and fix points where users drop off
- **Performance optimization** - Find and fix slow interactions

### Customer Support
- **Issue reproduction** - Understand exactly what led to user problems
- **User confusion analysis** - See where users get stuck or confused
- **Proactive support** - Identify issues before users report them

### Business Intelligence
- **User behavior analysis** - Understand user patterns and preferences
- **A/B testing validation** - Verify that test results match user behavior
- **Conversion analysis** - Track key business metrics and conversions

---

## 🔧 Advanced Features

### Manual Event Tracking
```jsx
const { sendCustomEvent } = useSwingSDK();

// Track business events
sendCustomEvent('purchase_completed', {
  amount: 99.99,
  product: 'premium_plan'
});

// Track user actions
sendCustomEvent('button_clicked', {
  buttonName: 'signup_button',
  pageLocation: 'pricing_page'
});

// Track errors
sendCustomEvent('api_error', {
  endpoint: '/api/users',
  statusCode: 500,
  errorMessage: 'Database connection failed'
});
```

### User Management
```jsx
const { identifyUser, clearUser } = useSwingSDK();

// Identify user on login
identifyUser('user123', {
  name: 'John Doe',
  email: 'john@example.com',
  customField: 'premium'  // Custom properties
});

// Clear user on logout
clearUser();
```

---

## 📚 API Reference

### SwingProvider Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiKey` | string | Yes | Your project API key |
| `options.userId` | string | No | User identifier for tracking |
| `options.sessionId` | string | No | Session identifier for continuity |

### useSwingSDK Hook
| Method | Description |
|--------|-------------|
| `identifyUser(userId, properties)` | Identify a user with properties |
| `clearUser()` | Clear the current user |
| `sendCustomEvent(name, properties)` | Send a custom event |
| `isInitialized` | Whether the SDK is ready |

---

## 📄 License
MIT 