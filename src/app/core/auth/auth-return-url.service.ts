import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

const AUTH_RETURN_URL_KEY = 'booking.auth.returnUrl';

/**
 * Internal pages a person may be sent back to after signing in. Anything else (other hosts, protocols, encoded or
 * query-carrying paths) is refused, so the return URL can never become an open redirect. F-COV-24: before, only
 * /convite/ was accepted and a person coming from a protected page landed on the legacy demo page instead.
 */
const RETURN_URL_ALLOWLIST: readonly RegExp[] = [
  /^\/convite\/[A-Za-z0-9._~-]{1,512}$/,
  /^\/(meus-agendamentos|meus-avisos)$/,
  /^\/minha-conta(\/(dados|autorizacoes|agendamentos|marketing))?$/,
  /^\/(reservar|agendar-v2)\/\d{1,18}$/
];

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

    if (!normalizedUrl) {
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

    return RETURN_URL_ALLOWLIST.some((pattern) => pattern.test(normalizedUrl)) ? normalizedUrl : null;
  }
}
