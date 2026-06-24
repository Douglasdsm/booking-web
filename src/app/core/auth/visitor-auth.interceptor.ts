import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { VisitorTokenService } from './visitor-token.service';

export const visitorAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(VisitorTokenService).token();

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
