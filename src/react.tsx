import React, { createContext, useContext, useEffect, ReactNode } from 'react';

interface SwingSDKContextType {
  apiKey: string;
  isInitialized: boolean;
}

const SwingSDKContext = createContext<SwingSDKContextType | null>(null);

interface SwingSDKProviderProps {
  apiKey: string;
  children: ReactNode;
  options?: {
    uploadUrl?: string;
    bufferSeconds?: number;
  };
}

export function SwingProvider({ 
  apiKey, 
  children, 
  options = {} 
}: SwingSDKProviderProps) {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    // Initialize SwingSDK when component mounts
    if (typeof window !== 'undefined' && (window as any).SwingSDK) {
      (window as any).SwingSDK(apiKey);
      setIsInitialized(true);
    }
  }, [apiKey]);

  return (
    <SwingSDKContext.Provider value={{ apiKey, isInitialized }}>
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
