export class SwingSessionManager {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public getOrCreateSession(): string {
    // Check for existing session
    const existingSessionId = this.getCookie(`swing_session_${this.apiKey}`);
    const lastActivity = localStorage.getItem("swing_last_activity");

    // Check if session is still valid (30 minutes)
    if (existingSessionId && this.isSessionValid(lastActivity)) {
      return existingSessionId;
    }

    // Create new session
    const newSessionId = this.generateSessionId();
    this.setCookie(`swing_session_${this.apiKey}`, newSessionId, 1); // 1 day expiry
    return newSessionId;
  }

  public clearSession(): void {
    this.deleteCookie(`swing_session_${this.apiKey}`);
    localStorage.removeItem("swing_last_activity");
  }

  public updateActivity(): void {
    localStorage.setItem("swing_last_activity", Date.now().toString());
  }

  private isSessionValid(lastActivity: string | null): boolean {
    if (!lastActivity) return false;

    const lastActivityTime = parseInt(lastActivity);
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    return lastActivityTime > thirtyMinutesAgo;
  }

  private setCookie(name: string, value: string, days: number): void {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;

    // Set cookie
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;

    // Backup in localStorage
    localStorage.setItem(name, value);
  }

  private getCookie(name: string): string | null {
    // Try cookie first
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }

    // Fallback to localStorage
    return localStorage.getItem(name);
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    localStorage.removeItem(name);
  }

  private generateSessionId(): string {
    return `swing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
