import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize, forkJoin, Observable } from 'rxjs';

import { AccountNavComponent } from '../../layout/account-nav.component';
import { extractApiErrorMessage } from '../auth-publica/utils/public-auth-utils';
import { AgendamentoResumo, AvisosService, EntradaListaEspera, Oportunidade, Reconfirmacao } from './avisos.service';

@Component({
  selector: 'app-avisos-page',
  imports: [DatePipe, AccountNavComponent],
  template: `
    <main class="booking-app">
      <section class="booking-panel">
        <header class="booking-header"><div class="booking-brand"><p class="booking-brand__eyebrow">Conta</p><h1>Meus avisos</h1></div><app-account-nav /></header>
        <div class="booking-content">
          <p>Respostas pendentes e lista de espera dos seus agendamentos. O estado exibido vem sempre do servidor.</p>
          @if (error()) { <p role="alert" tabindex="-1">{{ error() }}</p> }
          @if (loading()) { <p>Carregando...</p> }

          <h2>Reconfirmações</h2>
          @if (reconfirmations().length === 0) { <p>Nenhuma reconfirmação.</p> }
          @for (item of reconfirmations(); track item.id) {
            <article>
              <strong>Reconfirmação solicitada</strong>
              <p>Agendamento #{{ item.bookingId }} em {{ item.bookingStartUtc | date:'dd/MM/yyyy HH:mm':'UTC' }} UTC</p>
              <p>Prazo para responder: {{ item.deadlineUtc | date:'dd/MM/yyyy HH:mm':'UTC' }} UTC — {{ item.status }}</p>
              @if (item.canRespond) {
                <button type="button" class="booking-button" [disabled]="busy()" (click)="respondReconfirmation(item, true)">Confirmar presença</button>
                <button type="button" class="booking-button" [disabled]="busy()" (click)="respondReconfirmation(item, false)">Não poderei comparecer</button>
              }
            </article>
          }

          <h2>Vagas</h2>
          @if (opportunities().length === 0) { <p>Nenhuma vaga oferecida.</p> }
          @for (item of opportunities(); track item.id) {
            <article>
              <strong>Vaga disponível</strong>
              <p>{{ item.startUtc | date:'dd/MM/yyyy HH:mm':'UTC' }} UTC — {{ item.status }}</p>
              @if (item.status === 'Offered') {
                <button type="button" class="booking-button" [disabled]="busy()" (click)="accept(item)">Aceitar vaga</button>
                <button type="button" class="booking-button" [disabled]="busy()" (click)="decline(item)">Recusar vaga</button>
              }
            </article>
          }

          <h2>Lista de espera</h2>
          @if (upcoming().length === 0) { <p>Nenhum agendamento ativo futuro.</p> }
          @for (booking of upcoming(); track booking.bookingId) {
            <article>
              <strong>Booking #{{ booking.bookingId }} — {{ booking.serviceLabel }}</strong>
              <p>{{ booking.startUtc | date:'dd/MM/yyyy HH:mm':'UTC' }} UTC</p>
              @if (activeEntry(booking.bookingId); as entry) {
                <p>Lista de espera: {{ entry.status }}</p>
                <button type="button" class="booking-button" [disabled]="busy()" (click)="leave(entry)">Sair da lista de espera</button>
              } @else {
                @if (lastEntry(booking.bookingId); as previous) { <p>Lista de espera: {{ previous.status }}</p> }
                <button type="button" class="booking-button" [disabled]="busy()" (click)="join(booking)">Entrar na lista de espera</button>
              }
            </article>
          }
        </div>
      </section>
    </main>
  `,
})
export class AvisosPage implements OnInit {
  private readonly api = inject(AvisosService);
  readonly reconfirmations = signal<Reconfirmacao[]>([]);
  readonly opportunities = signal<Oportunidade[]>([]);
  readonly waitlist = signal<EntradaListaEspera[]>([]);
  readonly upcoming = signal<AgendamentoResumo[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  respondReconfirmation(item: Reconfirmacao, confirmed: boolean): void {
    this.act(this.api.respondReconfirmation(item.id, confirmed));
  }

  accept(item: Oportunidade): void {
    this.act(this.api.acceptOpportunity(item.id));
  }

  decline(item: Oportunidade): void {
    this.act(this.api.declineOpportunity(item.id));
  }

  join(booking: AgendamentoResumo): void {
    this.act(this.api.joinWaitlist(booking.bookingId));
  }

  leave(entry: EntradaListaEspera): void {
    this.act(this.api.leaveWaitlist(entry.id));
  }

  /** Active or Matched entries are the live ones (backend allows one live entry per Booking). */
  activeEntry(bookingId: number): EntradaListaEspera | undefined {
    return this.waitlist().find((entry) => entry.bookingId === bookingId && (entry.status === 'Active' || entry.status === 'Matched'));
  }

  lastEntry(bookingId: number): EntradaListaEspera | undefined {
    return this.waitlist().find((entry) => entry.bookingId === bookingId);
  }

  private act(command: Observable<unknown>): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    command.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.reload(),
      error: (error: unknown) => {
        this.error.set(extractApiErrorMessage(error, 'Não foi possível concluir a operação.'));
        this.reload();
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
    forkJoin({
      reconfirmations: this.api.listReconfirmations(),
      opportunities: this.api.listOpportunities(),
      waitlist: this.api.listWaitlist(),
      bookings: this.api.listUpcomingBookings(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (state) => {
          this.reconfirmations.set(state.reconfirmations);
          this.opportunities.set(state.opportunities);
          this.waitlist.set(state.waitlist);
          this.upcoming.set(state.bookings.items.filter((booking) => booking.currentState === 'Active'));
        },
        error: (error: unknown) => this.error.set(extractApiErrorMessage(error, 'Não foi possível carregar o estado.')),
      });
  }
}
