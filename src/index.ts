// Main tracker class (new global singleton)
export { SwingTracker } from "./tracker";

// Core classes and managers
export { SwingAPI } from "./api";
export { SwingSessionManager } from "./session-manager";
export { SwingUserManager } from "./user-manager";
export { SwingRedactionManager } from "./redaction-manager";

// Legacy recorder class (for backward compatibility)
export { SwingRecorder } from "./recorder";
export { NextJSIntegration } from "./nextjs-integration";

// Type exports
export type {
  SwingConfig,
  SwingOptions,
  SwingEvent,
  SwingSession,
  SwingCustomEvent,
  CustomEventPayload,
  APIInitResponse,
  UserProperties,
} from "./types";

// Version info
export const version = "2.0.0";

// Utility functions for backward compatibility
import type { SwingConfig } from "./types";
import { SwingRecorder } from "./recorder";

export const createSwingRecorder = (config: SwingConfig): SwingRecorder => {
  return new SwingRecorder(config);
};

// New utility functions for the tracker
import { SwingTracker } from "./tracker";
import type { SwingOptions } from "./types";

export const createSwingTracker = (
  apiKey: string,
  ingestionUrl?: string,
  options?: SwingOptions
): SwingTracker => {
  return SwingTracker.init(
    apiKey,
    ingestionUrl || "https://ingest.swing.co",
    options
  );
};

// Initialize function for easy setup
export const initSwing = (
  apiKey: string,
  ingestionUrl?: string,
  options?: SwingOptions
): SwingTracker => {
  const tracker = SwingTracker.init(
    apiKey,
    ingestionUrl || "https://ingest.swing.co",
    options
  );

  // Auto-start if in browser environment
  if (typeof window !== "undefined") {
    tracker.start().catch((error) => {
      console.error("[Swing] Failed to auto-start tracker:", error);
    });
  }

  return tracker;
};

// Re-export the types for convenience (backward compatibility)
export type { SwingConfig as Config } from "./types";
export type { SwingOptions as Options } from "./types";

// Global access helper
export const getSwingTracker = (): SwingTracker | null => {
  return SwingTracker.getInstance();
};
