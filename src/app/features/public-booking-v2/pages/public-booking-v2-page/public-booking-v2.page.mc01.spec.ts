import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { PUBLIC_BOOKING_V2_API_CONFIG, PublicBookingV2Config } from '../../../../core/api/public-booking-v2.api.config';
import { PublicBookingV2Page } from './public-booking-v2.page';

/** V2-MC-01: selection/review (prestador, local, price, duration, start/end, timezone, date navigation) and lifecycle-aware status. */

const config: PublicBookingV2Config = {
  baseUrl: 'https://api.test',
  endpoints: {
    publicEsus: (esusId) => `/v2/public/esus/${esusId}`,
    serviceOffers: (esusId) => `/v2/public/esus/${esusId}/service-offers`,
    availabilitySearch: (esusId) => `/v2/public/esus/${esusId}/availability/search`,
    submitBooking: (esusId) => `/v2/public/esus/${esusId}/bookings`,
  },
};
const base = 'https://api.test/v2/public/esus/42';
const profile = { esusId: 42, tipo: 'Empresa', publicBookingEnabled: true, timeZoneId: 'America/Cuiaba' };
const serviceOffer = { id: 7, name: 'Corte', description: 'Corte simples', basePrice: 80, baseDurationMinutes: 30 };
const candidate = (over: object = {}) => ({
  serviceOfferId: 7, serviceLabel: 'Corte', prestadorId: 9, prestadorName: 'Ana Souza', executionEsusId: 42,
  executionLocationId: 3, executionLocationName: 'Unidade A', startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z',
  durationMinutes: 30, currentPrice: 80, currency: 'BRL', ...over,
});
const availability = (items: unknown[]) => ({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-08', items });

async function setup(): Promise<{ fixture: ComponentFixture<PublicBookingV2Page>; http: HttpTestingController }> {
  await TestBed.configureTestingModule({
    imports: [PublicBookingV2Page],
    providers: [
      { provide: PUBLIC_BOOKING_V2_API_CONFIG, useValue: config },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ esusId: '42' }) } } },
      provideHttpClient(), provideHttpClientTesting(),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PublicBookingV2Page);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  return { fixture, http };
}

async function withSlots(items: unknown[]) {
  const ctx = await setup();
  ctx.http.expectOne(base).flush(profile);
  ctx.http.expectOne(`${base}/service-offers`).flush({ serviceOffers: [serviceOffer] });
  ctx.fixture.componentInstance['selectServiceOffer'](serviceOffer);
  ctx.http.expectOne((r) => r.url === `${base}/availability/search`).flush(availability(items));
  ctx.fixture.detectChanges();
  return ctx;
}

async function withStatus(status: object) {
  sessionStorage.setItem('public-booking-v2:status-token:42', 'tok');
  const ctx = await setup();
  ctx.http.expectOne(base).flush(profile);
  ctx.http.expectOne(`${base}/booking-status/tok`).flush(status);
  ctx.http.expectOne(`${base}/service-offers`).flush({ serviceOffers: [] });
  ctx.fixture.detectChanges();
  return ctx;
}

const text = (fixture: ComponentFixture<unknown>): string => (fixture.nativeElement as HTMLElement).textContent ?? '';
const baseStatus = {
  status: 'Accepted', startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z', serviceLabel: 'Corte',
  bookingState: 'Active', rescheduled: false, requestedStartUtc: '2027-01-05T14:00:00Z', requestedEndUtc: '2027-01-05T14:30:00Z',
  frozenPrice: 80, frozenDurationMinutes: 30, effectivePrice: 80, effectiveDurationMinutes: 30, currency: 'BRL',
  holdStatus: null, holdExpiresAtUtc: null, prestadorName: 'Ana Souza', executionLocationName: 'Unidade A',
};

