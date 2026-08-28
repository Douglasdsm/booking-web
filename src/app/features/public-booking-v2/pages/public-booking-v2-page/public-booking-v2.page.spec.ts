import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { PUBLIC_BOOKING_V2_API_CONFIG, PublicBookingV2Config } from '../../../../core/api/public-booking-v2.api.config';
import { PublicBookingV2Page } from './public-booking-v2.page';

const config: PublicBookingV2Config = {
  baseUrl: 'https://api.test',
  endpoints: {
    publicEsus: (esusId) => `/v2/public/esus/${esusId}`,
    serviceOffers: (esusId) => `/v2/public/esus/${esusId}/service-offers`,
    availabilitySearch: (esusId) => `/v2/public/esus/${esusId}/availability/search`,
    submitBooking: (esusId) => `/v2/public/esus/${esusId}/bookings`,
  },
};

const serviceOffer = { id: 7, name: 'Corte', description: 'Corte simples', basePrice: 80, baseDurationMinutes: 60 };
const slot = {
  serviceOfferId: 7,
  serviceLabel: 'Corte',
  prestadorId: 9,
  executionEsusId: 42,
  executionLocationId: 3,
  startUtc: '2027-01-05T10:00:00Z',
  endUtc: '2027-01-05T11:00:00Z',
  durationMinutes: 60,
  currentPrice: 80,
  currency: 'BRL',
};

async function setup(esusId = '42'): Promise<{ fixture: ComponentFixture<PublicBookingV2Page>; httpMock: HttpTestingController }> {
  await TestBed.configureTestingModule({
    imports: [PublicBookingV2Page],
    providers: [
      { provide: PUBLIC_BOOKING_V2_API_CONFIG, useValue: config },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ esusId }) } } },
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(PublicBookingV2Page);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();

  return { fixture, httpMock };
}

describe('PublicBookingV2Page', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the disabled state and never renders a usable booking flow when PublicBookingEnabled is false', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: false });
    fixture.detectChanges();

    expect(component['store'].publicBookingEnabled()).toBe(false);
    httpMock.expectNone('https://api.test/v2/public/esus/42/service-offers');
  });

  it('loads service offers once PublicBookingEnabled is true', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
    fixture.detectChanges();

    expect(component['store'].serviceOffers()).toEqual([serviceOffer]);
  });

  it('selecting a service loads availability, and selecting a slot generates a fresh idempotency key', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });

    component['selectServiceOffer'](serviceOffer);
    httpMock
      .expectOne((req) => req.url === 'https://api.test/v2/public/esus/42/availability/search')
      .flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [slot] });
    fixture.detectChanges();

    expect(component['store'].availabilityItems()).toEqual([slot]);
  });

  it('reports AutoConfirm result as Confirmed, not as a pending request', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
    component['selectServiceOffer'](serviceOffer);
    httpMock
      .expectOne((req) => req.url === 'https://api.test/v2/public/esus/42/availability/search')
      .flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [slot] });

    component['selectSlot'](slot);
    component['onNameInput']('Visitante Teste');
    component['onPhoneInput']('65999990000');
    component['submit']();

    const submitRequest = httpMock.expectOne('https://api.test/v2/public/esus/42/bookings');
    expect(submitRequest.request.headers.has('Idempotency-Key')).toBe(true);
    submitRequest.flush({
      status: 'Confirmed',
      bookingId: 1,
      bookingRequestId: null,
      serviceLabel: 'Corte',
      startUtc: slot.startUtc,
      endUtc: slot.endUtc,
      price: 80,
      currency: 'BRL',
    });
    fixture.detectChanges();

    expect(component['store'].submitStatus()).toBe('success');
    expect(component['store'].result()?.status).toBe('Confirmed');
  });

  it('reports ManualApproval result as PendingApproval, never rendered as confirmed', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
    component['selectServiceOffer'](serviceOffer);
    httpMock
      .expectOne((req) => req.url === 'https://api.test/v2/public/esus/42/availability/search')
      .flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [slot] });

    component['selectSlot'](slot);
    component['onNameInput']('Visitante Teste');
    component['onPhoneInput']('65999990000');
    component['submit']();

    httpMock.expectOne('https://api.test/v2/public/esus/42/bookings').flush({
      status: 'PendingApproval',
      bookingId: null,
      bookingRequestId: 5,
      serviceLabel: 'Corte',
      startUtc: slot.startUtc,
      endUtc: slot.endUtc,
      price: 80,
      currency: 'BRL',
    });
    fixture.detectChanges();

    expect(component['store'].result()?.status).toBe('PendingApproval');
    expect(component['store'].result()?.bookingId).toBeNull();
  });

  it('on a slot conflict (409), refreshes availability and clears the stale selected slot instead of retrying automatically', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
    component['selectServiceOffer'](serviceOffer);
    httpMock
      .expectOne((req) => req.url === 'https://api.test/v2/public/esus/42/availability/search')
      .flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [slot] });

    component['selectSlot'](slot);
    component['onNameInput']('Visitante Teste');
    component['onPhoneInput']('65999990000');
    component['submit']();

    httpMock.expectOne('https://api.test/v2/public/esus/42/bookings').flush(
      { errors: ['CONFIGURATION CONFLICT: indisponível.'], tokenExpired: false },
      { status: 409, statusText: 'Conflict' },
    );

    // Refresh triggered automatically — but no automatic re-submission of the create command.
    httpMock
      .expectOne((req) => req.url === 'https://api.test/v2/public/esus/42/availability/search')
      .flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [] });
    fixture.detectChanges();

    expect(component['store'].submitError()?.kind).toBe('SlotUnavailable');
    expect(component['store'].selectedSlot()).toBeNull();
    httpMock.expectNone('https://api.test/v2/public/esus/42/bookings');
  });

  it('double-submit: a second click while submitting is a structural no-op — no second HTTP call', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
    component['selectServiceOffer'](serviceOffer);
    httpMock
      .expectOne((req) => req.url === 'https://api.test/v2/public/esus/42/availability/search')
      .flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items: [slot] });

    component['selectSlot'](slot);
    component['onNameInput']('Visitante Teste');
    component['onPhoneInput']('65999990000');

    component['submit']();
    // Second call before the first resolves — canSubmit() is false while submitting, so this must be a no-op.
    component['submit']();

    httpMock.expectOne('https://api.test/v2/public/esus/42/bookings'); // exactly one request in flight
  });
});
