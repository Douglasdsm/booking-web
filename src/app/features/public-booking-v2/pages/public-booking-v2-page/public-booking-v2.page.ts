import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BookingLayoutComponent } from '../../../booking/components/booking-layout/booking-layout.component';
import { BookingPreview, PublicBookingErrorKind, PublicServiceOffer } from '../../models/public-booking-v2.models';
import { IdempotencyKeyService } from '../../services/idempotency-key.service';
import { mapPublicBookingError } from '../../services/public-booking-v2-error-mapper';
import { PublicBookingV2ApiService } from '../../services/public-booking-v2-api.service';
import { PublicBookingV2Store } from '../../store/public-booking-v2.store';

const AVAILABILITY_RANGE_DAYS = 14;
const STATUS_TOKEN_STORAGE_PREFIX = 'public-booking-v2:status-token:';

/**
 * Phase 37: the minimal public V2 booking page (plan §"ESCOPO FUNCIONAL MÍNIMO") — one page, no
 * multi-route stepper (unlike V1's `agendar/:slug/:etapa`), since the V2 flow itself is simpler
 * (no visitor account/token step, no separate professional-selection step — a `BookingPreview` slot
 * already names its own Prestador/Location). Routed by `esusId` directly, not `slug` — see this
 * phase's report §"Routing / TECHNICAL_GAP" for why.
 *
 * This component NEVER computes availability, price, duration, owner, Debtor, Customer, approval, Hold,
 * or capacity itself — it only renders what `PublicBookingV2ApiService` returns and sends the visitor's
 * raw intent (plan §"PRINCÍPIO ARQUITETURAL").
 */
