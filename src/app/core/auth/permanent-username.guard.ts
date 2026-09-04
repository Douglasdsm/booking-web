import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { PermanentAuthService } from './permanent-auth.service';

export const permanentUsernameGuard: CanActivateFn = (_route, state) => {
  const auth = inject(PermanentAuthService);
  const router = inject(Router);

  if (!auth.hasSession() || state.url.startsWith('/definir-username')) {
    return true;
  }

  return auth.usernameStatus().pipe(
    map((status) => {
      if (status.podeDefinirUsername || status.usernameTemporario) {
        return router.createUrlTree(['/definir-username'], {
          queryParams: { returnUrl: state.url },
        });
      }

      if (status.possuiUsernameDefinitivo) {
        return true;
      }

      return router.createUrlTree(['/definir-username'], {
        queryParams: { returnUrl: state.url, status: 'inconsistente' },
      });
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
        return of(router.createUrlTree(['/entrar'], { queryParams: { returnUrl: state.url } }));
      }

      return of(router.createUrlTree(['/definir-username'], {
        queryParams: { returnUrl: state.url, status: 'erro' },
      }));
    }),
  );
};
