import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from './auth-context';
import { PermanentTokenService } from './permanent-token.service';
import { VisitorTokenService } from './visitor-token.service';

export const authContextInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.headers.has('Authorization')) {
    return next(request);
  }

  const authContext = request.context.get(BOOKING_AUTH_CONTEXT);
  const token = getTokenForContext(authContext);

  if (!token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};

function getTokenForContext(authContext: BookingAuthContext): string | null {
  if (authContext === BookingAuthContext.Visitor) {
    return inject(VisitorTokenService).token();
  }

  if (authContext === BookingAuthContext.User) {
    return inject(PermanentTokenService).token();
  }

  return null;
}
