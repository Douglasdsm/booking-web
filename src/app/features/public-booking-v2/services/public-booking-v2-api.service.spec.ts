import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PUBLIC_BOOKING_V2_API_CONFIG, PublicBookingV2Config } from '../../../core/api/public-booking-v2.api.config';
import { PublicBookingV2ApiService } from './public-booking-v2-api.service';

const config: PublicBookingV2Config = {
  baseUrl: 'https://api.test',
  endpoints: {
    publicEsus: (esusId) => `/v2/public/esus/${esusId}`,
    serviceOffers: (esusId) => `/v2/public/esus/${esusId}/service-offers`,
    availabilitySearch: (esusId) => `/v2/public/esus/${esusId}/availability/search`,
    submitBooking: (esusId) => `/v2/public/esus/${esusId}/bookings`,
  },
};

describe('PublicBookingV2ApiService', () => {
  let service: PublicBookingV2ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PUBLIC_BOOKING_V2_API_CONFIG, useValue: config },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PublicBookingV2ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('maps getPublicEsus to GET /v2/public/esus/{esusId} with no Authorization header', () => {
    service.getPublicEsus(42).subscribe();

    const request = httpMock.expectOne('https://api.test/v2/public/esus/42');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
  });

  it('maps getServiceOffers to GET /v2/public/esus/{esusId}/service-offers', () => {
    service.getServiceOffers(42).subscribe();

    const request = httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ serviceOffers: [] });
  });

  it('maps searchAvailability to GET .../availability/search with the request as query params', () => {
    service
      .searchAvailability(42, { serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15' })
      .subscribe();

    const request = httpMock.expectOne(
      (req) => req.url === 'https://api.test/v2/public/esus/42/availability/search',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('serviceOfferId')).toBe('7');
    expect(request.request.params.get('startDate')).toBe('2027-01-01');
    expect(request.request.params.get('endDate')).toBe('2027-01-15');
    expect(request.request.params.has('prestadorId')).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [] });
  });

  it('includes optional prestadorId/executionLocationId params only when supplied', () => {
    service
      .searchAvailability(42, {
        serviceOfferId: 7,
        startDate: '2027-01-01',
        endDate: '2027-01-15',
        prestadorId: 9,
        executionLocationId: 3,
      })
      .subscribe();

    const request = httpMock.expectOne(
      (req) => req.url === 'https://api.test/v2/public/esus/42/availability/search',
    );
    expect(request.request.params.get('prestadorId')).toBe('9');
    expect(request.request.params.get('executionLocationId')).toBe('3');
    request.flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [] });
  });

  it('maps createPublicBooking to POST .../bookings with the Idempotency-Key header and no authority fields', () => {
    const payload = {
      serviceOfferId: 7,
      executionLocationId: 3,
      prestadorId: 9,
      requestedStartUtc: '2027-01-05T10:00:00Z',
      visitorName: 'Visitante Teste',
      visitorPhone: '65999990000',
    };

    service.createPublicBooking(42, payload, 'key-123').subscribe();

    const request = httpMock.expectOne('https://api.test/v2/public/esus/42/bookings');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('key-123');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual(payload);
    // Structural trust-boundary proof, mirrors CreateBookingV2UseCaseTest's own pattern: the request the
    // client sends has no price/duration/owner/Debtor field to strip.
    expect(Object.keys(request.request.body)).not.toContain('price');
    expect(Object.keys(request.request.body)).not.toContain('effectivePrice');
    expect(Object.keys(request.request.body)).not.toContain('debtorId');
    expect(Object.keys(request.request.body)).not.toContain('ownerEsusId');
    request.flush({
      status: 'Confirmed',
      bookingId: 1,
      bookingRequestId: null,
      serviceLabel: 'Corte',
      startUtc: payload.requestedStartUtc,
      endUtc: '2027-01-05T11:00:00Z',
      price: 80,
      currency: 'BRL',
    });
  });
});
