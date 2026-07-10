import { Component, input, output } from '@angular/core';

import { BookingService } from '../../models/booking.models';

@Component({
  selector: 'app-booking-servico-step',
  template: `
    <div class="booking-step">
      <div class="booking-title">
        <h2>ESCOLHA O SERVI&Ccedil;O</h2>
        <p>Selecione um ou mais servi&ccedil;os para calcular tempo e valor.</p>
      </div>

      @if (loading()) {
        <div class="booking-state" aria-live="polite">Carregando servi&ccedil;os...</div>
      } @else if (error()) {
        <div class="booking-state booking-state--error" role="alert">{{ error() }}</div>
      } @else if (!services().length) {
        <div class="booking-state">Nenhum servi&ccedil;o dispon&iacute;vel no momento.</div>
      } @else {
        <div class="booking-card-list" aria-label="Servi&ccedil;os dispon&iacute;veis">
          @for (service of services(); track service.servicoId) {
            <button
              type="button"
              class="booking-select-card booking-select-card--service"
              [class.booking-select-card--selected]="isSelected(service)"
              [attr.aria-pressed]="isSelected(service)"
              (click)="toggle.emit(service)"
            >
              <span class="booking-card-icon" aria-hidden="true">&#9986;</span>

              <span class="booking-card-copy">
                <strong>{{ service.nome || 'Serviço' }}</strong>
                @if (service.descricao) {
                  <small>{{ service.descricao }}</small>
                }
                <span class="booking-service-meta">
                  <span aria-hidden="true">&#128337;</span>
                  {{ service.duracaoMinutos }} min
                </span>
              </span>

              <span class="booking-price">{{ formatCurrency(service.preco) }}</span>
              <span class="booking-card-check" aria-hidden="true">{{ isSelected(service) ? '✓' : '' }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class BookingServicoStepComponent {
  readonly services = input.required<BookingService[]>();
  readonly selectedServices = input.required<BookingService[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly toggle = output<BookingService>();

  protected isSelected(service: BookingService): boolean {
    return this.selectedServices().some((selected) => selected.servicoId === service.servicoId);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}
