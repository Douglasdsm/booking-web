import { Component, input, output } from '@angular/core';

import { BookingAvailableSlot } from '../../models/booking.models';

export interface BookingDateOption {
  value: string;
  day: string;
  label: string;
  month: string;
}

@Component({
  selector: 'app-booking-data-horario-step',
  template: `
    <div class="booking-step">
      <div class="booking-title">
        <h2>DATA E HOR&Aacute;RIO</h2>
        <p>Escolha seu hor&aacute;rio.</p>
      </div>

      @if (!canChooseSchedule()) {
        <div class="booking-state">Selecione servi&ccedil;o e profissional antes de escolher o hor&aacute;rio.</div>
      } @else {
        <div class="booking-date-strip" aria-label="Datas dispon&iacute;veis">
          @for (date of dates(); track date.value) {
            <button
              type="button"
              class="booking-date-card"
              [class.booking-date-card--selected]="selectedDate() === date.value"
              (click)="dateChange.emit(date.value)"
            >
              <span>{{ date.day }}</span>
              <strong>{{ date.label }}</strong>
              <small>{{ date.month }}</small>
            </button>
          }
        </div>

        @if (loading()) {
          <div class="booking-state" aria-live="polite">Carregando hor&aacute;rios...</div>
        } @else if (error()) {
          <div class="booking-state booking-state--error" role="alert">{{ error() }}</div>
        } @else if (!selectedDate()) {
          <div class="booking-state">Escolha uma data para ver os hor&aacute;rios dispon&iacute;veis.</div>
        } @else if (!slots().length) {
          <div class="booking-state">Nenhum hor&aacute;rio dispon&iacute;vel para esta data.</div>
        } @else {
          <div class="booking-slot-grid" aria-label="Hor&aacute;rios dispon&iacute;veis">
            @for (slot of slots(); track slotKey(slot)) {
              <button
                type="button"
                class="booking-slot"
                [class.booking-slot--selected]="selectedSlotKey() === slotKey(slot)"
                [attr.aria-pressed]="selectedSlotKey() === slotKey(slot)"
                (click)="slotChange.emit(slot)"
              >
                {{ formatSlotTime(slot.horaInicio) }}
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
export class BookingDataHorarioStepComponent {
  readonly dates = input.required<BookingDateOption[]>();
  readonly selectedDate = input<string | null>(null);
  readonly slots = input.required<BookingAvailableSlot[]>();
  readonly selectedSlotKey = input<string | null>(null);
  readonly canChooseSchedule = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly dateChange = output<string>();
  readonly slotChange = output<BookingAvailableSlot>();

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

  protected slotKey(slot: BookingAvailableSlot): string {
    const start =
      typeof slot.horaInicio === 'string'
        ? slot.horaInicio
        : `${slot.horaInicio.ticks}-${slot.horaInicio.hours}-${slot.horaInicio.minutes}`;
    const end =
      typeof slot.horaFim === 'string'
        ? slot.horaFim
        : `${slot.horaFim.ticks}-${slot.horaFim.hours}-${slot.horaFim.minutes}`;

    return `${start}-${end}`;
  }
}
