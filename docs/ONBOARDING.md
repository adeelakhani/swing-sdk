# 🚀 Swing SDK Onboarding Guide

Welcome to Swing SDK! This guide will get you up and running with session replay and business intelligence tracking in your Next.js application in under 10 minutes.

## 📋 What You'll Need

Before getting started, make sure you have:

### **Required**

- ✅ **Next.js application** (version 12.0 or higher)
- ✅ **API Key** from your Swing dashboard
- ✅ **Ingestion Endpoint URL** (provided by Swing)
- ✅ **React 17.0+** (usually included with Next.js)

### **Optional**

- 🔧 **TypeScript** (recommended for better development experience)
- 🎛️ **Environment variables** setup for different environments

---

## 🎯 Step 1: Installation

Install the Swing SDK in your Next.js project:

```bash
npm install swing-sdk-js
```

or

```bash
yarn add swing-sdk-js
```

---

## ⚙️ Step 2: Get Your Credentials

You'll need these two pieces of information from your Swing dashboard:

### **API Key**

```
Format: swing_pk_live_1234567890abcdef...
```

### **Ingestion URL**

```
Format: https://ingest.your-domain.com
```

💡 **Tip**: Store these in environment variables for security:

```bash
# .env.local
NEXT_PUBLIC_SWING_API_KEY=swing_pk_live_1234567890abcdef...
NEXT_PUBLIC_SWING_INGESTION_URL=https://ingest.your-domain.com
```

---

## 🔧 Step 3: Basic Setup

Choose your Next.js setup method:

### **Option A: App Router (Next.js 13+)** ⭐ _Recommended_

Add the `SwingProvider` to your root layout:

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
          apiKey={process.env.NEXT_PUBLIC_SWING_API_KEY!}
          ingestionUrl={process.env.NEXT_PUBLIC_SWING_INGESTION_URL!}
        >
          {children}
        </SwingProvider>
      </body>
    </html>
  );
}
```

### **Option B: Pages Router (Next.js 12)**

Add the `SwingProvider` to your `_app.tsx`:

```tsx
// pages/_app.tsx
import { SwingProvider } from "swing-sdk-js/react";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SwingProvider
      apiKey={process.env.NEXT_PUBLIC_SWING_API_KEY!}
      ingestionUrl={process.env.NEXT_PUBLIC_SWING_INGESTION_URL!}
    >
      <Component {...pageProps} />
    </SwingProvider>
  );
}
```

---

## 🎉 Step 4: Verify It's Working

Add this test component to see if tracking is active:

```tsx
// app/page.tsx (App Router) or pages/index.tsx (Pages Router)
"use client"; // Only needed for App Router

import { useSwing } from "swing-sdk-js/react";

export default function HomePage() {
  const { sessionId, isRecording } = useSwing();

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>🚀 Swing SDK Status</h1>
      <div
        style={{
          background: isRecording ? "#d4edda" : "#f8d7da",
          padding: "10px",
          borderRadius: "5px",
          marginBottom: "10px",
        }}
      >
        <strong>Status:</strong>{" "}
        {isRecording ? "🟢 Recording Active" : "🔴 Not Recording"}
      </div>
      <div
        style={{ background: "#e2e3e5", padding: "10px", borderRadius: "5px" }}
      >
        <strong>Session ID:</strong> {sessionId || "Not initialized"}
      </div>

      {/* Test buttons for automatic tracking */}
      <div style={{ marginTop: "20px" }}>
        <h3>Test Automatic Tracking:</h3>
        <button style={{ margin: "5px", padding: "10px" }}>
          Click me! (Button tracking test)
        </button>
        <a
          href="#test"
          style={{
            margin: "5px",
            padding: "10px",
            display: "inline-block",
            background: "#007bff",
            color: "white",
            textDecoration: "none",
          }}
        >
          Link Test
        </a>
      </div>
    </div>
  );
}
```

**Expected result**: You should see "🟢 Recording Active" and a session ID starting with `swing_`.

---

## 🔧 Step 5: Configuration Options

Customize the SDK behavior with these options:

```tsx
<SwingProvider
  apiKey={process.env.NEXT_PUBLIC_SWING_API_KEY!}
  ingestionUrl={process.env.NEXT_PUBLIC_SWING_INGESTION_URL!}
  options={{
    // Core settings
    debug: process.env.NODE_ENV === "development",

    // Automatic tracking (enabled by default)
    enableAutomaticTracking: true,
    automaticTrackingOptions: {
      trackButtons: true, // Track button clicks
      trackLinks: true, // Track link clicks
      trackForms: true, // Track form submissions
      includeText: true, // Include button/link text
      includeClasses: false, // Include CSS classes (can be large)
    },

    // Console tracking (opt-in)
    enableConsoleTracking: true,

    // Privacy controls
    redactFields: ['input[type="password"]', "#credit-card", ".sensitive-data"],

    // Upload settings
    upload: {
      flushInterval: 5000, // Upload every 5 seconds
      maxBatchSize: 50, // Upload after 50 events
      uploadOnUnload: true, // Upload when leaving page
    },

    // Performance optimization
    sampling: {
      mousemove: 0.1, // Sample 10% of mouse movements
      scroll: 0.1, // Sample 10% of scroll events
      mouseInteraction: 1.0, // Sample 100% of clicks
    },
  }}
