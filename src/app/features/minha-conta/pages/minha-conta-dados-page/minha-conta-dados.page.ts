import { Component, effect, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MinhaContaStore } from '../../minha-conta.store';

@Component({ selector: 'app-minha-conta-dados-page', imports: [FormsModule, RouterLink], providers: [MinhaContaStore], template: `<main class="booking-app"><section class="booking-panel"><a routerLink="/minha-conta">Voltar</a><h1>Meus dados</h1>@if (store.loading()) {<p>Carregando...</p>} @if (store.error()) {<p role="alert">{{ store.error() }}</p>} @if (store.pessoa(); as pessoa) {<form class="booking-form" (ngSubmit)="save()"><label>Nome<input name="nome" [(ngModel)]="nome" required /></label><p>Telefone: {{ pessoa.telefones?.telefones?.[0]?.numeroTelefone || 'Nao informado' }}</p><p>E-mail: {{ pessoa.emails?.emails?.[0]?.enderecoEmail || 'Nao informado' }}</p><button class="booking-button" type="submit" [disabled]="store.saving()">{{ store.saving() ? 'Salvando...' : 'Salvar nome' }}</button></form>}</section></main>` })
export class MinhaContaDadosPage implements OnInit {
  readonly store = inject(MinhaContaStore);
  nome = '';

  constructor() {
    // the backend value is the source of truth: the field mirrors the loaded Pessoa (and what a save returned)
    effect(() => { const pessoa = this.store.pessoa(); if (pessoa) this.nome = pessoa.nome; });
  }
  ngOnInit(): void { this.store.loadPessoa(); }
  save(): void { if (this.nome.trim()) this.store.updateNome(this.nome.trim()); }
}
