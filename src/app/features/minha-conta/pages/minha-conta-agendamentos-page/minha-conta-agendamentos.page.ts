import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MinhaContaStore } from '../../minha-conta.store';

@Component({ selector: 'app-minha-conta-agendamentos-page', imports: [DatePipe, RouterLink], providers: [MinhaContaStore], template: `<main class="booking-app"><section class="booking-panel"><a routerLink="/minha-conta">Voltar</a><h1>Meus agendamentos</h1>@if (store.loading()) {<p>Carregando...</p>} @if (store.error()) {<p role="alert">{{ store.error() }}</p>} @if (!store.loading() && (store.agendamentos()?.items?.length ?? 0) === 0) {<p>Nenhum agendamento futuro.</p>}<ul>@for (item of store.agendamentos()?.items ?? []; track item.bookingId) {<li><strong>{{ item.serviceLabel }}</strong><span>{{ item.startUtc | date:'short' }}</span><span>{{ item.currentState }}</span></li>}</ul><a routerLink="/meus-agendamentos">Gerenciar meus agendamentos</a></section></main>` })
export class MinhaContaAgendamentosPage implements OnInit {
  readonly store = inject(MinhaContaStore);
  ngOnInit(): void { this.store.loadAgendamentos(); }
}
