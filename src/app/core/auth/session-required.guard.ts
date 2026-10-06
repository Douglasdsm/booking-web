import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermanentAuthService } from './permanent-auth.service';

/**
 * FE-V2-07: pages that call authenticated V2 endpoints require a browser session; the backend still
 * authorizes every call. During SSR the browser session (localStorage) does not exist, so the guard
 * never decides there and the client re-evaluates it on hydration.
 */
export const sessionRequiredGuard: CanActivateFn = (_route, state) => {
  if (isPlatformServer(inject(PLATFORM_ID))) return true;
  const auth = inject(PermanentAuthService);
  const router = inject(Router);
  return auth.hasSession() ? true : router.createUrlTree(['/entrar'], { queryParams: { returnUrl: state.url } });
};
