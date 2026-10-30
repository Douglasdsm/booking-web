import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { PermanentAuthService } from '../core/auth/permanent-auth.service';

/** UX-BOOKING-WEB P1-05: links between the account areas and a way to end the session (shared device). */
@Component({
  selector: 'app-account-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `<nav class="account-nav" aria-label="Navegação da conta"><a routerLink="/meus-agendamentos" routerLinkActive="account-nav__link--active" ariaCurrentWhenActive="page" class="account-nav__link">Agendamentos</a><a routerLink="/meus-avisos" routerLinkActive="account-nav__link--active" ariaCurrentWhenActive="page" class="account-nav__link">Avisos</a><a routerLink="/minha-conta" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="account-nav__link--active" ariaCurrentWhenActive="page" class="account-nav__link">Minha conta</a><button type="button" class="account-nav__logout" (click)="logout()">Sair da conta</button></nav>`,
  styles: `
    .account-nav { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; margin-top: 0.75rem; font-size: 0.875rem; }
    .account-nav__link { color: var(--booking-primary); font-weight: 700; text-decoration: underline; text-underline-offset: 0.2em; }
    .account-nav__link--active { text-decoration: none; }
    .account-nav__logout { margin-left: auto; min-height: 2.75rem; padding: 0 0.75rem; border: 1px solid currentColor; border-radius: 0.375rem; background: transparent; color: var(--booking-primary); font: inherit; font-weight: 700; cursor: pointer; }
  `,
})
export class AccountNavComponent {
  private readonly auth = inject(PermanentAuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/entrar');
  }
}
