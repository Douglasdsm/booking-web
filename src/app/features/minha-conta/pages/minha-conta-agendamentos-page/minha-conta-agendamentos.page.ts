import { Component, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { bookingStateLabel, formatBookingDateTime } from '../../../../core/format/booking-display';
import { MeusAgendamentosService } from '../../../meus-agendamentos/meus-agendamentos.service';
import { MeuAgendamento } from '../../minha-conta.models';
import { MinhaContaStore } from '../../minha-conta.store';

@Component({ selector: 'app-minha-conta-agendamentos-page', imports: [RouterLink], providers: [MinhaContaStore], template: `<main class="booking-app"><section class="booking-panel"><a routerLink="/minha-conta">Voltar</a><h1>Meus agendamentos</h1>@if (store.loading()) {<p>Carregando...</p>} @if (store.error()) {<p role="alert">{{ store.error() }}</p>} @if (!store.loading() && (store.agendamentos()?.items?.length ?? 0) === 0) {<p>Nenhum agendamento futuro.</p>}<ul>@for (item of store.agendamentos()?.items ?? []; track item.bookingId) {<li><strong>{{ item.serviceLabel }}</strong><span>{{ when(item) }}</span><span>{{ state(item) }}</span></li>}</ul><a routerLink="/meus-agendamentos">Gerenciar meus agendamentos</a></section></main>` })
export class MinhaContaAgendamentosPage implements OnInit {
  readonly store = inject(MinhaContaStore);
  private readonly bookings = inject(MeusAgendamentosService);
  /** The company's IANA zone per execution Esus: a booking is shown in the business time, never the browser's (F-COV-25). */
  private readonly timeZones = signal<Record<number, string>>({});

  constructor() {
    effect(() => {
      const items = this.store.agendamentos()?.items ?? [];
      untracked(() => items.forEach((item) => this.loadTimeZone(item.executionEsusId)));
    });
  }

  ngOnInit(): void { this.store.loadAgendamentos(); }

  when(item: MeuAgendamento): string { return formatBookingDateTime(item.startUtc, this.timeZones()[item.executionEsusId]); }
  state(item: MeuAgendamento): string { return bookingStateLabel(item.currentState); }

  private loadTimeZone(esusId: number): void {
    if (esusId in this.timeZones()) return;
    this.timeZones.update((current) => ({ ...current, [esusId]: 'UTC' }));
    this.bookings.getTimeZone(esusId).subscribe({
      next: (profile) => this.timeZones.update((current) => ({ ...current, [esusId]: profile.timeZoneId ?? 'UTC' })),
      error: () => undefined,
    });
  }
}