describe('PublicBookingV2Page — selection and review (V2-MC-01)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); sessionStorage.clear(); });

  it('shows prestador, local, start-end in the Esus timezone, duration and price on every candidate, keeping two locations at the same instant distinct', async () => {
    const { fixture } = await withSlots([candidate(), candidate({ executionLocationId: 4, executionLocationName: 'Unidade B' })]);
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.booking-slot')] as HTMLButtonElement[];
    expect(buttons.length).toBe(2);
    const all = text(fixture);
    for (const expected of ['Ana Souza', 'Unidade A', 'Unidade B', '10:00', '10:30', '30 min']) expect(all).toContain(expected);
    expect(all).toMatch(/R\$\s?80,00/);

    buttons[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance['store'].selectedSlot()?.executionLocationId).toBe(4);
    const selected = (fixture.nativeElement as HTMLElement).querySelectorAll('.booking-slot--selected');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toContain('Unidade B');
  });

  it('shows a review of the chosen candidate with service, day, start/end, duration, price, prestador, local and timezone before submit', async () => {
    const { fixture } = await withSlots([candidate()]);
    ((fixture.nativeElement as HTMLElement).querySelector('.booking-slot') as HTMLButtonElement).click();
    fixture.detectChanges();
    const review = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="selection-review"]') as HTMLElement;
    expect(review).not.toBeNull();
    for (const expected of ['Corte', '05/01/2027', '10:00', '10:30', '30 min', 'Ana Souza', 'Unidade A', 'America/Cuiaba']) expect(review.textContent).toContain(expected);
    expect(review.textContent).toMatch(/R\$\s?80,00/);
  });

  it('groups candidates by day in the Esus timezone, not in the browser timezone', async () => {
    const { fixture } = await withSlots([candidate({ startUtc: '2027-01-06T02:00:00Z', endUtc: '2027-01-06T02:30:00Z' })]);
    const heading = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="day-heading"]') as HTMLElement;
    expect(heading.textContent).toContain('05/01/2027');
    expect(text(fixture)).toContain('22:00');
  });

  it('navigates by week, searching the adjacent window, and cannot go before today', async () => {
    const { fixture, http } = await withSlots([candidate()]);
    const button = (label: string) => [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
    expect(button('Semana anterior').disabled).toBe(true);

    button('Próxima semana').click();
    const next = http.expectOne((r) => r.url === `${base}/availability/search`);
    const firstEnd = next.request.params.get('startDate')!;
    const nextEnd = next.request.params.get('endDate')!;
    expect(new Date(`${nextEnd}T00:00:00Z`).getTime() - new Date(`${firstEnd}T00:00:00Z`).getTime()).toBe(7 * 86_400_000);
    next.flush(availability([]));
    fixture.detectChanges();
    expect(button('Semana anterior').disabled).toBe(false);

    button('Semana anterior').click();
    const back = http.expectOne((r) => r.url === `${base}/availability/search`);
    expect(new Date(`${firstEnd}T00:00:00Z`).getTime() - new Date(`${back.request.params.get('startDate')}T00:00:00Z`).getTime()).toBe(7 * 86_400_000);
    back.flush(availability([candidate()]));
    fixture.detectChanges();
    expect(button('Semana anterior').disabled).toBe(true);
  });
});

describe('PublicBookingV2Page — public status follows the canonical Booking (V2-MC-01)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); sessionStorage.clear(); });

  it('Accepted + Active confirms with the effective interval, prestador, local, price and duration', async () => {
    const { fixture } = await withStatus(baseStatus);
    const all = text(fixture);
    expect(all).toContain('AGENDAMENTO CONFIRMADO');
    for (const expected of ['10:00', '10:30', 'Ana Souza', 'Unidade A', '30 min']) expect(all).toContain(expected);
    expect(all).toMatch(/R\$\s?80,00/);
  });

  it('Accepted + Cancelled never reads as confirmed', async () => {
    const { fixture } = await withStatus({ ...baseStatus, bookingState: 'Cancelled' });
    expect(text(fixture)).toContain('AGENDAMENTO CANCELADO');
    expect(text(fixture)).not.toContain('AGENDAMENTO CONFIRMADO');
  });

  it('Accepted + NoShow is reported as an absence, not as confirmed', async () => {
    const { fixture } = await withStatus({ ...baseStatus, bookingState: 'NoShow' });
    expect(text(fixture)).toContain('AUSÊNCIA REGISTRADA');
    expect(text(fixture)).not.toContain('AGENDAMENTO CONFIRMADO');
  });

  it('a rescheduled Booking shows the new interval as confirmed and the originally requested one only as such', async () => {
    const { fixture } = await withStatus({ ...baseStatus, rescheduled: true, startUtc: '2027-01-05T18:00:00Z', endUtc: '2027-01-05T18:30:00Z' });
    const all = text(fixture);
    expect(all).toContain('HORÁRIO ALTERADO');
    expect(all).toContain('14:00');
    expect(all).toContain('Horário originalmente solicitado');
    const confirmed = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="effective-interval"]') as HTMLElement;
    expect(confirmed.textContent).toContain('14:00');
    expect(confirmed.textContent).not.toContain('10:00');
  });

  it('Pending shows the requested interval explicitly as not yet confirmed', async () => {
    const { fixture } = await withStatus({ ...baseStatus, status: 'Pending', bookingState: null, effectivePrice: null, effectiveDurationMinutes: null });
    const all = text(fixture);
    expect(all).toContain('SOLICITAÇÃO EM ANÁLISE');
    expect(all).toContain('Intervalo solicitado');
    expect(all).not.toContain('AGENDAMENTO CONFIRMADO');
  });
});
