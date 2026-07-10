import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-booking-footer-actions',
  template: `
    <footer class="booking-footer" [class.booking-footer--single]="!showBack()" booking-footer>
      @if (showBack()) {
        <button type="button" class="booking-button booking-button--ghost" [disabled]="backDisabled()" (click)="back.emit()">
          VOLTAR
        </button>
      }

      <button type="button" class="booking-button" [disabled]="continueDisabled()" (click)="continue.emit()">
        {{ continueText() }}
      </button>
    </footer>
  `,
})
export class BookingFooterActionsComponent {
  readonly continueText = input('CONTINUAR');
  readonly continueDisabled = input(false);
  readonly backDisabled = input(false);
  readonly showBack = input(true);
  readonly back = output<void>();
  readonly continue = output<void>();
}
