// examples/nextjs-app-router.tsx
// This is an example of how to use Swing JS with Next.js App Router

import { SwingProvider } from "swing-js/react";
import { ReactNode } from "react";

// app/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SwingProvider
          apiKey="your-api-key-here"
          endpoint="https://your-api.com/sessions"
          options={{
            debug: true, // Enable debug logging
            sampling: {
              mousemove: 0.1, // Sample 10% of mouse movements
              scroll: 0.5, // Sample 50% of scroll events
            },
            upload: {
              flushInterval: 5000, // Upload every 5 seconds
              maxBatchSize: 50, // Upload after 50 events
              uploadOnUnload: true, // Upload when page unloads
            },
            recordOptions: {
              // Block sensitive elements
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
            },
          }}
        >
          {children}
        </SwingProvider>
      </body>
    </html>
  );
}

// app/page.tsx - Example page that uses Swing hooks
import { useSwing, useSwingSession } from "swing-js/react";

function HomePage() {
  const { recorder, isRecording } = useSwing();
  const { sessionId } = useSwingSession();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Swing JS Example</h1>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Session Info</h2>
        <p>
          Session ID: <code>{sessionId}</code>
        </p>
        <p>Recording: {isRecording ? "🔴 Active" : "⭕ Stopped"}</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => recorder?.stop()}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Stop Recording
        </button>

        <button
          onClick={() => recorder?.start()}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Start Recording
        </button>
      </div>

      {/* Example of sensitive content that will be blocked */}
      <div className="mt-8 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">Form Example</h3>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Regular input (recorded)"
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password (masked)"
            className="w-full p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email (masked)"
            className="w-full p-2 border rounded"
          />
          <div className="swing-block p-4 bg-yellow-100 rounded">
            <p>This content is blocked from recording</p>
          </div>
          <div className="swing-mask">
            <p>This text content is masked</p>
          </div>
        </form>
      </div>
    </div>
  );
}
