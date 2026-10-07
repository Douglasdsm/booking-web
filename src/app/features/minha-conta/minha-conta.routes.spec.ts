import { describe, expect, it } from 'vitest';

import { MINHA_CONTA_ROUTES } from './minha-conta.routes';

describe('Fase 8 - rotas Minha conta', () => {
  it('expõe a área autenticada e as três superfícies de dados pessoais', () => {
    expect(MINHA_CONTA_ROUTES.map((route) => route.path)).toEqual([
      '',
      'dados',
      'autorizacoes',
      'agendamentos',
      'marketing',
    ]);
    expect(MINHA_CONTA_ROUTES.every((route) => route.canActivate?.length)).toBe(true);
  });
});
