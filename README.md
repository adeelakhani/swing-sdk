# SwingSDK

SwingSDK is a next-generation analytics SDK powered by [rrweb](https://github.com/rrweb-io/rrweb). Unlike traditional session replay tools, SwingSDK captures user sessions, analyzes them on our backend, and delivers agentic, actionable insights to help you improve your product and user experience.

**You do not need to manage or access raw session replays or backend URLs. SwingSDK handles all data collection and analysis, and provides you with insights—not just raw data.**

---

## Installation

Install via npm or yarn:

```bash
npm install swingsdk
# or
yarn add swingsdk
```

---

## Usage in React

### 1. Wrap your app with `<SwingProvider>`

```jsx
import { SwingProvider } from 'swingsdk';

function App() {
  return (
    <SwingProvider apiKey="your-key">
      {/* your app components */}
    </SwingProvider>
  );
}
```

### 2. (Optional) Use the `useSwingSDK` hook

```jsx
import { useSwingSDK } from 'swingsdk';

function MyComponent() {
  const swing = useSwingSDK();
  // You can interact with the SDK instance here if needed
  return <div>...</div>;
}
```

---

## API Options for `<SwingProvider>`

| Name         | Type     | Required | Description |
|--------------|----------|----------|-------------|
| apiKey       | string   | Yes      | Your project or API key |
| userId       | string   | No       | User identifier |
| sessionId    | string   | No       | Session identifier |
| rrwebOptions | object   | No       | rrweb recording options |

> **Note:** The backend endpoint is set internally by the SDK. You do **not** need to provide it or manage session replays yourself.

---

## How to Build and Publish (for SDK maintainers)

1. **Build the SDK**
   ```bash
   cd swingsdk
   npm install
   npm run build
   ```
   This will output bundled files to `dist/`.

2. **Publish to npm (optional)**
   - Update `package.json` with your details.
   - Login to npm:
     ```bash
     npm login
     ```
   - Publish:
     ```bash
     npm publish
     ```

---

## FAQ

**Q: Do I need to set up a backend or manage session replays?**
> No. SwingSDK automatically uploads session data to our backend, where it is analyzed. You receive actionable insights—not raw replays.

**Q: How do I set the backend endpoint?**
> You do **not** need to set the endpoint. The SDK handles it internally.

**Q: How do I ensure events are sent before the user leaves?**
> The SDK uses `navigator.sendBeacon` on unload for reliability.

**Q: Can I customize rrweb recording?**
> Yes, pass any rrweb options via the `rrwebOptions` prop.

**Q: How do I stop and flush events manually?**
> Use the `useSwingSDK` hook to access the SDK instance and call its stop method if needed.

---

## Troubleshooting
- Make sure your project key is correct and your app is connected to the internet.
- For advanced usage, see [rrweb documentation](https://github.com/rrweb-io/rrweb).

---

## License
MIT 