@Component({
  selector: 'app-public-booking-v2-page',
  imports: [BookingLayoutComponent],
  templateUrl: './public-booking-v2.page.html',
  styleUrl: './public-booking-v2.page.scss',
})
export class PublicBookingV2Page {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicBookingV2ApiService);
  private readonly idempotency = inject(IdempotencyKeyService);
  private availabilityRequestVersion = 0;

  protected readonly store = inject(PublicBookingV2Store);
  protected readonly today = new Date();

  protected readonly canSubmit = computed(
    () =>
      !!this.store.selectedServiceOffer() &&
      !!this.store.selectedSlot() &&
      this.store.visitorName().trim().length > 0 &&
      this.store.visitorName().trim().length <= 120 &&
      this.store.visitorPhone().trim().length >= 8 &&
      this.store.visitorPhone().trim().length <= 32 &&
      /^[0-9+() .-]+$/.test(this.store.visitorPhone().trim()) &&
      this.store.submitStatus() !== 'submitting',
  );

  constructor() {
    const esusIdParam = this.route.snapshot.paramMap.get('esusId');
    const esusId = esusIdParam ? Number(esusIdParam) : NaN;

    if (!esusIdParam || Number.isNaN(esusId)) {
      this.store.setLoadError({ kind: 'InvalidService', message: 'Link de agendamento inválido.' });
      return;
    }

    this.store.reset();
    this.store.setEsusId(esusId);
    this.loadEsusProfile(esusId);
  }

  protected selectServiceOffer(serviceOffer: PublicServiceOffer): void {
    this.store.selectServiceOffer(serviceOffer);
    this.idempotency.next();
    this.loadAvailability(serviceOffer);
  }

  protected selectSlot(slot: BookingPreview): void {
    this.store.selectSlot(slot);
    this.idempotency.next();
  }

  protected onNameInput(value: string): void {
    this.store.setVisitorName(value);
    this.idempotency.next();
  }

  protected onPhoneInput(value: string): void {
    this.store.setVisitorPhone(value);
    this.idempotency.next();
  }

  protected submit(): void {
    const esusId = this.store.esusId();
    const serviceOffer = this.store.selectedServiceOffer();
    const slot = this.store.selectedSlot();
    const visitorName = this.store.visitorName().trim();
    const visitorPhone = this.store.visitorPhone().trim();

    if (!this.canSubmit() || esusId === null || !serviceOffer || !slot) {
      return;
    }

    this.store.setSubmitting();

    this.api
      .createPublicBooking(
        esusId,
        {
          serviceOfferId: serviceOffer.id,
          executionLocationId: slot.executionLocationId,
          prestadorId: slot.prestadorId,
          requestedStartUtc: slot.startUtc,
          visitorName,
          visitorPhone,
        },
        this.idempotency.current(),
      )
      .subscribe({
        next: (result) => {
          this.idempotency.clear();
          if (result.publicStatusToken) {
            this.setStoredStatusToken(esusId, result.publicStatusToken);
          }
          this.store.setSubmitSuccess(result);
        },
        error: (error: HttpErrorResponse) => {
          const mapped = mapPublicBookingError(error);
          this.store.setSubmitError(mapped);

          // Slot conflict: the stale candidate must never be silently resubmitted or auto-replaced
          // (plan §"CONCORRÊNCIA NORMAL" — "não escolher outro horário sozinho"). Refresh the list so
          // the visitor picks a REAL currently-available slot next.
          if (this.isRecoverableSelectionFailure(mapped.kind)) {
            this.store.clearAvailabilityAfterConflict();
            this.loadAvailability(serviceOffer);
          }
        },
      });
  }

  protected startNewBooking(): void {
    const esusId = this.store.esusId();
    this.idempotency.clear();
    if (esusId !== null) {
      this.removeStoredStatusToken(esusId);
    }
    this.store.reset();

    if (esusId !== null) {
      this.store.setEsusId(esusId);
      this.loadEsusProfile(esusId);
    }
  }

  private loadEsusProfile(esusId: number): void {
    this.store.setLoading(true);
    this.store.setLoadError(null);

    this.api
      .getPublicEsus(esusId)
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (profile) => {
          this.store.setEsusProfile(profile);
          const token = this.getStoredStatusToken(esusId);
          if (token) this.refreshPublicStatus(esusId, token);

          if (profile.publicBookingEnabled) {
            this.loadServiceOffers(esusId);
          }
        },
        error: (error: HttpErrorResponse) => this.store.setLoadError(mapPublicBookingError(error)),
      });
  }

  protected refreshPublicStatus(esusId = this.store.esusId()!, token?: string): void {
    const statusToken = token ?? this.getStoredStatusToken(esusId);
    if (!statusToken || !esusId) return;
    this.api.getPublicBookingStatus(esusId, statusToken).subscribe({
      next: (status) => this.store.setPublicStatus(status),
      error: (error: HttpErrorResponse) => this.store.setSubmitError(mapPublicBookingError(error)),
    });
  }

  private loadServiceOffers(esusId: number): void {
    this.store.setLoading(true);
    this.store.setCatalogError(null);

    this.api
      .getServiceOffers(esusId)
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => this.store.setServiceOffers(response.serviceOffers ?? []),
        error: (error: HttpErrorResponse) => this.store.setCatalogError(mapPublicBookingError(error)),
      });
  }

  protected retryServiceOffers(): void {
    const esusId = this.store.esusId();
    if (esusId !== null) this.loadServiceOffers(esusId);
  }

  private loadAvailability(serviceOffer: PublicServiceOffer): void {
    const esusId = this.store.esusId();

    if (esusId === null) {
      return;
    }

    this.store.setLoading(true);
    this.store.setAvailabilityError(null);
    const version = ++this.availabilityRequestVersion;

    const startDate = this.toDateOnly(this.today);
    const endDate = this.toDateOnly(this.addDays(this.today, AVAILABILITY_RANGE_DAYS));

    this.api
      .searchAvailability(esusId, { serviceOfferId: serviceOffer.id, startDate, endDate })
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => { if (version === this.availabilityRequestVersion) this.store.setAvailabilityItems(response.items ?? []); },
        error: (error: HttpErrorResponse) => { if (version === this.availabilityRequestVersion) this.store.setAvailabilityError(mapPublicBookingError(error)); },
      });
  }

  protected retryAvailability(): void {
    const serviceOffer = this.store.selectedServiceOffer();
    if (serviceOffer) this.loadAvailability(serviceOffer);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  protected formatSlotTime(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  }

  private toDateOnly(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: this.store.esusProfile()?.timeZoneId ?? 'UTC' }).formatToParts(date);
    return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private isRecoverableSelectionFailure(kind: PublicBookingErrorKind): boolean {
    return kind === 'SlotUnavailable' || kind === 'ServiceUnavailable' || kind === 'InvalidService';
  }

  private getStoredStatusToken(esusId: number): string {
    try { return sessionStorage.getItem(this.statusTokenStorageKey(esusId)) ?? ''; } catch { return ''; }
  }

  private setStoredStatusToken(esusId: number, token: string): void {
    try { sessionStorage.setItem(this.statusTokenStorageKey(esusId), token); } catch { /* SSR */ }
  }

  private removeStoredStatusToken(esusId: number): void {
    try { sessionStorage.removeItem(this.statusTokenStorageKey(esusId)); } catch { /* SSR */ }
  }

  private statusTokenStorageKey(esusId: number): string {
    return `${STATUS_TOKEN_STORAGE_PREFIX}${esusId}`;
  }
}
