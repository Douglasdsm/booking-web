import { Injectable } from '@angular/core';

/**
 * Phase 37: one opaque key per LOGICAL submission attempt (plan §"IDEMPOTÊNCIA / DOUBLE SUBMIT") — sent
 * as the `Idempotency-Key` header the backend's `SubmitPublicBookingUseCase` already understands (Phase
 * 36). The UI's own disabled-button state is a courtesy, never the real protection — the backend's
 * `PublicVisitorCommandIdempotency` row (scoped on Esus+phone+key) is. `next()` is called once when the
 * visitor starts a NEW intent (a fresh key); the SAME key is reused for every retry of that SAME logical
 * attempt (timeout, transient network failure) until it either succeeds or the visitor changes their
 * input, at which point a new intent — and a new key — begins.
 */
@Injectable({ providedIn: 'root' })
export class IdempotencyKeyService {
  private activeKey: string | null = null;

  /** Starts a brand-new logical attempt — call when the visitor's submittable intent changes
   * (service/slot/name/phone), never on a mere retry of the same attempt. */
  next(): string {
    this.activeKey = this.generate();
    return this.activeKey;
  }

  /** The key for the attempt currently in flight/retryable — generates one if none exists yet. */
  current(): string {
    return this.activeKey ?? this.next();
  }

  clear(): void {
    this.activeKey = null;
  }

  private generate(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    // SSR/older-runtime fallback — still opaque, still unique enough for this purpose (never parsed by
    // the backend, only compared for equality within its own (Esus, phone, key) scope).
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}
