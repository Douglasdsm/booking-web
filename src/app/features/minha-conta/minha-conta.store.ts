import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { MinhaContaService } from './minha-conta.service';
import { MeusAgendamentosResponse, MinhaAutorizacao, MinhaPessoa, MinhaPreferenciaMarketing } from './minha-conta.models';

@Injectable()
export class MinhaContaStore {
  private readonly service = inject(MinhaContaService);
  readonly pessoa = signal<MinhaPessoa | null>(null);
  readonly autorizacoes = signal<MinhaAutorizacao[]>([]);
  readonly agendamentos = signal<MeusAgendamentosResponse | null>(null);
  readonly marketing = signal<MinhaPreferenciaMarketing[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasData = computed(() => !!this.pessoa() || this.autorizacoes().length > 0 || !!this.agendamentos());

  loadPessoa(): void {
    this.loading.set(true); this.error.set(null);
    this.service.getPessoa().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (value) => this.pessoa.set(value), error: () => this.error.set('Nao foi possivel carregar seus dados.')
    });
  }

  updateNome(nome: string): void {
    this.saving.set(true); this.error.set(null);
    this.service.updatePessoa(nome).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.pessoa.update((value) => value ? { ...value, nome } : value),
      error: () => this.error.set('Nao foi possivel atualizar seus dados.')
    });
  }

  loadAutorizacoes(): void {
    this.loading.set(true); this.error.set(null);
    this.service.getAutorizacoes().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (value) => this.autorizacoes.set(value.autorizacoes ?? []), error: () => this.error.set('Nao foi possivel carregar suas autorizacoes.')
    });
  }

  revoke(id: number): void {
    this.saving.set(true); this.error.set(null);
    this.service.revogarAutorizacao(id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.autorizacoes.update((items) => items.map((item) => item.id === id ? { ...item, status: 'Revogada' } : item)),
      error: () => this.error.set('Nao foi possivel revogar esta autorizacao.')
    });
  }

  loadMarketing(): void {
    this.loading.set(true); this.error.set(null);
    this.service.getMarketing().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (value) => this.marketing.set(value.items ?? []), error: () => this.error.set('Nao foi possivel carregar suas preferencias de marketing.')
    });
  }

  /** The backend answer is the state: the list is replaced by what the PUT returned, never by the optimistic click. */
  setMarketing(esusId: number, granted: boolean): void {
    this.saving.set(true); this.error.set(null);
    this.service.setMarketing(esusId, granted).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => this.marketing.update((items) => items.map((item) => item.esusId === saved.esusId ? saved : item)),
      error: () => { this.error.set('Nao foi possivel salvar sua preferencia.'); this.loadMarketing(); }
    });
  }

  loadAgendamentos(): void {
    this.loading.set(true); this.error.set(null);
    this.service.getAgendamentos().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (value) => this.agendamentos.set(value), error: () => this.error.set('Nao foi possivel carregar seus agendamentos.')
    });
  }
}
