import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize, Observable } from 'rxjs';

import { extractApiErrorMessage } from '../auth-publica/utils/public-auth-utils';
import { CandidatoRemarcacao, CicloDeVida, DetalheAgendamento, ListaAgendamentos, MeusAgendamentosService, ResumoAgendamento } from './meus-agendamentos.service';

const PAGE_SIZE = 5;
const WINDOW_DAYS = 7;
type Scope = 'Upcoming' | 'History';
type Panel = 'cancel' | 'reschedule' | null;

@Component({
  selector: 'app-meus-agendamentos-page',
  template: `
    <main class="booking-app">
      <section class="booking-panel">
        <header class="booking-header"><div class="booking-brand"><p class="booking-brand__eyebrow">Conta</p><h1>Meus agendamentos</h1></div></header>
        <div class="booking-content">
          @if (error()) { <p role="alert" tabindex="-1">{{ error() }}</p> }
          @if (success()) { <p role="status">{{ success() }}</p> }
          <nav aria-label="Escopo">
            <button type="button" class="booking-button" [attr.aria-pressed]="scope() === 'Upcoming'" (click)="setScope('Upcoming')">Próximos</button>
            <button type="button" class="booking-button" [attr.aria-pressed]="scope() === 'History'" (click)="setScope('History')">Histórico</button>
          </nav>
          @if (loading()) { <p>Carregando...</p> }
          @else if (list().items.length === 0) { <p>Nenhum agendamento nesta lista.</p> }
          @for (item of list().items; track item.bookingId) {
            <article data-testid="booking-card">
              <strong>{{ item.serviceLabel }} — {{ item.currentState }}</strong>
              <p>{{ formatDay(item) }} {{ formatTime(item, item.startUtc) }} – {{ formatTime(item, item.endUtc) }}</p>
              @if (item.prestadorName) { <p>Profissional: {{ item.prestadorName }}</p> }
              @if (item.executionLocationName) { <p>Local: {{ item.executionLocationName }}</p> }
              <button type="button" class="booking-button" (click)="openDetail(item)">Ver detalhes</button>
            </article>
          }
          @if (list().totalItems > pageSize) {
            <nav aria-label="Paginação">
              <button type="button" class="booking-button" [disabled]="page() <= 1 || loading()" (click)="goToPage(page() - 1)">Página anterior</button>
              <span>Página {{ page() }} de {{ totalPages() }}</span>
              <button type="button" class="booking-button" [disabled]="page() >= totalPages() || loading()" (click)="goToPage(page() + 1)">Próxima página</button>
            </nav>
          }

          @if (selected(); as current) {
            <section class="booking-summary-card" data-testid="booking-detail" aria-label="Detalhe do agendamento">
              <h2>Booking #{{ current.bookingId }}</h2>
              @if (lifecycle(); as life) { <p data-testid="detail-state">{{ life.currentState }}</p> }
              @if (detail(); as d) {
                <div class="booking-row"><span>Horário</span><strong>{{ formatDay(current) }} {{ formatTime(current, d.startUtc) }} – {{ formatTime(current, d.endUtc) }}</strong></div>
                <div class="booking-row"><span>Duração</span><strong>{{ d.effectiveDurationMinutes }} min</strong></div>
                <div class="booking-row"><span>Valor</span><strong>{{ currency(d.effectivePrice, d.quote.currency) }}</strong></div>
                @if (current.prestadorName) { <div class="booking-row"><span>Profissional</span><strong>{{ current.prestadorName }}</strong></div> }
                @if (current.executionLocationName) { <div class="booking-row"><span>Local</span><strong>{{ current.executionLocationName }}</strong></div> }
              }
              @if (lifecycle()?.timeline?.length) {
                <h3>Histórico</h3>
                <ul>@for (event of lifecycle()!.timeline; track event.occurredAtUtc + event.eventType) { <li>{{ event.eventType }} — {{ formatDay(current) === '' ? '' : event.occurredAtUtc.slice(0, 10) }} {{ event.detail }}</li> }</ul>
              }
              @if (isActionable()) {
                <button type="button" class="booking-button" [disabled]="busy()" (click)="openPanel('cancel')">Cancelar agendamento</button>
                <button type="button" class="booking-button" [disabled]="busy()" (click)="openPanel('reschedule')">Remarcar</button>
              }
              @if (panel() === 'cancel') {
                <label for="cancel-reason">Motivo (opcional)</label>
                <input id="cancel-reason" [value]="reason()" (input)="reason.set($any($event.target).value)" />
                <button type="button" class="booking-button" [disabled]="busy()" (click)="confirmCancel()">Confirmar cancelamento</button>
              }
              @if (panel() === 'reschedule') {
                <h3>Escolha o novo horário</h3>
                <div class="booking-week-nav" aria-label="Navegação de datas">
                  <button type="button" class="booking-button" [disabled]="weekOffset() === 0 || busy()" (click)="changeWeek(-1)">Semana anterior</button>
                  <button type="button" class="booking-button" [disabled]="busy()" (click)="changeWeek(1)">Próxima semana</button>
                </div>
                @if (!candidates().length && !loadingCandidates()) { <p>Nenhum horário disponível nesta semana.</p> }
                <div class="booking-slot-grid">
                  @for (slot of candidates(); track slotKey(slot)) {
                    <button type="button" class="booking-slot" [class.booking-slot--selected]="isChosen(slot)" (click)="chosen.set(slot)">
                      <strong>{{ formatDay(current) === '' ? '' : formatDayOf(current, slot.startUtc) }} {{ formatTime(current, slot.startUtc) }} – {{ formatTime(current, slot.endUtc) }}</strong>
                      @if (slot.prestadorName) { <small>{{ slot.prestadorName }}</small> }
                      @if (slot.executionLocationName) { <small>{{ slot.executionLocationName }}</small> }
                      <small>{{ slot.durationMinutes }} min · {{ currency(slot.currentPrice, 'BRL') }}</small>
                    </button>
                  }
                </div>
                @if (chosen(); as pick) {
                  <p data-testid="reschedule-review">Novo horário: {{ formatDayOf(current, pick.startUtc) }} {{ formatTime(current, pick.startUtc) }} – {{ formatTime(current, pick.endUtc) }}</p>
                  <button type="button" class="booking-button" [disabled]="busy()" (click)="confirmReschedule(pick)">Confirmar remarcação</button>
                }
              }
              <button type="button" class="booking-button" [disabled]="busy()" (click)="closeDetail()">Fechar</button>
            </section>
          }
        </div>
      </section>
    </main>
  `,
})
export class MeusAgendamentosPage implements OnInit {
  private readonly api = inject(MeusAgendamentosService);
  private candidatesVersion = 0;
  readonly pageSize = PAGE_SIZE;

