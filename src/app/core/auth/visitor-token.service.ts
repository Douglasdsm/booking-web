import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const VISITOR_TOKEN_KEY = 'booking.visitor.accessToken';

@Injectable({ providedIn: 'root' })
export class VisitorTokenService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());

  readonly token = this.tokenSignal.asReadonly();

  setToken(token: string | null): void {
    const normalizedToken = this.normalizeToken(token);

    this.tokenSignal.set(normalizedToken);

    if (!this.isBrowser) {
      return;
    }

    if (normalizedToken) {
      localStorage.setItem(VISITOR_TOKEN_KEY, normalizedToken);
      return;
    }

    localStorage.removeItem(VISITOR_TOKEN_KEY);
  }

  private readStoredToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    return this.normalizeToken(localStorage.getItem(VISITOR_TOKEN_KEY));
  }

  private normalizeToken(token: string | null): string | null {
    const normalizedToken = token?.trim().replace(/^Bearer\s+/i, '') ?? null;

    return normalizedToken || null;
  }
}
