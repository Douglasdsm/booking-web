import { Component, input, output } from '@angular/core';

import { BookingProfessional } from '../../models/booking.models';

@Component({
  selector: 'app-booking-profissional-step',
  template: `
    <div class="booking-step">
      <div class="booking-title">
        <h2>ESCOLHA O PROFISSIONAL</h2>
        <p>Selecione quem vai realizar o atendimento.</p>
      </div>

      @if (loading()) {
        <div class="booking-state" aria-live="polite">Carregando profissionais...</div>
      } @else if (error()) {
        <div class="booking-state booking-state--error" role="alert">{{ error() }}</div>
      } @else if (!professionals().length) {
        <div class="booking-state">Nenhum profissional dispon&iacute;vel no momento.</div>
      } @else {
        <div class="booking-card-list" aria-label="Profissionais dispon&iacute;veis">
          @for (professional of professionals(); track professional.id) {
            <button
              type="button"
              class="booking-select-card"
              [class.booking-select-card--selected]="selectedProfessional()?.id === professional.id"
              [attr.aria-pressed]="selectedProfessional()?.id === professional.id"
              (click)="select.emit(professional)"
            >
              @if (professional.url) {
                <img class="booking-avatar" [src]="professional.url" [alt]="professional.nome || 'Profissional'" />
              } @else {
                <span class="booking-avatar booking-avatar--fallback" aria-hidden="true">
                  {{ initial(professional) }}
                </span>
              }

              <span class="booking-card-copy">
                <strong>{{ professional.nome || 'Profissional' }}</strong>
                @if (selectedProfessional()?.id === professional.id) {
                  <small>Selecionado</small>
                }
              </span>

              <span class="booking-card-check" aria-hidden="true">
                {{ selectedProfessional()?.id === professional.id ? '✓' : '' }}
              </span>
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class BookingProfissionalStepComponent {
  readonly professionals = input.required<BookingProfessional[]>();
  readonly selectedProfessional = input<BookingProfessional | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly select = output<BookingProfessional>();

  protected initial(professional: BookingProfessional): string {
    return professional.nome?.trim().charAt(0).toUpperCase() || 'P';
  }
}