  readonly scope = signal<Scope>('Upcoming');
  readonly page = signal(1);
  readonly list = signal<ListaAgendamentos>({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, items: [] });
  readonly timeZones = signal<Record<number, string>>({});
  readonly selected = signal<ResumoAgendamento | null>(null);
  readonly detail = signal<DetalheAgendamento | null>(null);
  readonly lifecycle = signal<CicloDeVida | null>(null);
  readonly panel = signal<Panel>(null);
  readonly reason = signal('');
  readonly candidates = signal<CandidatoRemarcacao[]>([]);
  readonly chosen = signal<CandidatoRemarcacao | null>(null);
  readonly weekOffset = signal(0);
  readonly loading = signal(false);
  readonly loadingCandidates = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  ngOnInit(): void { this.loadList(); }

  totalPages(): number { return Math.max(1, Math.ceil(this.list().totalItems / PAGE_SIZE)); }
  isActionable(): boolean { return this.lifecycle()?.currentState === 'Active'; }

  setScope(scope: Scope): void {
    this.scope.set(scope);
    this.page.set(1);
    this.closeDetail();
    this.loadList();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.page.set(page);
    this.loadList();
  }

  openDetail(item: ResumoAgendamento): void {
    this.error.set(null);
    this.success.set(null);
    this.selected.set(item);
    this.panel.set(null);
    this.loadDetail(item.bookingId);
  }

  closeDetail(): void {
    this.selected.set(null); this.detail.set(null); this.lifecycle.set(null); this.panel.set(null); this.candidates.set([]); this.chosen.set(null); this.reason.set('');
  }

  openPanel(panel: Exclude<Panel, null>): void {
    if (!this.isActionable() || this.busy()) return;
    this.panel.set(panel);
    this.reason.set('');
    this.chosen.set(null);
    if (panel === 'reschedule') { this.weekOffset.set(0); this.loadCandidates(); }
  }

