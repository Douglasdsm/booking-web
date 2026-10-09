import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, Observable } from 'rxjs';

import { extractApiErrorMessage } from '../auth-publica/utils/public-auth-utils';
import { addDays, businessToday } from './business-date';
import { Candidato, EsusPerfil, MeuHold, Oferta, ReservaService } from './reserva.service';

const WINDOW_DAYS = 7;

@Component({
  selector: 'app-reserva-page',
  template: `
    <main class="booking-app">
      <section class="booking-panel">
        <header class="booking-header"><div class="booking-brand"><p class="booking-brand__eyebrow">Reserva</p><h1>Reservar com horário garantido</h1></div></header>
        <div class="booking-content">
          @if (error()) { <p role="alert" tabindex="-1">{{ error() }}</p> }
          @if (loading() && !profile()) { <p>Carregando...</p> }

          @if (currentHold(); as hold) {
            @if (hold.status === 'Consumed') {
              <section class="booking-success-card" data-testid="hold-confirmed">
                <h2>Reserva confirmada</h2>
                <p>{{ hold.serviceLabel }} · {{ formatDay(hold.startUtc) }} {{ formatTime(hold.startUtc) }} – {{ formatTime(hold.endUtc) }}</p>
                <a class="booking-button" href="/meus-agendamentos">Ver meus agendamentos</a>
                <button type="button" class="booking-button" (click)="startAgain()">Nova reserva</button>
              </section>
            } @else if (hold.status === 'Active') {
              <section class="booking-summary-card" data-testid="hold-panel">
                <h3>Reserva segura até {{ formatTime(hold.expiresAtUtc) }}</h3>
                <p data-testid="hold-countdown">Tempo restante: {{ countdown() }}</p>
                <div class="booking-row"><span>Serviço</span><strong>{{ hold.serviceLabel }}</strong></div>
                <div class="booking-row"><span>Data</span><strong>{{ formatDay(hold.startUtc) }}</strong></div>
                <div class="booking-row"><span>Início – término</span><strong>{{ formatTime(hold.startUtc) }} – {{ formatTime(hold.endUtc) }}</strong></div>
                @if (hold.prestadorName) { <div class="booking-row"><span>Profissional</span><strong>{{ hold.prestadorName }}</strong></div> }
                @if (hold.executionLocationName) { <div class="booking-row"><span>Local</span><strong>{{ hold.executionLocationName }}</strong></div> }
                <div class="booking-row"><span>Duração</span><strong>{{ hold.frozenDurationMinutes }} min</strong></div>
                <div class="booking-row booking-row--total"><span>Valor</span><strong>{{ currency(hold.frozenPrice) }}</strong></div>
                @if (hold.canConfirm) {
                  <button type="button" class="booking-button" [disabled]="busy()" (click)="confirm(hold)">Confirmar reserva</button>
                } @else {
                  <p>Esta reserva ainda depende de uma etapa administrativa antes da confirmação.</p>
                }
              </section>
            } @else if (hold.status === 'Expired') {
              <p data-testid="hold-expired">Sua reserva expirou. O horário foi liberado; escolha novamente.</p>
            }
          }

          @if (showSelection()) {
            <h2>Escolha o serviço</h2>
            @for (offer of offers(); track offer.id) {
              <button type="button" class="booking-select-card" [class.booking-select-card--selected]="selectedOffer()?.id === offer.id" (click)="selectOffer(offer)">
                <span class="booking-card-copy"><strong>{{ offer.name }}</strong><span class="booking-service-meta">{{ offer.baseDurationMinutes }} min</span></span>
                <span class="booking-price">{{ currency(offer.basePrice) }}</span>
              </button>
            }
            @if (selectedOffer()) {
              <div class="booking-week-nav" aria-label="Navegação de datas">
                <button type="button" class="booking-button" [disabled]="weekOffset() === 0 || busy() || awaitingProfile()" (click)="changeWeek(-1)">Semana anterior</button>
                <button type="button" class="booking-button" [disabled]="busy() || awaitingProfile()" (click)="changeWeek(1)">Próxima semana</button>
              </div>
              @if (awaitingProfile()) { <p>Carregando horários...</p> } @else { <p class="booking-timezone-note">Horários no fuso {{ timeZone() }}.</p> }
              @if (!slots().length && !loading() && !awaitingProfile()) { <p>Nenhum horário disponível nesta semana.</p> }
              @for (group of groups(); track group.key) {
                <h3 class="booking-day-heading" data-testid="day-heading">{{ group.heading }}</h3>
                <div class="booking-slot-grid">
                  @for (slot of group.slots; track slotKey(slot)) {
                    <button type="button" class="booking-slot" [class.booking-slot--selected]="isSelected(slot)" (click)="selectedSlot.set(slot)">
                      <strong>{{ formatTime(slot.startUtc) }} – {{ formatTime(slot.endUtc) }}</strong>
                      @if (slot.prestadorName) { <small>{{ slot.prestadorName }}</small> }
                      @if (slot.executionLocationName) { <small>{{ slot.executionLocationName }}</small> }
                      <small>{{ slot.durationMinutes }} min · {{ currency(slot.currentPrice) }}</small>
                    </button>
                  }
                </div>
              }
            }
            @if (selectedSlot(); as chosen) {
              <section class="booking-summary-card" data-testid="selection-review">
                <h3>Revise o horário escolhido</h3>
                <div class="booking-row"><span>Serviço</span><strong>{{ chosen.serviceLabel }}</strong></div>
                <div class="booking-row"><span>Data</span><strong>{{ formatDay(chosen.startUtc) }}</strong></div>
                <div class="booking-row"><span>Início – término</span><strong>{{ formatTime(chosen.startUtc) }} – {{ formatTime(chosen.endUtc) }}</strong></div>
                @if (chosen.prestadorName) { <div class="booking-row"><span>Profissional</span><strong>{{ chosen.prestadorName }}</strong></div> }
                @if (chosen.executionLocationName) { <div class="booking-row"><span>Local</span><strong>{{ chosen.executionLocationName }}</strong></div> }
                <div class="booking-row booking-row--total"><span>Valor</span><strong>{{ currency(chosen.currentPrice) }}</strong></div>
                <button type="button" class="booking-button" [disabled]="busy()" (click)="createHold(chosen)">Segurar horário</button>
              </section>
            }
          }
        </div>
      </section>
    </main>
  `,
})
export class ReservaPage implements OnInit {
  private readonly api = inject(ReservaService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly esusId = Number(this.route.snapshot.paramMap.get('esusId'));
  private availabilityVersion = 0;
  private tick: ReturnType<typeof setInterval> | null = null;
  private reloadedForExpiry = false;

  readonly profile = signal<EsusPerfil | null>(null);
  readonly offers = signal<Oferta[]>([]);
  readonly holds = signal<MeuHold[]>([]);
  readonly selectedOffer = signal<Oferta | null>(null);
  readonly selectedSlot = signal<Candidato | null>(null);
  readonly slots = signal<Candidato[]>([]);
  readonly weekOffset = signal(0);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly dismissedConfirmed = signal(false);
  private readonly now = signal(Date.now());
  private clockOffsetMs = 0;

  /** Only used to print dates; availability is never searched before the profile (and therefore the timezone) is known. */
  readonly timeZone = computed(() => this.profile()?.timeZoneId ?? 'UTC');
  /** A service is chosen but the company timezone has not arrived: the availability state is "loading", no search is sent yet. */
  readonly awaitingProfile = computed(() => !!this.selectedOffer() && !this.profile());
  readonly currentHold = computed(() => {
    const hold = this.holds().find((item) => item.executionEsusId === this.esusId);
    if (!hold) return null;
    return hold.status === 'Consumed' && this.dismissedConfirmed() ? null : hold;
  });
  readonly showSelection = computed(() => {
    const hold = this.currentHold();
    return !hold || hold.status === 'Expired' || hold.status === 'Cancelled';
  });
  readonly countdown = computed(() => {
    const hold = this.currentHold();
    if (!hold || hold.status !== 'Active') return '00:00';
    const remaining = Math.max(0, Date.parse(hold.expiresAtUtc) - (this.now() + this.clockOffsetMs));
    const totalSeconds = Math.floor(remaining / 1000);
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  });
  readonly groups = computed(() => {
    const result: { key: string; heading: string; slots: Candidato[] }[] = [];
    for (const slot of this.slots()) {
      const key = new Intl.DateTimeFormat('en-CA', { timeZone: this.timeZone() }).format(new Date(slot.startUtc));
      let group = result.find((item) => item.key === key);
      if (!group) {
        group = { key, heading: `${new Intl.DateTimeFormat('pt-BR', { timeZone: this.timeZone(), weekday: 'long' }).format(new Date(slot.startUtc))} ${this.formatDay(slot.startUtc)}`, slots: [] };
        result.push(group);
      }
      group.slots.push(slot);
    }
    return result;
  });

  ngOnInit(): void {
    this.tick = setInterval(() => this.onTick(), 1000);
    this.destroyRef.onDestroy(() => { if (this.tick) clearInterval(this.tick); });
    this.loading.set(true);
    this.api.getProfile(this.esusId).subscribe({ next: (p) => { this.profile.set(p); if (this.selectedOffer()) this.loadSlots(); }, error: (e: unknown) => this.fail(e, 'Não foi possível carregar o estabelecimento.') });
    this.api.getOffers(this.esusId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (r) => this.offers.set(r.serviceOffers ?? []),
      error: (e: unknown) => this.fail(e, 'Não foi possível carregar os serviços.'),
    });
    this.reloadHolds();
  }

