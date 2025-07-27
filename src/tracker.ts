import { record } from "rrweb";
import { SwingAPI } from "./api";
import { SwingSessionManager } from "./session-manager";
import { SwingUserManager } from "./user-manager";
import { SwingRedactionManager } from "./redaction-manager";
import { NextJSIntegration } from "./nextjs-integration";
import type {
  SwingOptions,
  SwingEvent,
  SwingCustomEvent,
  CustomEventPayload,
  UserProperties,
} from "./types";

export class SwingTracker {
  private static instance: SwingTracker | null = null;
  private sessionManager: SwingSessionManager;
  private userManager: SwingUserManager;
  private redactionManager: SwingRedactionManager;
  private api: SwingAPI;
  private nextjsIntegration: NextJSIntegration | null = null;
  private sessionId: string;
  private isRecording: boolean = false;
  private eventBuffer: SwingEvent[] = [];
  private uploadTimer: any = null;
  private stopFn: any = null;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  } | null = null;
  private options: SwingOptions;

  private constructor(
    apiKey: string,
    ingestionUrl: string,
    options: SwingOptions = {}
  ) {
    this.options = options;
    this.api = new SwingAPI({ apiKey, ingestionUrl });
    this.sessionManager = new SwingSessionManager(apiKey);
    this.userManager = new SwingUserManager(apiKey, this.api);
    this.redactionManager = new SwingRedactionManager();
    this.sessionId = this.sessionManager.getOrCreateSession();

    // Configure redaction if fields are provided
    if (options.redactFields) {
      this.redactionManager.setRedactedFields(options.redactFields);
    }
  }

  public static init(
    apiKey: string,
    ingestionUrl: string = "https://ingest.swing.co",
    options: SwingOptions = {}
  ): SwingTracker {
    if (typeof window !== "undefined" && SwingTracker.instance) {
      return SwingTracker.instance;
    }

    SwingTracker.instance = new SwingTracker(apiKey, ingestionUrl, options);

    // Make globally available
    if (typeof window !== "undefined") {
      (window as any).SwingTracker = SwingTracker;
      (window as any).__swingGlobalTracker = SwingTracker.instance;
    }

    return SwingTracker.instance;
  }

  public static getInstance(): SwingTracker | null {
    return SwingTracker.instance;
  }

  public async start(): Promise<void> {
    if (this.isRecording || typeof window === "undefined") return;

    try {
      // Initialize session with API
      await this.api.init(this.sessionId, this.userManager.getUserId());

      // Start rrweb recording
      this.startRRWebRecording();

      // Setup all automatic tracking
      if (this.options.enableAutomaticTracking !== false) {
        this.setupAutomaticTracking();
      }

      // Enable console tracking if requested
      if (this.options.enableConsoleTracking) {
        this.enableConsoleTracking();
      }

      // Setup activity tracking
      this.setupActivityTracking();

      // Setup unload handlers
      this.setupUnloadHandlers();

      // Setup Next.js integration
      this.setupNextJSIntegration();

      // Start upload timer
      this.startUploadTimer();

      this.isRecording = true;

      if (this.options.debug) {
        console.log("[Swing] Tracker started for session:", this.sessionId);
      }
    } catch (error) {
      console.error("[Swing] Failed to start tracker:", error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    // Stop rrweb recording
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }

    // Stop upload timer
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }

    // Restore console if needed
    this.restoreConsole();

    // Cleanup Next.js integration
    if (this.nextjsIntegration) {
      this.nextjsIntegration.cleanup();
      this.nextjsIntegration = null;
    }

    // Upload remaining events
    if (this.eventBuffer.length > 0) {
      this.uploadEvents();
    }

    if (this.options.debug) {
      console.log("[Swing] Tracker stopped");
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getUserId(): string | null {
    return this.userManager.getUserId();
  }

  public async addUserInfo(
    userId: string,
    userProperties: UserProperties
  ): Promise<void> {
    await this.userManager.addUserInfo(userId, userProperties, this.sessionId);
  }

  public async authenticateUser(
    userId: string,
    userProperties: UserProperties,
    authFields?: string[]
  ): Promise<void> {
    await this.userManager.authenticateUser(
      userId,
      userProperties,
      this.sessionId,
      authFields
    );
  }

  public setRedactedFields(fields: string[]): void {
    this.redactionManager.setRedactedFields(fields);
  }

  public async sendCustomEvent(
    eventName: string,
    eventProperties?: Record<string, any>
  ): Promise<void> {
    await this.api.sendCustomEvent(this.sessionId, eventName, eventProperties);
  }

  private startRRWebRecording(): void {
    const recordOptions = this.options.recordOptions || {};

    this.stopFn = (record as any)({
      emit: (event: any, isCheckout?: boolean) => {
        this.handleEvent(event, isCheckout);
      },
      checkoutEveryNth: recordOptions.checkoutEveryNth,
      checkoutEveryNms: recordOptions.checkoutEveryNms || 10 * 1000,
      blockClass: recordOptions.blockClass || "swing-block",
      blockSelector: recordOptions.blockSelector,
      ignoreClass: recordOptions.ignoreClass || "swing-ignore",
      maskTextClass: recordOptions.maskTextClass || "swing-mask",
      maskTextSelector: recordOptions.maskTextSelector,
      maskInputOptions: recordOptions.maskInputOptions || {
        password: true,
      },
      slimDOMOptions: recordOptions.slimDOMOptions || "all",
      sampling: {
        mousemove: this.options.sampling?.mousemove ?? 0.1,
        mouseInteraction: this.options.sampling?.mouseInteraction ?? 1,
        scroll: this.options.sampling?.scroll ?? 0.1,
        media: this.options.sampling?.media ?? 1,
        input: this.options.sampling?.input ?? 1,
      },
      inlineStylesheet: recordOptions.inlineStylesheet !== false,
      hooks: recordOptions.hooks,
      packFn: recordOptions.packFn,
      plugins: recordOptions.plugins || [],
    });
  }

  private setupAutomaticTracking(): void {
    const trackingOptions = this.options.automaticTrackingOptions || {};

    if (trackingOptions.trackButtons !== false) {
      this.setupAutomaticButtonTracking();
    }

    if (trackingOptions.trackLinks !== false) {
      this.setupAutomaticLinkTracking();
    }

    if (trackingOptions.trackForms !== false) {
      this.setupAutomaticFormTracking();
    }
  }

  private setupAutomaticButtonTracking(): void {
    document.addEventListener("click", async (event) => {
      const target = event.target as HTMLElement;

      if (target.tagName === "BUTTON" || target.closest("button")) {
        const button =
          target.tagName === "BUTTON"
            ? (target as HTMLButtonElement)
            : (target.closest("button") as HTMLButtonElement);

        await this.addCustomEvent({
          type: 5,
          data: {
            payload: {
              eventType: "button_clicked",
              buttonId: button.id || null,
              buttonType: button.type || "button",
              buttonText:
                this.options.automaticTrackingOptions?.includeText !== false
                  ? button.textContent?.trim() || null
                  : null,
              buttonClass:
                this.options.automaticTrackingOptions?.includeClasses !== false
                  ? button.className || null
                  : null,
              page: window.location.pathname,
              timestamp: Date.now(),
            },
          },
          timestamp: Date.now(),
        });
      }
    });
  }

  private setupAutomaticLinkTracking(): void {
    document.addEventListener("click", async (event) => {
      const target = event.target as HTMLElement;

      if (target.tagName === "A" || target.closest("a")) {
        const link =
          target.tagName === "A"
            ? (target as HTMLAnchorElement)
            : (target.closest("a") as HTMLAnchorElement);

        await this.addCustomEvent({
          type: 5,
          data: {
            payload: {
              eventType: "link_clicked",
              linkUrl: link.href || null,
              linkId: link.id || null,
              linkTarget: link.target || null,
              linkText:
                this.options.automaticTrackingOptions?.includeText !== false
                  ? link.textContent?.trim() || null
                  : null,
              linkClass:
                this.options.automaticTrackingOptions?.includeClasses !== false
                  ? link.className || null
                  : null,
              page: window.location.pathname,
              timestamp: Date.now(),
            },
          },
          timestamp: Date.now(),
        });
      }
    });
  }

  private setupAutomaticFormTracking(): void {
    document.addEventListener("submit", async (event) => {
      const form = event.target as HTMLFormElement;
      const formData = new FormData(form);

      await this.addCustomEvent({
        type: 5,
        data: {
          payload: {
            eventType: "form_submitted",
            formId: form.id || null,
            formAction: form.action || null,
            formMethod: form.method || "get",
            fields: Array.from(formData.keys()),
            formClass:
              this.options.automaticTrackingOptions?.includeClasses !== false
                ? form.className || null
                : null,
            page: window.location.pathname,
            timestamp: Date.now(),
          },
        },
        timestamp: Date.now(),
      });
    });
  }

  public enableConsoleTracking(): void {
    if (this.originalConsole) return; // Already enabled

    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    console.log = (...args) => {
      this.trackConsoleEvent("log", args);
      this.originalConsole!.log(...args);
    };

    console.warn = (...args) => {
      this.trackConsoleEvent("warn", args);
      this.originalConsole!.warn(...args);
    };

    console.error = (...args) => {
      this.trackConsoleEvent("error", args);
      this.originalConsole!.error(...args);
    };
  }

  private trackConsoleEvent(
    level: "log" | "warn" | "error",
    args: any[]
  ): void {
    this.addCustomEvent({
      type: 5,
      data: {
        payload: {
          eventType: "console",
          level: level,
          message: args
            .map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            )
            .join(" "),
          timestamp: new Date().toISOString(),
          url: window.location.href,
        },
      },
      timestamp: Date.now(),
    });
  }

  private trackNavigationEvent(
    type: string,
    fromUrl: string,
    toUrl: string
  ): void {
    this.addCustomEvent({
      type: 5,
      data: {
        payload: {
          eventType: "navigation",
          type: type,
          from: fromUrl,
          to: toUrl,
          timestamp: new Date().toISOString(),
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          referrer: document.referrer,
        },
      },
      timestamp: Date.now(),
    });
  }

  private setupActivityTracking(): void {
    const updateActivity = () => {
      this.sessionManager.updateActivity();
    };

    window.addEventListener("click", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("scroll", updateActivity);
    window.addEventListener("mousemove", updateActivity);
  }

  private setupNextJSIntegration(): void {
    this.nextjsIntegration = new NextJSIntegration(this as any);
    this.nextjsIntegration.setupRouteTracking();
  }

  private setupUnloadHandlers(): void {
    const handleUnload = () => {
      if (this.eventBuffer.length > 0) {
        this.uploadEventsWithBeacon();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        handleUnload();
      }
    });
  }

  private startUploadTimer(): void {
    const flushInterval = this.options.upload?.flushInterval || 5000; // 5 seconds
    this.uploadTimer = setInterval(() => {
      if (this.eventBuffer.length > 0) {
        this.uploadEvents();
      }
    }, flushInterval);
  }

  private handleEvent(event: any, isCheckout?: boolean): void {
    const swingEvent: SwingEvent = {
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
      delay: event.delay,
    };

    // Process through redaction manager
    const processedEvent = this.redactionManager.processEvent(swingEvent);
    this.eventBuffer.push(processedEvent);

    const maxBatchSize = this.options.upload?.maxBatchSize || 50;
    if (this.eventBuffer.length >= maxBatchSize) {
      this.uploadEvents();
    }

    if (this.options.debug) {
      console.log("[Swing] Event recorded:", processedEvent.type);
    }
  }

  private async addCustomEvent(customEvent: SwingCustomEvent): Promise<void> {
    this.eventBuffer.push(customEvent);

    if (this.options.debug) {
      console.log(
        "[Swing] Custom event added:",
        customEvent.data.payload.eventType
      );
    }
  }

  private async uploadEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToUpload = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const userId = this.userManager.getUserId();
      await this.api.sendEventsChunked(
        eventsToUpload,
        this.sessionId,
        userId || undefined
      );

      if (this.options.debug) {
        console.log("[Swing] Uploaded", eventsToUpload.length, "events");
      }
    } catch (error) {
      // Re-add events back to buffer if upload failed
      this.eventBuffer.unshift(...eventsToUpload);

      if (this.options.debug) {
        console.error("[Swing] Upload failed:", error);
      }
    }
  }

  private uploadEventsWithBeacon(): void {
    if (this.eventBuffer.length === 0) return;

    const success = this.api.sendBeaconEvents(this.eventBuffer, this.sessionId);

    if (this.options.debug) {
      console.log("[Swing] Beacon upload:", success ? "success" : "failed");
    }
  }

  private restoreConsole(): void {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      this.originalConsole = null;
    }
  }
}

// Export for window global access
if (typeof window !== "undefined") {
  (window as any).SwingTracker = SwingTracker;
}
