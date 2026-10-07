import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MinhaContaStore } from '../../minha-conta.store';

/**
 * V2-MC-04: the user's OWN marketing preferences, one per company they have a booking with (ESUS_SCOPED).
 * Independent from the terms/privacy acceptance and from any booking; never required for anything. The backend is the
 * source of truth: every change is a PUT and the state shown is whatever the backend returned.
 */
@Component({
  selector: 'app-minha-conta-marketing-page',
  imports: [DatePipe, RouterLink],
  providers: [MinhaContaStore],
  template: `
    <main class="booking-app">
      <section class="booking-panel">
        <a routerLink="/minha-conta">Voltar</a>
        <h1>Comunicações de marketing</h1>
        <p>
          Opcional e independente dos seus agendamentos: você decide, empresa por empresa, se aceita comunicações de marketing.
          Não aceitar não afeta nenhum agendamento nem o uso do serviço.
        </p>
        @if (store.loading()) { <p>Carregando...</p> }
        @if (store.error()) { <p role="alert">{{ store.error() }}</p> }
        @if (!store.loading() && store.marketing().length === 0 && !store.error()) {
          <p data-testid="marketing-empty">Você ainda não tem agendamentos com nenhuma empresa.</p>
        }
        <ul>
          @for (item of store.marketing(); track item.esusId) {
            <li [attr.data-testid]="'marketing-' + item.esusId">
              <strong>{{ item.companyName || 'Empresa #' + item.esusId }}</strong>
              <label>
                <input type="checkbox" [checked]="item.granted" [disabled]="store.saving()" (click)="$event.preventDefault(); toggle(item.esusId, !item.granted)" />
                Quero receber comunicações de marketing desta empresa
              </label>
              @if (item.changedAtUtc) { <small>Atualizado em {{ item.changedAtUtc | date: 'short' }}</small> }
            </li>
          }
        </ul>
      </section>
    </main>
  `,
})
export class MinhaContaMarketingPage implements OnInit {
  readonly store = inject(MinhaContaStore);

  ngOnInit(): void {
    this.store.loadMarketing();
  }

  toggle(esusId: number, granted: boolean): void {
    this.store.setMarketing(esusId, granted);
  }
}
