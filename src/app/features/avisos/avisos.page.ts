import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize, Observable, switchMap } from 'rxjs';

import { extractApiErrorMessage } from '../auth-publica/utils/public-auth-utils';
import { AvisosService, Notificacao, Oportunidade } from './avisos.service';

const RECONFIRMATION_EVENT = 'BookingReconfirmationRequired';
const OPPORTUNITY_EVENT = 'BookingOpportunityOffered';

@Component({
  selector: 'app-avisos-page',
  imports: [DatePipe],
  template: `
    <main class="booking-app">
      <section class="booking-panel">
        <header class="booking-header"><div class="booking-brand"><p class="booking-brand__eyebrow">Conta</p><h1>Meus avisos</h1></div></header>
        <div class="booking-content">
          <p>Respostas pendentes sobre os seus agendamentos. O status exibido vem sempre do servidor.</p>
          @if (error()) { <p role="alert" tabindex="-1">{{ error() }}</p> }
          @if (loading()) { <p>Carregando avisos...</p> }
          @else if (items().length === 0) { <p>Nenhum aviso pendente.</p> }
          @else {
            <ul class="booking-form">
              @for (item of items(); track item.id) {
                <li>
                  @if (item.eventType === reconfirmationEvent) {
                    <strong>Reconfirmação solicitada</strong>
                    @if (item.isRead) { <p>Respondido.</p> }
                    @else {
                      <button type="button" class="booking-button" [disabled]="busy()" (click)="respondReconfirmation(item, true)">Confirmar presença</button>
                      <button type="button" class="booking-button" [disabled]="busy()" (click)="respondReconfirmation(item, false)">Não poderei comparecer</button>
                    }
                  } @else {
                    <strong>Vaga disponível</strong>
                    @if (opportunities()[item.causeId]; as opportunity) {
                      <p>{{ opportunity.startUtc | date:'dd/MM/yyyy HH:mm':'UTC' }} UTC — {{ opportunity.status }}</p>
                      @if (opportunity.status === 'Offered') {
                        <button type="button" class="booking-button" [disabled]="busy()" (click)="accept(item)">Aceitar vaga</button>
                        <button type="button" class="booking-button" [disabled]="busy()" (click)="decline(item)">Recusar vaga</button>
                      }
                    }
                  }
                </li>
              }
            </ul>
          }
        </div>
      </section>
    </main>
  `,
})
export class AvisosPage implements OnInit {
  private readonly api = inject(AvisosService);
  readonly reconfirmationEvent = RECONFIRMATION_EVENT;
  readonly items = signal<Notificacao[]>([]);
  readonly opportunities = signal<Record<number, Oportunidade>>({});
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  respondReconfirmation(item: Notificacao, confirmed: boolean): void {
    this.act(item, this.api.respondReconfirmation(item.causeId, confirmed));
  }

  accept(item: Notificacao): void {
    this.act(item, this.api.acceptOpportunity(item.causeId));
  }

  decline(item: Notificacao): void {
    this.act(item, this.api.declineOpportunity(item.causeId));
  }

  private act(item: Notificacao, command: Observable<unknown>): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    command.pipe(switchMap(() => this.api.markRead(item.id)), finalize(() => this.busy.set(false))).subscribe({
      next: () => this.reload(),
      error: (error: unknown) => {
        this.error.set(extractApiErrorMessage(error, 'Não foi possível concluir a operação.'));
        this.reload(true);
      },
    });
  }

  private reload(keepError = false): void {
    this.loading.set(true);
    this.api.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (all) => {
        const actionable = all.filter((item) => item.eventType === RECONFIRMATION_EVENT || item.eventType === OPPORTUNITY_EVENT);
        this.items.set(actionable);
        this.opportunities.set({});
        for (const item of actionable.filter((entry) => entry.eventType === OPPORTUNITY_EVENT)) {
          this.api.getOpportunity(item.causeId).subscribe({
            next: (opportunity) => this.opportunities.update((current) => ({ ...current, [item.causeId]: opportunity })),
            error: (error: unknown) => this.error.set(extractApiErrorMessage(error, 'Não foi possível carregar a vaga.')),
          });
        }
      },
      error: (error: unknown) => { if (!keepError) this.error.set(extractApiErrorMessage(error, 'Não foi possível carregar os avisos.')); },
    });
  }
}