>
  {children}
</SwingProvider>
```

---

## 👤 Step 6: User Tracking (Recommended)

Add user information when users log in or sign up:

```tsx
"use client";
import { useSwingUser } from "swing-sdk-js/react";

export default function LoginPage() {
  const { addUserInfo } = useSwingUser();

  const handleLogin = async (userData: any) => {
    // Your existing login logic...

    // Add user info to Swing
    await addUserInfo(userData.id, {
      email: userData.email,
      name: userData.name,
      plan: userData.subscription?.plan,
      signupDate: userData.createdAt,
      // Add any other relevant user properties
    });
  };

  return <form onSubmit={handleLogin}>{/* Your login form */}</form>;
}
```

---

## 📊 Step 7: Custom Events (Optional)

Track business-critical events:

```tsx
"use client";
import { useSwingEvents } from "swing-sdk-js/react";

export default function CheckoutPage() {
  const { sendCustomEvent } = useSwingEvents();

  const handlePurchase = async (orderData: any) => {
    // Your existing purchase logic...

    // Track the conversion
    await sendCustomEvent("purchase_completed", {
      amount: orderData.total,
      currency: orderData.currency,
      productIds: orderData.items.map((item) => item.id),
      paymentMethod: orderData.paymentMethod,
      timestamp: Date.now(),
    });
  };

  const handleAbandonCart = async () => {
    await sendCustomEvent("cart_abandoned", {
      cartValue: calculateCartValue(),
      itemCount: cartItems.length,
      timeOnPage: Date.now() - pageLoadTime,
    });
  };

  return <div>{/* Your checkout UI */}</div>;
}
```

---

## 🔒 Step 8: Privacy & Compliance

Protect sensitive user data:

### **Automatic Field Redaction**

```tsx
import { useSwingPrivacy } from "swing-sdk-js/react";

export default function SettingsPage() {
  const { setRedactedFields } = useSwingPrivacy();

  useEffect(() => {
    // Configure what to redact
    setRedactedFields([
      'input[type="password"]',
      'input[name="ssn"]',
      "#credit-card-number",
      "[data-sensitive]",
      ".pii-data",
    ]);
  }, [setRedactedFields]);

  return (
    <form>
      <input type="password" placeholder="Password" />
      <input type="text" data-sensitive placeholder="SSN" />
      <input type="text" id="credit-card-number" placeholder="Card Number" />
      <div className="pii-data">Sensitive information</div>
    </form>
  );
}
```

### **Manual Content Blocking**

```tsx
export default function SecurePage() {
  return (
    <div>
      {/* This content will be recorded normally */}
      <h1>Public Content</h1>

      {/* This content will be completely blocked */}
      <div className="swing-block">
        <p>Sensitive data that should not be recorded</p>
        <input type="text" placeholder="Secret input" />
      </div>

      {/* This content will be masked with *** */}
      <div className="swing-mask">
        <p>This text will appear as *** in recordings</p>
      </div>
    </div>
  );
}
```

---

## 🌍 Step 9: Environment Setup

Configure for different environments:

### **Development**

```bash
# .env.local
NEXT_PUBLIC_SWING_API_KEY=swing_pk_test_1234567890abcdef...
NEXT_PUBLIC_SWING_INGESTION_URL=https://ingest-dev.your-domain.com
```

### **Production**

```bash
# .env.production
NEXT_PUBLIC_SWING_API_KEY=swing_pk_live_1234567890abcdef...
NEXT_PUBLIC_SWING_INGESTION_URL=https://ingest.your-domain.com
```

### **Conditional Loading**

```tsx
<SwingProvider
  apiKey={process.env.NEXT_PUBLIC_SWING_API_KEY!}
  ingestionUrl={process.env.NEXT_PUBLIC_SWING_INGESTION_URL!}
  options={{
    debug: process.env.NODE_ENV === "development",
    enableAutomaticTracking: process.env.NODE_ENV !== "test", // Disable in tests
  }}