  selectOffer(offer: Oferta): void {
    this.selectedOffer.set(offer);
    this.weekOffset.set(0);
    this.selectedSlot.set(null);
    this.loadSlots();
  }

  changeWeek(delta: number): void {
    const next = this.weekOffset() + delta;
    if (next < 0) return;
    this.weekOffset.set(next);
    this.selectedSlot.set(null);
    this.loadSlots();
  }

  createHold(slot: Candidato): void {
    this.run(this.api.createHold(slot), true);
  }

  confirm(hold: MeuHold): void {
    this.run(this.api.confirmHold(hold.id), false);
  }

  startAgain(): void {
    this.dismissedConfirmed.set(true);
    this.selectedOffer.set(null);
    this.selectedSlot.set(null);
    this.slots.set([]);
  }

  slotKey(slot: Candidato): string { return `${slot.startUtc}|${slot.prestadorId}|${slot.executionLocationId}`; }
  isSelected(slot: Candidato): boolean { const s = this.selectedSlot(); return !!s && this.slotKey(s) === this.slotKey(slot); }
  currency(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  formatTime(iso: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: this.timeZone(), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)); }
  formatDay(iso: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: this.timeZone(), day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)); }

  private run(command: Observable<unknown>, refreshSlots: boolean): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    command.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.selectedSlot.set(null); this.dismissedConfirmed.set(false); this.reloadHolds(); },
      error: (e: unknown) => {
        this.fail(e, 'Não foi possível concluir a operação.');
        this.reloadHolds();
        if (refreshSlots) { this.selectedSlot.set(null); this.loadSlots(); }
      },
    });
  }

  private reloadHolds(): void {
    this.api.listHolds().subscribe({
      next: (holds) => {
        const newest = holds.find((item) => item.executionEsusId === this.esusId);
        if (newest) this.clockOffsetMs = Date.parse(newest.serverNowUtc) - Date.now();
        this.now.set(Date.now());
        this.reloadedForExpiry = false;
        this.holds.set(holds);
      },
      error: (e: unknown) => this.fail(e, 'Não foi possível carregar suas reservas.'),
    });
  }

  private loadSlots(): void {
    const offer = this.selectedOffer();
    const profile = this.profile();
    if (!offer || !profile) return; // no provisional date: the search is sent once the profile arrives (see the profile subscription)
    const version = ++this.availabilityVersion;
    // BusinessToday = today in the company timezone; weeks are calendar arithmetic on that date.
    const start = addDays(businessToday(profile.timeZoneId ?? 'UTC'), this.weekOffset() * WINDOW_DAYS);
    const end = addDays(start, WINDOW_DAYS);
    this.loading.set(true);
    this.api.searchAvailability(this.esusId, offer.id, start, end).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (r) => { if (version === this.availabilityVersion) this.slots.set(r.items ?? []); },
      error: (e: unknown) => { if (version === this.availabilityVersion) this.fail(e, 'Não foi possível buscar horários.'); },
    });
  }

  /** Countdown ticks derive from the backend deadline; once it reaches zero the backend is asked for the authoritative state. */
  private onTick(): void {
    this.now.set(Date.now());
    const hold = this.currentHold();
    if (hold?.status === 'Active' && this.countdown() === '00:00' && !this.reloadedForExpiry) {
      this.reloadedForExpiry = true;
      this.reloadHolds();
      if (this.selectedOffer()) this.loadSlots();
    }
  }

  private fail(error: unknown, fallback: string): void {
    this.error.set(extractApiErrorMessage(error, fallback));
  }
}
