import { Component, input } from '@angular/core';

import { BookingAvailableSlot, BookingProfessional, BookingService } from '../../models/booking.models';

@Component({
  selector: 'app-booking-sucesso-step',
  template: `
    <div class="booking-step">
      <section class="booking-success-card">
        <span class="booking-success-card__icon" aria-hidden="true">✓</span>
        <h2>AGENDAMENTO REALIZADO COM SUCESSO</h2>
        <p>Seu hor&aacute;rio foi reservado.</p>
      </section>

      <section class="booking-summary-card">
        <h3>Resumo</h3>
        @for (service of services(); track service.servicoId) {
          <div class="booking-row">
            <span>{{ service.nome || 'Serviço' }}</span>
            <strong>{{ formatCurrency(service.preco) }}</strong>
          </div>
        }
        <div class="booking-row">
          <span>Profissional</span>
          <strong>{{ professional()?.nome || 'Não informado' }}</strong>
        </div>
        <div class="booking-row">
          <span>Data</span>
          <strong>{{ formatDate(date()) }}</strong>
        </div>
        <div class="booking-row">
          <span>Hor&aacute;rio</span>
          <strong>{{ slot() ? formatSlotTime(slot()!.horaInicio) : 'Não informado' }}</strong>
        </div>
        <div class="booking-row booking-row--total">
          <span>Valor total</span>
          <strong>{{ formatCurrency(totalPrice()) }}</strong>
        </div>
      </section>
    </div>
  `,
})
export class BookingSucessoStepComponent {
  readonly services = input.required<BookingService[]>();
  readonly professional = input<BookingProfessional | null>(null);
  readonly date = input<string | null>(null);
  readonly slot = input<BookingAvailableSlot | null>(null);
  readonly totalPrice = input(0);

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Não informada';
    }

    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`));
  }

  protected formatSlotTime(value: BookingAvailableSlot['horaInicio']): string {
    if (typeof value === 'string') {
      return value.slice(0, 5);
    }

    const totalMinutes =
      value.totalMinutes !== undefined
        ? Math.trunc(value.totalMinutes)
        : (value.hours ?? 0) * 60 + (value.minutes ?? 0);
    const hours = Math.trunc(totalMinutes / 60).toString().padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}
