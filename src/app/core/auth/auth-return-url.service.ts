import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

const AUTH_RETURN_URL_KEY = 'booking.auth.returnUrl';

@Injectable({ providedIn: 'root' })
export class AuthReturnUrlService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  setReturnUrl(url: string | null): void {
    if (!this.isBrowser) {
      return;
    }

    const normalizedUrl = this.normalize(url);

    if (!normalizedUrl) {
      sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
      return;
    }

    sessionStorage.setItem(AUTH_RETURN_URL_KEY, normalizedUrl);
  }

  consumeReturnUrl(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    const returnUrl = this.normalize(sessionStorage.getItem(AUTH_RETURN_URL_KEY));
    sessionStorage.removeItem(AUTH_RETURN_URL_KEY);

    return returnUrl;
  }

  normalizeReturnUrl(url: string | null): string | null {
    return this.normalize(url);
  }

  private normalize(url: string | null): string | null {
    const normalizedUrl = url?.trim() ?? '';
    const convitePrefix = '/convite/';

    if (!normalizedUrl) {
      return null;
    }

    if (!normalizedUrl.startsWith(convitePrefix)) {
      return null;
    }

    if (
      normalizedUrl.includes('%') ||
      normalizedUrl.includes('\\') ||
      normalizedUrl.includes('//') ||
      normalizedUrl.includes('?') ||
      normalizedUrl.includes('#') ||
      /^[a-z][a-z0-9+.-]*:/i.test(normalizedUrl) ||
      /\/[a-z][a-z0-9+.-]*:/i.test(normalizedUrl)
    ) {
      return null;
    }

    const token = normalizedUrl.slice(convitePrefix.length);

    if (!/^[A-Za-z0-9._~-]{1,512}$/.test(token)) {
      return null;
    }

    return normalizedUrl;
  }
}
