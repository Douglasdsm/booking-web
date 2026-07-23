import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

const PERMANENT_TOKEN_KEY = 'booking.user.accessToken';

@Injectable({ providedIn: 'root' })
export class PermanentTokenService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly tokenSignal = signal<string | null>(this.readStoredToken());

  readonly token = this.tokenSignal.asReadonly();
  readonly hasSession = computed(() => !!this.tokenSignal());

  setToken(token: string | null): void {
    const normalizedToken = this.normalizeToken(token);

    this.tokenSignal.set(normalizedToken);

    if (!this.isBrowser) {
      return;
    }

    if (normalizedToken) {
      localStorage.setItem(PERMANENT_TOKEN_KEY, normalizedToken);
      return;
    }

    localStorage.removeItem(PERMANENT_TOKEN_KEY);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  removeToken(): void {
    this.setToken(null);
  }

  private readStoredToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    return this.normalizeToken(localStorage.getItem(PERMANENT_TOKEN_KEY));
  }

  private normalizeToken(token: string | null): string | null {
    const normalizedToken = token?.trim().replace(/^Bearer\s+/i, '') ?? null;

    return normalizedToken || null;
  }
}
