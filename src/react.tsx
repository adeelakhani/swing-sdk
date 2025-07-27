import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { SwingTracker } from "./tracker";
import type { SwingOptions, UserProperties } from "./types";

interface SwingProviderProps {
  apiKey: string;
  ingestionUrl?: string;
  options?: SwingOptions;
  children: ReactNode;
}

interface SwingContextValue {
  tracker: SwingTracker | null;
  sessionId: string | null;
  isRecording: boolean;
  addUserInfo: (
    userId: string,
    userProperties: UserProperties
  ) => Promise<void>;
  authenticateUser: (
    userId: string,
    userProperties: UserProperties,
    authFields?: string[]
  ) => Promise<void>;
  sendCustomEvent: (
    eventName: string,
    eventProperties?: Record<string, any>
  ) => Promise<void>;
  setRedactedFields: (fields: string[]) => void;
}

const SwingContext = createContext<SwingContextValue | null>(null);

export const SwingProvider: React.FC<SwingProviderProps> = ({
  apiKey,
  ingestionUrl = "https://ingest.swing.co",
  options = {},
  children,
}) => {
  const [tracker, setTracker] = useState<SwingTracker | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Use global singleton
    const swingTracker = SwingTracker.init(apiKey, ingestionUrl, options);

    swingTracker
      .start()
      .then(() => {
        setTracker(swingTracker);
        setSessionId(swingTracker.getSessionId());
        setIsRecording(true);
      })
      .catch((error) => {
        console.error("[Swing] Failed to start tracker:", error);
      });

    return () => {
      // Don't stop - let it persist across page changes
      // The global singleton will handle cleanup on page unload
    };
  }, [apiKey, ingestionUrl]);

  // Wrapper functions for easier access
  const addUserInfo = async (
    userId: string,
    userProperties: UserProperties
  ): Promise<void> => {
    if (tracker) {
      await tracker.addUserInfo(userId, userProperties);
    }
  };

  const authenticateUser = async (
    userId: string,
    userProperties: UserProperties,
    authFields?: string[]
  ): Promise<void> => {
    if (tracker) {
      await tracker.authenticateUser(userId, userProperties, authFields);
    }
  };

  const sendCustomEvent = async (
    eventName: string,
    eventProperties?: Record<string, any>
  ): Promise<void> => {
    if (tracker) {
      await tracker.sendCustomEvent(eventName, eventProperties);
    }
  };

  const setRedactedFields = (fields: string[]): void => {
    if (tracker) {
      tracker.setRedactedFields(fields);
    }
  };

  const contextValue: SwingContextValue = {
    tracker,
    sessionId,
    isRecording,
    addUserInfo,
    authenticateUser,
    sendCustomEvent,
    setRedactedFields,
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

export const useSwingTracker = (): SwingTracker | null => {
  const { tracker } = useSwing();
  return tracker;
};

export const useSwingSession = (): {
  sessionId: string | null;
  isRecording: boolean;
} => {
  const { sessionId, isRecording } = useSwing();
  return { sessionId, isRecording };
};

// Additional hooks for user management
export const useSwingUser = (): {
  addUserInfo: (
    userId: string,
    userProperties: UserProperties
  ) => Promise<void>;
  authenticateUser: (
    userId: string,
    userProperties: UserProperties,
    authFields?: string[]
  ) => Promise<void>;
  getUserId: () => string | null;
} => {
  const { tracker, addUserInfo, authenticateUser } = useSwing();

  const getUserId = (): string | null => {
    return tracker ? tracker.getUserId() : null;
  };

  return { addUserInfo, authenticateUser, getUserId };
};

// Hook for custom events
export const useSwingEvents = (): {
  sendCustomEvent: (
    eventName: string,
    eventProperties?: Record<string, any>
  ) => Promise<void>;
} => {
  const { sendCustomEvent } = useSwing();
  return { sendCustomEvent };
};

// Hook for privacy controls
export const useSwingPrivacy = (): {
  setRedactedFields: (fields: string[]) => void;
} => {
  const { setRedactedFields } = useSwing();
  return { setRedactedFields };
};
