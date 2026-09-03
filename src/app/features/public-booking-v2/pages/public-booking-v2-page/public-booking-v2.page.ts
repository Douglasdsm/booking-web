import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BookingLayoutComponent } from '../../../booking/components/booking-layout/booking-layout.component';
import { BookingPreview, PublicServiceOffer } from '../../models/public-booking-v2.models';
import { IdempotencyKeyService } from '../../services/idempotency-key.service';
import { mapPublicBookingError } from '../../services/public-booking-v2-error-mapper';
import { PublicBookingV2ApiService } from '../../services/public-booking-v2-api.service';
import { PublicBookingV2Store } from '../../store/public-booking-v2.store';

const AVAILABILITY_RANGE_DAYS = 14;

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
          this.store.setSubmitSuccess(result);
        },
        error: (error: HttpErrorResponse) => {
          const mapped = mapPublicBookingError(error);
          this.store.setSubmitError(mapped);

          // Slot conflict: the stale candidate must never be silently resubmitted or auto-replaced
          // (plan §"CONCORRÊNCIA NORMAL" — "não escolher outro horário sozinho"). Refresh the list so
          // the visitor picks a REAL currently-available slot next.
          if (mapped.kind === 'SlotUnavailable') {
            this.store.clearAvailabilityAfterConflict();
            if (serviceOffer) {
              this.loadAvailability(serviceOffer);
            }
          }
        },
      });
  }

  protected startOver(): void {
    const esusId = this.store.esusId();
    this.idempotency.clear();
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

          if (profile.publicBookingEnabled) {
            this.loadServiceOffers(esusId);
          }
        },
        error: (error: HttpErrorResponse) => this.store.setLoadError(mapPublicBookingError(error)),
      });
  }

  private loadServiceOffers(esusId: number): void {
    this.store.setLoading(true);

    this.api
      .getServiceOffers(esusId)
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => this.store.setServiceOffers(response.serviceOffers ?? []),
        error: (error: HttpErrorResponse) => this.store.setLoadError(mapPublicBookingError(error)),
      });
  }

  private loadAvailability(serviceOffer: PublicServiceOffer): void {
    const esusId = this.store.esusId();

    if (esusId === null) {
      return;
    }

    this.store.setLoading(true);
    this.store.setLoadError(null);
    const version = ++this.availabilityRequestVersion;

    const startDate = this.toDateOnly(this.today);
    const endDate = this.toDateOnly(this.addDays(this.today, AVAILABILITY_RANGE_DAYS));

    this.api
      .searchAvailability(esusId, { serviceOfferId: serviceOffer.id, startDate, endDate })
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => { if (version === this.availabilityRequestVersion) this.store.setAvailabilityItems(response.items ?? []); },
        error: (error: HttpErrorResponse) => { if (version === this.availabilityRequestVersion) this.store.setLoadError(mapPublicBookingError(error)); },
      });
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
}
