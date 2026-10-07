import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../core/auth/auth-context';
import { AvisosService } from './avisos.service';

const apiConfig = { baseUrl: 'https://api.test', endpoints: {} } as unknown as ApiConfig;

describe('AvisosService (canonical customer state)', () => {
  let service: AvisosService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: API_CONFIG, useValue: apiConfig }, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AvisosService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('reads reconfirmations, opportunities and waitlist from the canonical personal endpoints with the user context', () => {
    service.listReconfirmations().subscribe();
    service.listOpportunities().subscribe();
    service.listWaitlist().subscribe();
    for (const url of ['/v2/me/booking-reconfirmations', '/v2/me/booking-opportunities', '/v2/me/booking-waitlist']) {
      const req = http.expectOne(`https://api.test${url}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
      req.flush([]);
    }
  });

  it('does not depend on the notification inbox', () => {
    expect((service as unknown as Record<string, unknown>)['list']).toBeUndefined();
    expect((service as unknown as Record<string, unknown>)['markRead']).toBeUndefined();
  });

  it('lists upcoming own bookings through the existing MyBookings contract', () => {
    service.listUpcomingBookings().subscribe();
    const req = http.expectOne((r) => r.url === 'https://api.test/v2/me/bookings');
    expect(req.request.params.get('scope')).toBe('Upcoming');
    expect(req.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    req.flush({ page: 1, pageSize: 50, totalItems: 0, items: [] });
  });

  it('joins and leaves the waitlist with the existing contracts', () => {
    service.joinWaitlist(41).subscribe();
    const join = http.expectOne('https://api.test/v2/booking-waitlist');
    expect(join.request.method).toBe('POST');
    expect(join.request.body).toEqual({ bookingId: 41 });
    join.flush({});
    service.leaveWaitlist(8).subscribe();
    const leave = http.expectOne('https://api.test/v2/booking-waitlist/8');
    expect(leave.request.method).toBe('DELETE');
    leave.flush(null);
  });

  it('responds to a reconfirmation with only the Confirmed flag and decides opportunities by id', () => {
    service.respondReconfirmation(5, true).subscribe();
    const respond = http.expectOne('https://api.test/v2/bookings/reconfirmations/5/respond');
    expect(respond.request.body).toEqual({ confirmed: true });
    respond.flush({});
    service.acceptOpportunity(9).subscribe();
    http.expectOne('https://api.test/v2/booking-opportunities/9/accept').flush({});
    service.declineOpportunity(9).subscribe();
    http.expectOne('https://api.test/v2/booking-opportunities/9/decline').flush(null);
  });
});
