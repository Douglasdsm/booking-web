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
    path: '',
    pathMatch: 'full',
    redirectTo: 'agendar/demo',
  },
];
