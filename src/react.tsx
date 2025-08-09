import React, { createContext, useContext, useEffect, ReactNode } from 'react';

// User management interface
interface SwingUser {
  id: string;
  email?: string;
  name?: string;
  properties?: Record<string, any>;
}

interface SwingSDKContextType {
  apiKey: string;
  isInitialized: boolean;
  setUser: (user: SwingUser) => void;
  identifyUser: (userId: string, properties?: Record<string, any>) => void;
  clearUser: () => void;
  sendCustomEvent: (name: string, properties?: Record<string, any>) => void;
  setRedactedFields: (selectors: string[]) => void;
  getRedactedFields: () => string[];
}

const SwingSDKContext = createContext<SwingSDKContextType | null>(null);

interface SwingSDKProviderProps {
  apiKey: string;
  children: ReactNode;
  options?: {
    userId?: string;
    sessionId?: string;
    redactFields?: string[]; // CSS selectors for redaction
  };
}

export function SwingProvider({ 
  apiKey, 
  children, 
  options = {} 
}: SwingSDKProviderProps) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  // User management methods
  const setUser = (user: SwingUser) => {
    if (typeof window !== 'undefined' && window.swingSDK) {
      window.swingSDK.setUser(user);
    }
  };

  const identifyUser = (userId: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.swingSDK) {
      window.swingSDK.identifyUser(userId, properties);
    }
  };

  const clearUser = () => {
    if (typeof window !== 'undefined' && window.swingSDK) {
      window.swingSDK.clearUser();
    }
  };

  const sendCustomEvent = (name: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.swingSDK) {
      window.swingSDK.sendCustomEvent(name, properties);
    }
  };

  const setRedactedFields = (selectors: string[]) => {
    if (typeof window !== 'undefined' && window.swingSDK) {
      window.swingSDK.setRedactedFields(selectors);
    }
  };

  const getRedactedFields = (): string[] => {
    if (typeof window !== 'undefined' && window.swingSDK) {
      return window.swingSDK.getRedactedFields();
    }
    return [];
  };

  useEffect(() => {
    // Initialize SwingSDK when component mounts
    if (typeof window !== 'undefined' && (window as any).SwingSDK) {
      console.log('SwingProvider: Initializing SwingSDK with apiKey:', apiKey);
      
      // Pass options object with apiKey
      const stopSwingSDK = (window as any).SwingSDK({
        apiKey,
        ...options
      });
      
      setIsInitialized(true);
      console.log('SwingProvider: SwingSDK initialized successfully');
      
      // Store the stop function for cleanup
      (window as any).stopSwingSDK = stopSwingSDK;
    } else {
      console.error('SwingProvider: SwingSDK not available on window');
    }
  }, [apiKey, options]);

  return (
    <SwingSDKContext.Provider value={{ 
      apiKey, 
      isInitialized, 
      setUser, 
      identifyUser, 
      clearUser, 
      sendCustomEvent,
      setRedactedFields,
      getRedactedFields
    }}>
      {children}
    </SwingSDKContext.Provider>
  );
}

export function useSwingSDK() {
  const context = useContext(SwingSDKContext);
  if (!context) {
    throw new Error('useSwingSDK must be used within a SwingProvider');
  }
  return context;
}
