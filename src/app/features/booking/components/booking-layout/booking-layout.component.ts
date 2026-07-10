import { Component, input } from '@angular/core';

@Component({
  selector: 'app-booking-layout',
  template: `
    <main class="booking-app">
      <section class="booking-panel">
        <header class="booking-header">
          <div class="booking-brand" [class.booking-brand--logo-only]="!!logoUrl()">
            @if (logoUrl()) {
              <img class="booking-brand__logo" [src]="logoUrl()!" [alt]="companyName() || 'Logo da empresa'" />
            } @else {
              <div class="booking-brand__text">
                <p class="booking-brand__eyebrow">Agendamento online</p>
                <h1>{{ companyName() || 'Agendamento online' }}</h1>
              </div>
            }
          </div>
        </header>

        <ng-content select="[booking-stepper]" />

        <section class="booking-content">
          <ng-content />
        </section>
      </section>

      <ng-content select="[booking-footer]" />
    </main>
  `,
})
export class BookingLayoutComponent {
  readonly companyName = input<string | null>(null);
  readonly logoUrl = input<string | null>(null);
}
