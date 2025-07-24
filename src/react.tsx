import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { SwingRecorder } from "./recorder";
import { NextJSIntegration } from "./nextjs-integration";
import type { SwingConfig, SwingOptions } from "./types";

interface SwingProviderProps {
  apiKey: string;
  endpoint: string;
  options?: SwingOptions;
  children: ReactNode;
}

interface SwingContextValue {
  recorder: SwingRecorder | null;
  sessionId: string | null;
  isRecording: boolean;
}

const SwingContext = createContext<SwingContextValue | null>(null);

export const SwingProvider: React.FC<SwingProviderProps> = ({
  apiKey,
  endpoint,
  options = {},
  children,
}) => {
  const recorderRef = useRef<SwingRecorder | null>(null);
  const integrationRef = useRef<NextJSIntegration | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === "undefined") {
      return;
    }

    const config: SwingConfig = {
      apiKey,
      endpoint,
      options,
    };

    // Create recorder instance
    recorderRef.current = new SwingRecorder(config);

    // Create Next.js integration
    integrationRef.current = new NextJSIntegration(recorderRef.current);

    // Start recording
    recorderRef.current.start();
    setIsRecording(true);
    setSessionId(recorderRef.current.getSessionId());

    // Setup route tracking
    integrationRef.current.setupRouteTracking();

    // Cleanup function
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop();
        setIsRecording(false);
      }
      if (integrationRef.current) {
        integrationRef.current.cleanup();
      }
    };
  }, [apiKey, endpoint, options]);

  // Update session ID when it changes
  useEffect(() => {
    if (recorderRef.current) {
      const currentSessionId = recorderRef.current.getSessionId();
      if (currentSessionId !== sessionId) {
        setSessionId(currentSessionId);
      }
    }
  }, [sessionId]);

  const contextValue: SwingContextValue = {
    recorder: recorderRef.current,
    sessionId,
    isRecording,
  };

  return (
    <SwingContext.Provider value={contextValue}>
      {children}
    </SwingContext.Provider>
  );
};

export const useSwing = (): SwingContextValue => {
  const context = useContext(SwingContext);
  if (!context) {
    throw new Error("useSwing must be used within a SwingProvider");
  }
  return context;
};

export const useSwingRecorder = (): SwingRecorder | null => {
  const { recorder } = useSwing();
  return recorder;
};

export const useSwingSession = (): {
  sessionId: string | null;
  isRecording: boolean;
} => {
  const { sessionId, isRecording } = useSwing();
  return { sessionId, isRecording };
};
