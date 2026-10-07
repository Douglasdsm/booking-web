import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MinhaContaStore } from '../../minha-conta.store';

@Component({ selector: 'app-minha-conta-autorizacoes-page', imports: [RouterLink], providers: [MinhaContaStore], template: `<main class="booking-app"><section class="booking-panel"><a routerLink="/minha-conta">Voltar</a><h1>Autorizações de dados</h1>@if (store.loading()) {<p>Carregando...</p>} @if (store.error()) {<p role="alert">{{ store.error() }}</p>} @if (!store.loading() && store.autorizacoes().length === 0) {<p>Nenhuma autorização encontrada.</p>}<ul>@for (item of store.autorizacoes(); track item.id) {<li><strong>Empresa {{ item.pessoaJuridicaID }}</strong><span>Status: {{ item.status }}</span><span>Termo: {{ item.versaoTermo }}</span>@if (item.status !== 'Revogada' && item.status !== 3) {<button type="button" (click)="revoke(item.id)" [disabled]="store.saving()">Revogar</button>}</li>}</ul></section></main>` })
export class MinhaContaAutorizacoesPage implements OnInit {
  readonly store = inject(MinhaContaStore);
  ngOnInit(): void { this.store.loadAutorizacoes(); }
  revoke(id: number): void { this.store.revoke(id); }
}
