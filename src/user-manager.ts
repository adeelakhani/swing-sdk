import type { SwingAPI } from "./api";
import type { UserProperties } from "./types";

export class SwingUserManager {
  private apiKey: string;
  private api: SwingAPI;
  private userProperties: UserProperties = {};
  private endUserId: string | null = null;

  constructor(apiKey: string, api: SwingAPI) {
    this.apiKey = apiKey;
    this.api = api;
    this.initializeUser();
  }

  private initializeUser(): void {
    // Get or create user ID
    this.endUserId =
      this.getCookie(`swing_end_user_id_${this.apiKey}`) ||
      this.generateUserId();
    this.setCookie(`swing_end_user_id_${this.apiKey}`, this.endUserId, 365);
  }

  public async addUserInfo(
    userId: string,
    userProperties: UserProperties,
    sessionId: string
  ): Promise<void> {
    this.userProperties = userProperties;
    await this.api.sendUserData(userId, userProperties, sessionId);

    // Update user ID if provided
    if (userId) {
      this.endUserId = userId;
      this.setCookie(`swing_end_user_id_${this.apiKey}`, userId, 365);
    }
  }

  public async authenticateUser(
    userId: string,
    userProperties: UserProperties,
    sessionId: string,
    authFields: string[] = ["id"]
  ): Promise<void> {
    this.userProperties = { ...this.userProperties, ...userProperties };
    await this.api.sendUserAuth(userId, userProperties, sessionId, authFields);

    // Update user ID
    this.endUserId = userId;
    this.setCookie(`swing_end_user_id_${this.apiKey}`, userId, 365);
  }

  public isPreexistingUser(): boolean {
    const existingUserId = this.getCookie(`swing_end_user_id_${this.apiKey}`);
    return existingUserId !== null && existingUserId !== this.endUserId;
  }

  public getUserId(): string | null {
    return this.endUserId;
  }

  public getUserProperties(): UserProperties {
    return { ...this.userProperties };
  }

  public clearUser(): void {
    this.deleteCookie(`swing_end_user_id_${this.apiKey}`);
    this.userProperties = {};
    this.endUserId = null;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}
