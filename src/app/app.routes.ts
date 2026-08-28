import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'entrar',
    loadComponent: () =>
      import('./features/auth-publica/pages/login-page/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'criar-conta',
    loadComponent: () =>
      import('./features/auth-publica/pages/register-page/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'convite/:token',
    loadComponent: () =>
      import('./features/convites-publicos/pages/public-convite-page/public-convite.page').then(
        (m) => m.PublicConvitePage,
      ),
  },
  {
    path: 'agendar/:slug',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'cliente',
      },
      {
        path: ':etapa',
        loadComponent: () =>
          import('./features/booking/pages/booking-shell/booking-shell.page').then(
            (m) => m.BookingShellPage,
          ),
      },
    ],
  },
  {
    // Phase 37: the minimal V2 public visitor booking client (plan
    // docs/V2/PHASE-37-MINIMAL-BOOKING-CLIENT-V2-PILOT-READINESS-PLAN.md). Routed by EsusId directly,
    // not slug — no safe slug->EsusId HTTP resolution exists yet (registered as a TECHNICAL_GAP in the
    // Phase 37 report rather than invented). Deliberately no auth guard — the V2 flow has no
    // account/token concept at all, the visitor is never authenticated.
    path: 'agendar-v2/:esusId',
    loadComponent: () =>
      import('./features/public-booking-v2/pages/public-booking-v2-page/public-booking-v2.page').then(
        (m) => m.PublicBookingV2Page,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'agendar/demo',
  },
];
