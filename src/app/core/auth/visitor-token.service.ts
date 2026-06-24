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
    this.tokenSignal.set(token);

    if (!this.isBrowser) {
      return;
    }

    if (token) {
      localStorage.setItem(VISITOR_TOKEN_KEY, token);
      return;
    }

    localStorage.removeItem(VISITOR_TOKEN_KEY);
  }

  private readStoredToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    return localStorage.getItem(VISITOR_TOKEN_KEY);
  }
}