>
  {children}
</SwingProvider>
```

---

## ✅ Step 10: Verification Checklist

Make sure everything is working:

- [ ] ✅ **SDK installed** (`npm list swing-sdk-js`)
- [ ] ✅ **Provider added** to layout or \_app
- [ ] ✅ **Environment variables** set
- [ ] ✅ **Recording status** shows active
- [ ] ✅ **Session ID** is generated
- [ ] ✅ **Console shows** "[Swing] Tracker started" (in debug mode)
- [ ] ✅ **Network tab** shows requests to ingestion URL
- [ ] ✅ **Button clicks** trigger automatic events
- [ ] ✅ **User info** added after login
- [ ] ✅ **Custom events** sent for business actions

---

## 🐛 Common Issues & Solutions

### **Issue: "Recording not active"**

```tsx
// ❌ Wrong - missing environment variables
<SwingProvider apiKey="" ingestionUrl="">

// ✅ Correct - with environment variables
<SwingProvider
  apiKey={process.env.NEXT_PUBLIC_SWING_API_KEY!}
  ingestionUrl={process.env.NEXT_PUBLIC_SWING_INGESTION_URL!}
>
```

### **Issue: "Session ID is null"**

**Solution**: Check browser console for errors. Common causes:

- Invalid API key
- CORS issues with ingestion URL
- Network connectivity problems

### **Issue: "Events not uploading"**

**Enable debug mode to see detailed logs:**

```tsx
<SwingProvider
  options={{ debug: true }}
  // ... other props
>
```

### **Issue: "TypeScript errors"**

**Install type definitions:**

```bash
npm install --save-dev @types/react @types/react-dom
```

---

## 🚀 Next Steps

Now that you have Swing SDK running:

### **Week 1: Monitor & Validate**

- [ ] Check session recordings in Swing dashboard
- [ ] Verify automatic event tracking is working
- [ ] Test user identification flow
- [ ] Validate custom events are being captured

### **Week 2: Optimize & Customize**

- [ ] Configure privacy redaction for your data
- [ ] Add custom events for key business actions
- [ ] Optimize sampling rates for performance
- [ ] Set up alerts for tracking issues

### **Week 3: Advanced Features**

- [ ] Implement user authentication tracking
- [ ] Add error tracking with custom events
- [ ] Create custom dashboards in Swing
- [ ] Set up A/B testing with session replay

---

## 📞 Support & Resources

### **Documentation**

- 📖 [Full API Reference](../README.md)
- 🔧 [Configuration Guide](../README.md#configuration-options)
- 🛡️ [Privacy Controls](../README.md#privacy--data-protection)

### **Community**

- 💬 **Discord**: Join our developer community
- 📧 **Email**: support@swing.dev
- 🐛 **GitHub Issues**: Report bugs and feature requests

### **Helpful Links**

- 🎥 **Video Tutorials**: Step-by-step setup guides
- 📊 **Dashboard**: View your recordings and analytics
- 🔧 **API Keys**: Manage your credentials

---

## 🎯 Quick Reference

### **Minimum Working Example**

```tsx
// App Router: app/layout.tsx
import { SwingProvider } from "swing-sdk-js/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SwingProvider
          apiKey="your-api-key"
          ingestionUrl="https://your-ingest-url.com"
        >
          {children}
        </SwingProvider>
      </body>
    </html>
  );
}
```

### **Essential Hooks**

```tsx
import {
  useSwing, // Main status and controls
  useSwingUser, // User identification
  useSwingEvents, // Custom event tracking
  useSwingPrivacy, // Privacy controls
} from "swing-sdk-js/react";
```

### **Core Methods**

```tsx
const { sessionId, isRecording } = useSwing();
const { addUserInfo } = useSwingUser();
const { sendCustomEvent } = useSwingEvents();
const { setRedactedFields } = useSwingPrivacy();
```

---

**🎉 Congratulations!** You've successfully integrated Swing SDK into your Next.js application. Your users' sessions are now being recorded and you're collecting valuable business intelligence data.

**Need help?** Reach out to our support team - we're here to help you get the most out of Swing SDK!
