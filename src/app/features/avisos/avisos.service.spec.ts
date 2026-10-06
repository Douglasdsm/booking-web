import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../core/auth/auth-context';
import { AvisosService } from './avisos.service';

const apiConfig = { baseUrl: 'https://api.test', endpoints: {} } as unknown as ApiConfig;

describe('AvisosService', () => {
  let service: AvisosService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: API_CONFIG, useValue: apiConfig }, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AvisosService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('reads the notification inbox with the authenticated user context', () => {
    service.list().subscribe();
    const req = http.expectOne((r) => r.url === 'https://api.test/v2/notifications');
    expect(req.request.params.get('take')).toBe('50');
    expect(req.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    req.flush([]);
  });

  it('responds to a reconfirmation with only the Confirmed flag', () => {
    service.respondReconfirmation(5, true).subscribe();
    const req = http.expectOne('https://api.test/v2/bookings/reconfirmations/5/respond');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ confirmed: true });
    expect(req.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    req.flush({});
  });

  it('reads, accepts and declines an opportunity by id and marks notifications read', () => {
    service.getOpportunity(9).subscribe();
    http.expectOne('https://api.test/v2/booking-opportunities/9').flush({});
    service.acceptOpportunity(9).subscribe();
    const accept = http.expectOne('https://api.test/v2/booking-opportunities/9/accept');
    expect(accept.request.method).toBe('POST');
    accept.flush({});
    service.declineOpportunity(9).subscribe();
    http.expectOne('https://api.test/v2/booking-opportunities/9/decline').flush(null);
    service.markRead(3).subscribe();
    http.expectOne('https://api.test/v2/notifications/3/read').flush(null);
  });
});
