import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-booking-cliente-step',
  template: `
    <div class="booking-step">
      <div class="booking-title">
        <h2>SEUS DADOS</h2>
        <p>Informe nome e telefone para reservar seu hor&aacute;rio.</p>
      </div>

      <form id="customer-form" class="booking-form" (submit)="$event.preventDefault(); submit.emit()">
        <label class="booking-field">
          <span>Nome</span>
          <input
            type="text"
            autocomplete="name"
            placeholder="Digite seu nome"
            required
            [value]="name()"
            (input)="nameChange.emit($any($event.target).value)"
          />
        </label>

        <label class="booking-field">
          <span>Telefone</span>
          <input
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            placeholder="(00) 00000-0000"
            required
            [value]="phone()"
            (input)="phoneChange.emit($any($event.target).value)"
          />
        </label>
      </form>

      @if (error()) {
        <div class="booking-state booking-state--error" role="alert">{{ error() }}</div>
      }
    </div>
  `,
})
export class BookingClienteStepComponent {
  readonly name = input('');
  readonly phone = input('');
  readonly error = input<string | null>(null);
  readonly nameChange = output<string>();
  readonly phoneChange = output<string>();
  readonly submit = output<void>();
}
