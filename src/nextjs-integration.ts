import type { SwingRecorder } from "./recorder";

export class NextJSIntegration {
  private recorder: SwingRecorder;
  private router: any = null;
  private isListening = false;

  constructor(recorder: SwingRecorder) {
    this.recorder = recorder;
  }

  public setupRouteTracking(): void {
    if (typeof window === "undefined" || this.isListening) {
      return;
    }

    // Dynamic import for Next.js router to avoid SSR issues
    this.importRouter()
      .then(() => {
        this.startListening();
      })
      .catch(() => {
        // Fallback to manual route tracking if Next.js router is not available
        this.setupManualRouteTracking();
      });
  }

  public cleanup(): void {
    if (this.router && this.isListening) {
      this.router.events.off("routeChangeComplete", this.handleRouteChange);
      this.router.events.off("hashChangeComplete", this.handleRouteChange);
    }
    this.isListening = false;
  }

  private async importRouter(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    try {
      // Try to import Next.js router
      const { useRouter } = await import("next/router");
      const { usePathname } = await import("next/navigation");

      // For App Router (Next.js 13+)
      if (typeof usePathname === "function") {
        this.setupAppRouterTracking();
      } else if (typeof useRouter === "function") {
        // For Pages Router
        this.setupPagesRouterTracking();
      }
    } catch (error) {
      throw new Error("Next.js router not found");
    }
  }

  private setupAppRouterTracking(): void {
    // For App Router, we'll listen to popstate and manual navigation
    let currentPath = window.location.pathname;

    const checkForRouteChange = () => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        this.handleRouteChange(currentPath);
      }
    };

    // Listen for browser back/forward
    window.addEventListener("popstate", checkForRouteChange);

    // Listen for programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      setTimeout(checkForRouteChange, 0);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkForRouteChange, 0);
    };

    this.isListening = true;
  }

  private setupPagesRouterTracking(): void {
    try {
      // This will only work if we're in a component context
      // For now, we'll use a different approach
      this.setupManualRouteTracking();
    } catch (error) {
      this.setupManualRouteTracking();
    }
  }

  private setupManualRouteTracking(): void {
    let currentPath =
      window.location.pathname + window.location.search + window.location.hash;

    const checkForRouteChange = () => {
      const newPath =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      if (newPath !== currentPath) {
        currentPath = newPath;
        this.handleRouteChange(newPath);
      }
    };

    // Listen for browser navigation
    window.addEventListener("popstate", checkForRouteChange);

    // Override history methods to catch programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (state, title, url) {
      originalPushState.call(history, state, title, url);
      setTimeout(checkForRouteChange, 0);
    };

    history.replaceState = function (state, title, url) {
      originalReplaceState.call(history, state, title, url);
      setTimeout(checkForRouteChange, 0);
    };

    this.isListening = true;
  }

  private startListening(): void {
    if (!this.router || this.isListening) {
      return;
    }

    this.router.events.on("routeChangeComplete", this.handleRouteChange);
    this.router.events.on("hashChangeComplete", this.handleRouteChange);
    this.isListening = true;
  }

  private handleRouteChange = (url: string): void => {
    // Create a custom event for route changes that rrweb can capture
    if (typeof window !== "undefined") {
      const event = new CustomEvent("swing-route-change", {
        detail: {
          url,
          timestamp: Date.now(),
          referrer: document.referrer,
        },
      });
      window.dispatchEvent(event);
    }
  };
}
