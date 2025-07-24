import { record } from "rrweb";
import type {
  SwingConfig,
  SwingOptions,
  SwingEvent,
  SwingSession,
} from "./types";

export class SwingRecorder {
  private config: SwingConfig;
  private session: SwingSession | null = null;
  private stopFn: any = null;
  private eventBuffer: SwingEvent[] = [];
  private uploadTimer: any = null;
  private isRecording = false;

  constructor(config: SwingConfig) {
    this.config = config;
    this.setupUnloadHandler();
  }

  public start(): void {
    if (this.isRecording || typeof window === "undefined") {
      return;
    }

    this.session = this.createSession();
    this.isRecording = true;

    const options = this.config.options || {};

    this.stopFn = (record as any)({
      emit: (event: any, isCheckout?: boolean) => {
        this.handleEvent(event, isCheckout);
      },
      checkoutEveryNth: options.recordOptions?.checkoutEveryNth,
      checkoutEveryNms: options.recordOptions?.checkoutEveryNms || 10 * 1000, // 10 seconds
      blockClass: options.recordOptions?.blockClass || "swing-block",
      blockSelector: options.recordOptions?.blockSelector,
      ignoreClass: options.recordOptions?.ignoreClass || "swing-ignore",
      maskTextClass: options.recordOptions?.maskTextClass || "swing-mask",
      maskTextSelector: options.recordOptions?.maskTextSelector,
      maskInputOptions: options.recordOptions?.maskInputOptions || {
        password: true,
      },
      slimDOMOptions: options.recordOptions?.slimDOMOptions || "all",
      sampling: {
        mousemove:
          options.sampling?.mousemove !== undefined
            ? options.sampling.mousemove
            : 0.1,
        mouseInteraction:
          options.sampling?.mouseInteraction !== undefined
            ? options.sampling.mouseInteraction
            : 1,
        scroll:
          options.sampling?.scroll !== undefined
            ? options.sampling.scroll
            : 0.1,
        media:
          options.sampling?.media !== undefined ? options.sampling.media : 1,
        input:
          options.sampling?.input !== undefined ? options.sampling.input : 1,
      },
      inlineStylesheet: options.recordOptions?.inlineStylesheet !== false,
      hooks: options.recordOptions?.hooks,
      packFn: options.recordOptions?.packFn,
      plugins: options.recordOptions?.plugins || [],
    });

    this.startUploadTimer();

    if (options.debug) {
      console.log("[Swing] Recording started for session:", this.session.id);
    }
  }

  public stop(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;

    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }

    // Upload remaining events
    if (this.eventBuffer.length > 0) {
      this.uploadEvents();
    }

    if (this.config.options?.debug) {
      console.log("[Swing] Recording stopped");
    }
  }

  public getSessionId(): string | null {
    return this.session?.id || null;
  }

  private createSession(): SwingSession {
    return {
      id: this.generateSessionId(),
      startTime: Date.now(),
      events: [],
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  private generateSessionId(): string {
    return `swing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleEvent(event: any, isCheckout?: boolean): void {
    if (!this.session) {
      return;
    }

    const swingEvent: SwingEvent = {
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
      delay: event.delay,
    };

    this.eventBuffer.push(swingEvent);

    const maxBatchSize = this.config.options?.upload?.maxBatchSize || 50;
    if (this.eventBuffer.length >= maxBatchSize) {
      this.uploadEvents();
    }

    if (this.config.options?.debug) {
      console.log("[Swing] Event recorded:", swingEvent.type);
    }
  }

  private startUploadTimer(): void {
    const flushInterval = this.config.options?.upload?.flushInterval || 5000; // 5 seconds
    this.uploadTimer = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.uploadEvents();
      }
    }, flushInterval);
  }

  private async uploadEvents(): Promise<void> {
    if (!this.session || this.eventBuffer.length === 0) {
      return;
    }

    const eventsToUpload = [...this.eventBuffer];
    this.eventBuffer = [];

    const payload = {
      sessionId: this.session.id,
      apiKey: this.config.apiKey,
      session: {
        ...this.session,
        events: eventsToUpload,
      },
    };

    try {
      // Use sendBeacon if available and we're in unload, otherwise use fetch
      const isUnload = document.visibilityState === "hidden";

      if (isUnload && navigator.sendBeacon) {
        navigator.sendBeacon(this.config.endpoint, JSON.stringify(payload));
      } else {
        await fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          keepalive: isUnload,
        });
      }

      if (this.config.options?.debug) {
        console.log("[Swing] Uploaded", eventsToUpload.length, "events");
      }
    } catch (error) {
      // Re-add events back to buffer if upload failed
      this.eventBuffer.unshift(...eventsToUpload);

      if (this.config.options?.debug) {
        console.error("[Swing] Upload failed:", error);
      }
    }
  }

  private setupUnloadHandler(): void {
    if (typeof window === "undefined") {
      return;
    }

    const handleUnload = () => {
      if (
        this.config.options?.upload?.uploadOnUnload !== false &&
        this.eventBuffer.length > 0
      ) {
        this.uploadEvents();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        handleUnload();
      }
    });
  }
}
