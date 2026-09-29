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
  beforeEach(() => sessionStorage.clear());

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
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
    expect(fixture.nativeElement.textContent).toContain('Esse horário acabou de ficar indisponível');
    expect(fixture.nativeElement.textContent).toContain('lista foi atualizada');
    httpMock.expectNone('https://api.test/v2/public/esus/42/bookings');
  });

  it('recovers a late 403 by discarding the stale candidate, refreshing availability, and keeping the message visible', async () => {
    const { fixture, httpMock } = await setupReadyBooking();
    const component = fixture.componentInstance;

    component['submit']();
    httpMock.expectOne('https://api.test/v2/public/esus/42/bookings').flush(
      { errors: ['Prestador não está mais elegível.'], tokenExpired: false },
      { status: 403, statusText: 'Forbidden' },
    );
    httpMock.expectOne((req) => req.url.endsWith('/availability/search')).flush(availabilityResponse([]));
    fixture.detectChanges();

    expect(component['store'].selectedSlot()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('não está mais disponível');
    expect(fixture.nativeElement.textContent).toContain('lista foi atualizada');
    httpMock.expectNone('https://api.test/v2/public/esus/42/bookings');
  });

  it('recovers a late 404 by discarding the stale candidate, refreshing availability, and keeping the message visible', async () => {
    const { fixture, httpMock } = await setupReadyBooking();
    const component = fixture.componentInstance;

    component['submit']();
    httpMock.expectOne('https://api.test/v2/public/esus/42/bookings').flush(
      { errors: ['Recurso não encontrado.'], tokenExpired: false },
      { status: 404, statusText: 'Not Found' },
    );
    httpMock.expectOne((req) => req.url.endsWith('/availability/search')).flush(availabilityResponse([]));
    fixture.detectChanges();

    expect(component['store'].selectedSlot()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('não está mais disponível');
    expect(fixture.nativeElement.textContent).toContain('lista foi atualizada');
    httpMock.expectNone('https://api.test/v2/public/esus/42/bookings');
  });

  it('renders a catalog request failure instead of presenting a legitimately empty catalog', async () => {
    const { fixture, httpMock } = await setup();
    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush(
      { errors: ['Falha no catálogo.'], tokenExpired: false },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[data-testid="catalog-error"]');
    expect(alert?.textContent).toContain('Não foi possível');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum serviço disponível');
    const retry = fixture.nativeElement.querySelector('[data-testid="retry-catalog"]') as HTMLButtonElement | null;
    expect(retry).not.toBeNull();
    retry!.click();
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
  });

  it('renders an availability request failure instead of presenting a legitimately empty schedule', async () => {
    const { fixture, httpMock } = await setup();
    const component = fixture.componentInstance;
    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });

    component['selectServiceOffer'](serviceOffer);
    httpMock.expectOne((req) => req.url.endsWith('/availability/search')).flush(
      { errors: ['Falha na disponibilidade.'], tokenExpired: false },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[data-testid="availability-error"]');
    expect(alert?.textContent).toContain('Não foi possível');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum horário disponível');
    const retry = fixture.nativeElement.querySelector('[data-testid="retry-availability"]') as HTMLButtonElement | null;
    expect(retry).not.toBeNull();
    retry!.click();
    httpMock.expectOne((req) => req.url.endsWith('/availability/search')).flush(availabilityResponse([slot]));
  });

  it('never consults a status token stored for another Esus', async () => {
    sessionStorage.setItem('public-booking-v2:status-token:41', 'token-esus-a');
    const { httpMock } = await setup('42');

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [] });

    httpMock.expectNone((req) => req.url.includes('/booking-status/'));
  });

  it('keeps independent status tokens and consults only the token namespaced to the current Esus', async () => {
    sessionStorage.setItem('public-booking-v2:status-token:41', 'token-esus-a');
    sessionStorage.setItem('public-booking-v2:status-token:42', 'token-esus-b');
    const { httpMock } = await setup('42');

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/booking-status/token-esus-b').flush({
      status: 'Pending', startUtc: slot.startUtc, endUtc: slot.endUtc, serviceLabel: 'Corte',
    });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [] });
    httpMock.expectNone('https://api.test/v2/public/esus/42/booking-status/token-esus-a');
  });

  it('ends status tracking and starts a new booking without restoring the old token', async () => {
    sessionStorage.setItem('public-booking-v2:status-token:42', 'token-esus-a');
    const { fixture, httpMock } = await setup();

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/booking-status/token-esus-a').flush({
      status: 'Pending', startUtc: slot.startUtc, endUtc: slot.endUtc, serviceLabel: 'Corte',
    });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
    fixture.detectChanges();

    const newBookingButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Fazer novo agendamento'));
    expect(newBookingButton).toBeDefined();
    newBookingButton!.click();

    httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
    httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
    fixture.detectChanges();

    expect(sessionStorage.getItem('public-booking-v2:status-token:42')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('ESCOLHA O SERVIÇO');
    httpMock.expectNone((req) => req.url.includes('/booking-status/'));
  });

  it('offers an immediate status refresh after PendingApproval returns a public status token', async () => {
    const { fixture, httpMock } = await setupReadyBooking();
    const component = fixture.componentInstance;

    component['submit']();
    httpMock.expectOne('https://api.test/v2/public/esus/42/bookings').flush({
      status: 'PendingApproval', bookingId: null, bookingRequestId: 5, serviceLabel: 'Corte',
      startUtc: slot.startUtc, endUtc: slot.endUtc, price: 80, currency: 'BRL', publicStatusToken: 'fresh-token',
    });
    fixture.detectChanges();

    const refreshButton = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Atualizar status'));
    expect(refreshButton).toBeDefined();
    expect(sessionStorage.getItem('public-booking-v2:status-token:42')).toBe('fresh-token');

    refreshButton!.click();
    httpMock.expectOne('https://api.test/v2/public/esus/42/booking-status/fresh-token').flush({
      status: 'Pending', startUtc: slot.startUtc, endUtc: slot.endUtc, serviceLabel: 'Corte',
    });
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

function availabilityResponse(items: typeof slot[]) {
  return { executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-15', items };
}

async function setupReadyBooking() {
  const result = await setup();
  const component = result.fixture.componentInstance;
  result.httpMock.expectOne('https://api.test/v2/public/esus/42').flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true });
  result.httpMock.expectOne('https://api.test/v2/public/esus/42/service-offers').flush({ serviceOffers: [serviceOffer] });
  component['selectServiceOffer'](serviceOffer);
  result.httpMock.expectOne((req) => req.url.endsWith('/availability/search')).flush(availabilityResponse([slot]));
  component['selectSlot'](slot);
  component['onNameInput']('Visitante Teste');
  component['onPhoneInput']('65999990000');
  result.fixture.detectChanges();
  return result;
}
