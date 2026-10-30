import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AccountNavComponent } from '../../../../layout/account-nav.component';

@Component({
  selector: 'app-minha-conta-page',
  imports: [RouterLink, AccountNavComponent],
  template: `<main class="booking-app"><section class="booking-panel"><header class="booking-header"><div class="booking-brand"><p class="booking-brand__eyebrow">Conta</p><h1>Minha conta</h1></div><app-account-nav /></header><div class="booking-content"><p>Consulte e controle somente os seus dados, autorizações e agendamentos.</p><nav aria-label="Área da conta" class="booking-form"><a routerLink="/minha-conta/dados" class="booking-button">Meus dados</a><a routerLink="/minha-conta/autorizacoes" class="booking-button">Autorizações de dados</a><a routerLink="/minha-conta/agendamentos" class="booking-button">Meus agendamentos</a><a routerLink="/minha-conta/marketing" class="booking-button">Comunicações de marketing</a></nav></div></section></main>`,
})
export class MinhaContaPage {}
