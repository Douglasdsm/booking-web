import { Component, input } from '@angular/core';

@Component({
  selector: 'app-booking-stepper',
  template: `
    <nav class="booking-stepper" aria-label="Etapas do agendamento">
      <div class="booking-stepper__label">Etapa {{ currentIndex() + 1 }} de {{ total() }}</div>

      <div class="booking-stepper__track" aria-hidden="true">
        @for (item of items(); track item; let index = $index) {
          <span
            class="booking-stepper__item"
            [class.booking-stepper__item--done]="index < currentIndex()"
            [class.booking-stepper__item--active]="index === currentIndex()"
          >
            {{ index + 1 }}
          </span>
        }
      </div>
    </nav>
  `,
})
export class BookingStepperComponent {
  readonly currentIndex = input.required<number>();
  readonly total = input.required<number>();

  protected items(): number[] {
    return Array.from({ length: this.total() }, (_, index) => index);
  }
}
