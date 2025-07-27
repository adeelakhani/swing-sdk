import type { SwingEvent, APIInitResponse, UserProperties } from "./types";

export class SwingAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor({
    apiKey,
    ingestionUrl,
  }: {
    apiKey: string;
    ingestionUrl: string;
  }) {
    this.apiKey = apiKey;
    this.baseUrl = ingestionUrl;
  }

  // Session initialization
  public async init(
    sessionId: string,
    userId: string | null
  ): Promise<APIInitResponse> {
    const response = await fetch(`${this.baseUrl}/api/ingestion/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        Referer: document.referrer || "",
      },
      body: JSON.stringify({
        sessionId: sessionId,
        endUserId: userId,
        entryURL: window.location.href,
        referrer: document.referrer,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize ingestion: ${response.statusText}`);
    }

    return await response.json();
  }

  // Chunked events upload
  async sendEventsChunked(
    events: SwingEvent[],
    sessionId: string,
    userId?: string
  ): Promise<any[]> {
    const MAX_CHUNK_SIZE_BYTES = 1024 * 1024; // 1MB
    const results = [];
    let currentChunk: SwingEvent[] = [];

    for (const event of events) {
      const nextChunkSize = new TextEncoder().encode(
        JSON.stringify({
          sessionId,
          events: [...currentChunk, event],
        })
      ).length;

      if (nextChunkSize > MAX_CHUNK_SIZE_BYTES && currentChunk.length > 0) {
        // Send current chunk
        const response = await fetch(`${this.baseUrl}/api/ingestion/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            sessionId,
            events: currentChunk,
            endUserId: userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send events: ${response.statusText}`);
        }

        results.push(await response.json());
        currentChunk = [event];
      } else {
        currentChunk.push(event);
      }
    }

    // Send remaining events
    if (currentChunk.length > 0) {
      const response = await fetch(`${this.baseUrl}/api/ingestion/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          sessionId,
          events: currentChunk,
          endUserId: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send events: ${response.statusText}`);
      }

      results.push(await response.json());
    }

    return results.flat();
  }

  // Navigator.sendBeacon fallback
  public sendBeaconEvents(events: SwingEvent[], sessionId: string): boolean {
    const payload = {
      sessionId: sessionId,
      events: events,
      endUserId: null,
      apiKey: this.apiKey,
    };

    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });

    return navigator.sendBeacon(`${this.baseUrl}/api/ingestion/events`, blob);
  }

  // User data endpoints
  async sendUserData(
    userId: string,
    userData: UserProperties,
    sessionId: string
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/ingestion/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        userId: userId,
        userAttributes: userData,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send user data: ${response.statusText}`);
    }

    return await response.json();
  }

  // User authentication endpoint
  async sendUserAuth(
    userId: string,
    userData: UserProperties,
    sessionId: string,
    authFields: string[]
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/ingestion/user/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        userId: userId,
        userAttributes: userData,
        sessionId: sessionId,
        authFields: authFields,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send user auth: ${response.statusText}`);
    }

    return await response.json();
  }

  // Custom events API
  async sendCustomEvent(
    sessionId: string,
    eventName: string,
    eventProperties?: Record<string, any>
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/ingestion/customEvent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        sessionId: sessionId,
        eventName: eventName,
        eventProperties: eventProperties || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send custom event: ${response.statusText}`);
    }

    return await response.json();
  }

  // Batch custom events API
  async sendCustomEventsBatch(
    sessionId: string,
    events: { eventName: string; eventProperties?: Record<string, any> }[]
  ): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/ingestion/customEvent/batch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          sessionId: sessionId,
          events: events,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to send custom events batch: ${response.statusText}`
      );
    }

    return await response.json();
  }
}
