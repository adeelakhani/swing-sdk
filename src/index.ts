// Core classes and types
export { SwingRecorder } from "./recorder";
export { NextJSIntegration } from "./nextjs-integration";
export type {
  SwingConfig,
  SwingOptions,
  SwingEvent,
  SwingSession,
} from "./types";

// Version info
export const version = "1.0.0";

// Utility functions
import type { SwingConfig } from "./types";
import { SwingRecorder } from "./recorder";

export const createSwingRecorder = (config: SwingConfig): SwingRecorder => {
  return new SwingRecorder(config);
};

// Re-export the types for convenience
export type { SwingConfig as Config } from "./types";
export type { SwingOptions as Options } from "./types";
