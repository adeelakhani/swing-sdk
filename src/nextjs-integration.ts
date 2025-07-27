import type { SwingRecorder } from "./recorder";

export class NextJSIntegration {
  private tracker: any; // Will be SwingTracker but avoid circular import
  private router: any = null;
  private isListening = false;
  private currentPath: string = "";

  constructor(tracker: any) {
    this.tracker = tracker;
    this.currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
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
    const checkForRouteChange = () => {
      const newPath = window.location.pathname;
      if (newPath !== this.currentPath) {
        const oldPath = this.currentPath;
        this.currentPath = newPath;
        this.handleRouteChange(newPath, oldPath, "pushState");
      }
    };

    // Listen for browser back/forward
    window.addEventListener("popstate", () => {
      setTimeout(() => {
        const newPath = window.location.pathname;
        const oldPath = this.currentPath;
        this.currentPath = newPath;
        this.handleRouteChange(newPath, oldPath, "popstate");
      }, 0);
    });

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

    // Listen for hash changes
    window.addEventListener("hashchange", () => {
      const newPath = window.location.pathname + window.location.hash;
      const oldPath = this.currentPath;
      this.currentPath = newPath;
      this.handleRouteChange(newPath, oldPath, "hashchange");
    });

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
    const getCurrentPath = () =>
      window.location.pathname + window.location.search + window.location.hash;

    this.currentPath = getCurrentPath();

    const checkForRouteChange = () => {
      const newPath = getCurrentPath();
      if (newPath !== this.currentPath) {
        const oldPath = this.currentPath;
        this.currentPath = newPath;
        this.handleRouteChange(newPath, oldPath, "navigation");
      }
    };

    // Listen for browser navigation
    window.addEventListener("popstate", () => {
      setTimeout(() => {
        const newPath = getCurrentPath();
        const oldPath = this.currentPath;
        this.currentPath = newPath;
        this.handleRouteChange(newPath, oldPath, "popstate");
      }, 0);
    });

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

    // Listen for hash changes
    window.addEventListener("hashchange", () => {
      const newPath = getCurrentPath();
      const oldPath = this.currentPath;
      this.currentPath = newPath;
      this.handleRouteChange(newPath, oldPath, "hashchange");
    });

    this.isListening = true;
  }

  private startListening(): void {
    if (!this.router || this.isListening) {
      return;
    }

    this.router.events.on("routeChangeComplete", (url: string) => {
      this.handleRouteChange(url, this.currentPath, "routeChangeComplete");
      this.currentPath = url;
    });
    this.router.events.on("hashChangeComplete", (url: string) => {
      this.handleRouteChange(url, this.currentPath, "hashChangeComplete");
      this.currentPath = url;
    });
    this.isListening = true;
  }

  private handleRouteChange = (
    newUrl: string,
    oldUrl: string = "",
    navigationType: string = "navigation"
  ): void => {
    // Create a custom event for route changes that rrweb can capture
    if (typeof window !== "undefined") {
      const event = new CustomEvent("swing-route-change", {
        detail: {
          url: newUrl,
          timestamp: Date.now(),
          referrer: document.referrer,
          from: oldUrl,
          to: newUrl,
          type: navigationType,
        },
      });
      window.dispatchEvent(event);

      // Also track via the tracker's navigation tracking if available
      if (
        this.tracker &&
        typeof this.tracker.trackNavigationEvent === "function"
      ) {
        this.tracker.trackNavigationEvent(navigationType, oldUrl, newUrl);
      }
    }
  };
}
