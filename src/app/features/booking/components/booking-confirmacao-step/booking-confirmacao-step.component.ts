import { Component, input } from '@angular/core';

import { BookingAvailableSlot, BookingCustomer, BookingProfessional, BookingService } from '../../models/booking.models';

@Component({
  selector: 'app-booking-confirmacao-step',
  template: `
    <div class="booking-step">
      <div class="booking-title">
        <h2>CONFIRMA&Ccedil;&Atilde;O</h2>
        <p>Revise os dados antes de concluir.</p>
      </div>

      <section class="booking-summary-card">
        <h3>Cliente</h3>
        <div class="booking-row">
          <span>Nome</span>
          <strong>{{ customer()?.nome || 'Não informado' }}</strong>
        </div>
        <div class="booking-row">
          <span>Telefone</span>
          <strong>{{ customer()?.telefone || 'Não informado' }}</strong>
        </div>
      </section>

      <section class="booking-summary-card">
        <h3>Servi&ccedil;o</h3>
        @for (service of services(); track service.servicoId) {
          <div class="booking-row">
            <span>{{ service.nome || 'Serviço' }}</span>
            <strong>{{ service.duracaoMinutos }} min &bull; {{ formatCurrency(service.preco) }}</strong>
          </div>
        }
      </section>

      <section class="booking-summary-card">
        <h3>Atendimento</h3>
        <div class="booking-row">
          <span>Profissional</span>
          <strong>{{ professional()?.nome || 'Não selecionado' }}</strong>
        </div>
        <div class="booking-row">
          <span>Data</span>
          <strong>{{ formatDate(date()) }}</strong>
        </div>
        <div class="booking-row">
          <span>Hor&aacute;rio</span>
          <strong>{{ slot() ? formatSlotTime(slot()!.horaInicio) : 'Não selecionado' }}</strong>
        </div>
      </section>

      <section class="booking-summary-card booking-summary-card--total">
        <div class="booking-row">
          <span>Valor total</span>
          <strong>{{ formatCurrency(totalPrice()) }}</strong>
        </div>
      </section>

      @if (error()) {
        <div class="booking-state booking-state--error" role="alert">{{ error() }}</div>
      }
    </div>
  `,
})
export class BookingConfirmacaoStepComponent {
  readonly customer = input<BookingCustomer | null>(null);
  readonly services = input.required<BookingService[]>();
  readonly professional = input<BookingProfessional | null>(null);
  readonly date = input<string | null>(null);
  readonly slot = input<BookingAvailableSlot | null>(null);
  readonly totalPrice = input(0);
  readonly error = input<string | null>(null);

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Não selecionada';
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
