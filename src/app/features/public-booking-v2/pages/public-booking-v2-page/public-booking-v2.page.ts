import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BookingLayoutComponent } from '../../../booking/components/booking-layout/booking-layout.component';
import { BookingPreview, PublicBookingErrorKind, PublicServiceOffer } from '../../models/public-booking-v2.models';
import { IdempotencyKeyService } from '../../services/idempotency-key.service';
import { mapPublicBookingError } from '../../services/public-booking-v2-error-mapper';
import { PublicBookingV2ApiService } from '../../services/public-booking-v2-api.service';
import { PublicBookingV2Store } from '../../store/public-booking-v2.store';

const AVAILABILITY_WINDOW_DAYS = 7;
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
  imports: [BookingLayoutComponent, RouterLink],
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

  /** V2-MC-01: weekly availability window; 0 = the week starting today (Esus timezone). */
  protected readonly weekOffset = signal(0);
  protected readonly timeZone = computed(() => this.store.esusProfile()?.timeZoneId ?? 'UTC');

  /** Candidates grouped by calendar day in the ESUS timezone (never the browser's). */
  protected readonly slotGroups = computed(() => {
    const groups: { key: string; heading: string; slots: BookingPreview[] }[] = [];
    for (const slot of this.store.availabilityItems()) {
      const key = this.dayKey(slot.startUtc);
      let group = groups.find((item) => item.key === key);
      if (!group) {
        group = { key, heading: `${this.formatWeekday(slot.startUtc)} ${this.formatDay(slot.startUtc)}`, slots: [] };
        groups.push(group);
      }
      group.slots.push(slot);
    }
    return groups;
  });

  /** Presentation of the public status: only what the backend contract proves is shown as confirmed. */
  protected readonly statusView = computed(() => {
    const status = this.store.publicStatus();
    if (!status) return null;
    const effective = `${this.formatDay(status.startUtc)} ${this.formatTime(status.startUtc)} – ${this.formatTime(status.endUtc)}`;
    const requested = status.requestedStartUtc && status.requestedEndUtc
      ? `${this.formatDay(status.requestedStartUtc)} ${this.formatTime(status.requestedStartUtc)} – ${this.formatTime(status.requestedEndUtc)}`
      : null;
    let heading: string;
    let message: string;
    if (status.status === 'Pending') {
      heading = 'SOLICITAÇÃO EM ANÁLISE';
      message = 'O estabelecimento ainda precisa confirmar este pedido.';
    } else if (status.status === 'Rejected') {
      heading = 'SOLICITAÇÃO RECUSADA';
      message = 'Este pedido não foi aceito. Escolha outro horário.';
    } else if (status.bookingState === 'Cancelled') {
      heading = 'AGENDAMENTO CANCELADO';
      message = 'Este agendamento foi cancelado pelo estabelecimento.';
    } else if (status.bookingState === 'NoShow') {
      heading = 'AUSÊNCIA REGISTRADA';
      message = 'O estabelecimento registrou que este agendamento não foi realizado.';
    } else if (status.bookingState === 'Active' && status.rescheduled) {
      heading = 'HORÁRIO ALTERADO';
      message = 'O estabelecimento alterou o horário do seu agendamento. Este é o horário vigente.';
    } else if (status.bookingState === 'Active') {
      heading = 'AGENDAMENTO CONFIRMADO';
      message = 'Seu pedido foi aceito pelo estabelecimento.';
    } else {
      heading = 'STATUS EM ATUALIZAÇÃO';
      message = 'Não foi possível confirmar o estado atual do agendamento. Atualize o status.';
    }
    const isAccepted = status.status === 'Accepted' && !!status.bookingState;
    return {
      heading,
      message,
      effectiveLabel: isAccepted ? 'Horário vigente' : 'Intervalo solicitado',
      effective,
      requested: isAccepted && status.rescheduled ? requested : null,
      pendingNote: status.status === 'Pending' ? 'Este horário ainda não está confirmado.' : null,
      price: isAccepted ? status.effectivePrice ?? null : status.frozenPrice ?? null,
      duration: isAccepted ? status.effectiveDurationMinutes ?? null : status.frozenDurationMinutes ?? null,
      priceLabel: isAccepted ? 'Valor' : 'Valor congelado na solicitação',
      prestadorName: status.prestadorName ?? null,
      locationName: status.executionLocationName ?? null,
      holdActive: status.status === 'Pending' && status.holdStatus === 'Active',
      holdExpiresAt: status.holdExpiresAtUtc ? `${this.formatDay(status.holdExpiresAtUtc)} ${this.formatTime(status.holdExpiresAtUtc)}` : null,
    };
  });

  protected readonly canGoPrevious = computed(() => this.weekOffset() > 0);

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
    this.weekOffset.set(0);
    this.store.selectServiceOffer(serviceOffer);
    this.idempotency.next();
    this.loadAvailability(serviceOffer);
  }

  protected nextWeek(): void {
    this.changeWeek(this.weekOffset() + 1);
  }

  protected previousWeek(): void {
    if (this.canGoPrevious()) this.changeWeek(this.weekOffset() - 1);
  }

  private changeWeek(offset: number): void {
    const serviceOffer = this.store.selectedServiceOffer();
    if (!serviceOffer) return;
    this.weekOffset.set(offset);
    this.store.clearAvailabilityAfterConflict();
    this.idempotency.next();
    this.loadAvailability(serviceOffer);
  }

  protected slotKey(slot: BookingPreview): string {
    return `${slot.startUtc}|${slot.prestadorId}|${slot.executionLocationId}`;
  }

  protected isSelected(slot: BookingPreview): boolean {
    const selected = this.store.selectedSlot();
    return !!selected && this.slotKey(selected) === this.slotKey(slot);
  }

  protected selectSlot(slot: BookingPreview): void {
    this.store.selectSlot(slot);
    this.idempotency.next();
  }

  protected onNameInput(value: string): void {
    this.store.setVisitorName(value);
    this.idempotency.next();
  }

  protected onMarketingChange(checked: boolean): void {
    this.store.setMarketingOptIn(checked);
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
          marketingOptIn: this.store.marketingOptIn(),
          expectedPrice: slot.currentPrice,
          expectedDurationMinutes: slot.durationMinutes,
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

          // V2-MC-06 / F-12: price/duration changed after the review - show the new values and ask for a NEW confirmation (never resubmit).
          if (mapped.kind === 'ConditionsChanged' && mapped.conditions) {
            this.store.applyChangedConditions(mapped.conditions);
            return;
          }

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

    const windowStart = this.addDays(this.today, this.weekOffset() * AVAILABILITY_WINDOW_DAYS);
    const startDate = this.toDateOnly(windowStart);
    const endDate = this.toDateOnly(this.addDays(windowStart, AVAILABILITY_WINDOW_DAYS));

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
    return `${this.formatDay(iso)} ${this.formatTime(iso)}`;
  }

  protected formatTime(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: this.timeZone(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  }

  protected formatDay(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: this.timeZone(), day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
  }

  protected formatWeekday(iso: string): string {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: this.timeZone(), weekday: 'long' }).format(new Date(iso));
  }

  private dayKey(iso: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: this.timeZone() }).format(new Date(iso));
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
