import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'agendar/:slug',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'servicos',
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