  changeWeek(delta: number): void {
    const next = this.weekOffset() + delta;
    if (next < 0) return;
    this.weekOffset.set(next);
    this.chosen.set(null);
    this.loadCandidates();
  }

  confirmCancel(): void {
    const item = this.selected();
    if (!item || !this.isActionable()) return;
    this.run(this.api.cancel(item.bookingId, this.reason().trim() || null), 'Agendamento cancelado.');
  }

  confirmReschedule(candidate: CandidatoRemarcacao): void {
    const item = this.selected();
    if (!item || !this.isActionable()) return;
    this.run(this.api.reschedule(item.bookingId, candidate, null), 'Agendamento remarcado.');
  }

  slotKey(slot: CandidatoRemarcacao): string { return `${slot.startUtc}|${slot.prestadorId}|${slot.executionLocationId}`; }
  isChosen(slot: CandidatoRemarcacao): boolean { const c = this.chosen(); return !!c && this.slotKey(c) === this.slotKey(slot); }
  currency(value: number, code: string): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code || 'BRL' }).format(value); }
  formatTime(item: ResumoAgendamento, iso: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: this.tz(item), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)); }
  formatDay(item: ResumoAgendamento): string { return this.formatDayOf(item, item.startUtc); }
  formatDayOf(item: ResumoAgendamento, iso: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: this.tz(item), day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)); }
  private tz(item: ResumoAgendamento): string { return this.timeZones()[item.executionEsusId] ?? 'UTC'; }

  private run(command: Observable<unknown>, message: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.success.set(null);
    command.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.success.set(message); this.panel.set(null); this.chosen.set(null); this.reloadTruth(false); },
      error: (e: unknown) => { this.error.set(extractApiErrorMessage(e, 'Não foi possível concluir a operação.')); this.chosen.set(null); this.reloadTruth(true); },
    });
  }

  /** After every command (success or failure) the backend state is re-read: list, detail/lifecycle and, on failure, the candidates. */
  private reloadTruth(refreshCandidates: boolean): void {
    this.loadList();
    const item = this.selected();
    if (item) this.loadDetail(item.bookingId);
    if (refreshCandidates && this.panel() === 'reschedule') this.loadCandidates();
  }

  private loadList(): void {
    this.loading.set(true);
    this.api.list(this.scope(), this.page(), PAGE_SIZE).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (result) => {
        this.list.set(result);
        for (const esusId of new Set(result.items.map((item) => item.executionEsusId)))
          if (!(esusId in this.timeZones())) this.loadTimeZone(esusId);
      },
      error: (e: unknown) => this.error.set(extractApiErrorMessage(e, 'Não foi possível carregar seus agendamentos.')),
    });
  }

  private loadTimeZone(esusId: number): void {
    this.timeZones.update((current) => ({ ...current, [esusId]: 'UTC' }));
    this.api.getTimeZone(esusId).subscribe({
      next: (profile) => this.timeZones.update((current) => ({ ...current, [esusId]: profile.timeZoneId ?? 'UTC' })),
      error: () => undefined,
    });
  }

  private loadDetail(id: number): void {
    this.api.getBooking(id).subscribe({ next: (d) => this.detail.set(d), error: (e: unknown) => this.error.set(extractApiErrorMessage(e, 'Não foi possível carregar o detalhe.')) });
    this.api.getLifecycle(id).subscribe({ next: (l) => this.lifecycle.set(l), error: (e: unknown) => this.error.set(extractApiErrorMessage(e, 'Não foi possível carregar o histórico.')) });
  }

  private loadCandidates(): void {
    const item = this.selected();
    if (!item) return;
    const version = ++this.candidatesVersion;
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + this.weekOffset() * WINDOW_DAYS);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + WINDOW_DAYS);
    const date = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: this.tz(item) }).format(d);
    this.loadingCandidates.set(true);
    this.api.searchAvailability(item.executionEsusId, item.serviceOfferId, date(start), date(end)).pipe(finalize(() => this.loadingCandidates.set(false))).subscribe({
      next: (r) => { if (version === this.candidatesVersion) this.candidates.set(r.items ?? []); },
      error: (e: unknown) => { if (version === this.candidatesVersion) this.error.set(extractApiErrorMessage(e, 'Não foi possível buscar horários.')); },
    });
  }
}
