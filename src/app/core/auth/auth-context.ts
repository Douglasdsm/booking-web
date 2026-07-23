import { HttpContext, HttpContextToken } from '@angular/common/http';

export enum BookingAuthContext {
  Anonymous = 'anonymous',
  Visitor = 'visitor',
  User = 'user',
}

export const BOOKING_AUTH_CONTEXT = new HttpContextToken<BookingAuthContext>(
  () => BookingAuthContext.Anonymous,
);

export function bookingAuthContext(authContext: BookingAuthContext): HttpContext {
  return new HttpContext().set(BOOKING_AUTH_CONTEXT, authContext);
}
