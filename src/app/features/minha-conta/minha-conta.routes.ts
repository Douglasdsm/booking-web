import { Routes } from '@angular/router';

import { permanentUsernameGuard } from '../../core/auth/permanent-username.guard';
import { MinhaContaPage } from './pages/minha-conta-page/minha-conta.page';
import { MinhaContaDadosPage } from './pages/minha-conta-dados-page/minha-conta-dados.page';
import { MinhaContaAutorizacoesPage } from './pages/minha-conta-autorizacoes-page/minha-conta-autorizacoes.page';
import { MinhaContaAgendamentosPage } from './pages/minha-conta-agendamentos-page/minha-conta-agendamentos.page';
import { MinhaContaMarketingPage } from './pages/minha-conta-marketing-page/minha-conta-marketing.page';

export const MINHA_CONTA_ROUTES: Routes = [
  { path: '', pathMatch: 'full', component: MinhaContaPage, canActivate: [permanentUsernameGuard] },
  { path: 'dados', component: MinhaContaDadosPage, canActivate: [permanentUsernameGuard] },
  { path: 'autorizacoes', component: MinhaContaAutorizacoesPage, canActivate: [permanentUsernameGuard] },
  { path: 'agendamentos', component: MinhaContaAgendamentosPage, canActivate: [permanentUsernameGuard] },
  { path: 'marketing', component: MinhaContaMarketingPage, canActivate: [permanentUsernameGuard] },
];
