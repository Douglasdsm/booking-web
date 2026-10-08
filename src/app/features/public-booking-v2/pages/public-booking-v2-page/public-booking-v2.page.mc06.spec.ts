import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { PUBLIC_BOOKING_V2_API_CONFIG, PublicBookingV2Config } from '../../../../core/api/public-booking-v2.api.config';
import { mapPublicBookingError } from '../../services/public-booking-v2-error-mapper';
import { PublicBookingV2Page } from './public-booking-v2.page';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * V2-MC-06 / F-12 + R67: the visitor never confirms silently material conditions different from the ones just reviewed.
 * The backend is the authority (it answers 409 CONDITIONS_CHANGED with the structured values); the page only declares what was
 * reviewed, shows the new values and asks for a NEW confirmation - it never resubmits by itself.
 */
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
const serviceOffer = { id: 7, name: 'Corte', description: 'Corte simples', basePrice: 80, baseDurationMinutes: 30 };
const candidate = {
  serviceOfferId: 7, serviceLabel: 'Corte', prestadorId: 9, prestadorName: 'Ana Souza', executionEsusId: 42,
  executionLocationId: 3, executionLocationName: 'Unidade A', startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z',
  durationMinutes: 30, currentPrice: 80, currency: 'BRL',
};
const changed = (over: object = {}) => ({
  errors: ['CONDITIONS CHANGED: o preço ou a duração mudaram desde a sua revisão; revise os novos valores e confirme novamente.'],
  tokenExpired: false, code: 'CONDITIONS_CHANGED',
  details: { expectedPrice: 80, currentPrice: 95, expectedDurationMinutes: 30, currentDurationMinutes: 45, priceChanged: true, durationChanged: true, ...over },
});

async function withSelectedSlot(): Promise<{ fixture: ComponentFixture<PublicBookingV2Page>; http: HttpTestingController }> {
  await TestBed.configureTestingModule({
    imports: [PublicBookingV2Page],
    providers: [
      provideRouter([]),
      { provide: PUBLIC_BOOKING_V2_API_CONFIG, useValue: config },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ esusId: '42' }) } } },
      provideHttpClient(), provideHttpClientTesting(),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(PublicBookingV2Page);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  http.expectOne(base).flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true, timeZoneId: 'America/Cuiaba', receivingCompanyName: 'Barbearia' });
  http.expectOne(`${base}/service-offers`).flush({ serviceOffers: [serviceOffer] });
  fixture.componentInstance['selectServiceOffer'](serviceOffer);
  http.expectOne((r) => r.url === `${base}/availability/search`).flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-08', items: [candidate] });
  fixture.detectChanges();
  ((fixture.nativeElement as HTMLElement).querySelector('.booking-slot') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { fixture, http };
}

const confirmButton = (fixture: ComponentFixture<unknown>) => [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes('Confirmar agendamento')) as HTMLButtonElement;
const norm = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, ' ');
const text = (fixture: ComponentFixture<unknown>) => (fixture.nativeElement as HTMLElement).textContent ?? '';

function fillAndConfirm(fixture: ComponentFixture<PublicBookingV2Page>): void {
  const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('form input[type="text"], form input[type="tel"]') as NodeListOf<HTMLInputElement>;
  inputs[0].value = 'Visitante'; inputs[0].dispatchEvent(new Event('input'));
  inputs[1].value = '65999990000'; inputs[1].dispatchEvent(new Event('input'));
  fixture.detectChanges();
  confirmButton(fixture).click();
}

describe('PublicBookingV2Page - conditions changed after review (V2-MC-06 / F-12, R67)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); sessionStorage.clear(); });

  it('declares the reviewed price and duration as an expectation on submit (never as authority)', async () => {
    const { fixture, http } = await withSelectedSlot();
    fillAndConfirm(fixture);
    const request = http.expectOne(`${base}/bookings`);
    expect(request.request.body.expectedPrice).toBe(80);
    expect(request.request.body.expectedDurationMinutes).toBe(30);
    request.flush({ status: 'Confirmed', bookingId: 1, serviceLabel: 'Corte', startUtc: candidate.startUtc, endUtc: candidate.endUtc, price: 80 });
  });

  it('on CONDITIONS_CHANGED shows old and new values, books nothing, does not resubmit, and needs a new confirmation that carries the new expectation', async () => {
    const { fixture, http } = await withSelectedSlot();
    fillAndConfirm(fixture);
    http.expectOne(`${base}/bookings`).flush(changed(), { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    const panel = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="conditions-changed"]') as HTMLElement;
    expect(panel).not.toBeNull();
    for (const expected of ['R$ 80,00', 'R$ 95,00', '30 min', '45 min']) expect(norm(panel.textContent)).toContain(expected);
    expect(text(fixture)).not.toContain('AGENDAMENTO CONFIRMADO');
    // the review now shows the new values, and the visitor is still on the same step
    const review = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="selection-review"]') as HTMLElement;
    expect(norm(review.textContent)).toContain('45 min');
    expect(norm(review.textContent)).toContain('R$ 95,00');
    http.expectNone(`${base}/bookings`); // no automatic retry

    confirmButton(fixture).click();
    const retry = http.expectOne(`${base}/bookings`);
    expect(retry.request.body.expectedPrice).toBe(95);
    expect(retry.request.body.expectedDurationMinutes).toBe(45);
    retry.flush({ status: 'Confirmed', bookingId: 2, serviceLabel: 'Corte', startUtc: candidate.startUtc, endUtc: '2027-01-05T14:45:00Z', price: 95 });
    fixture.detectChanges();
    expect(text(fixture)).toContain('AGENDAMENTO CONFIRMADO');
  });

  it('a second change while re-reviewing is shown again with the latest values (price only)', async () => {
    const { fixture, http } = await withSelectedSlot();
    fillAndConfirm(fixture);
    http.expectOne(`${base}/bookings`).flush(changed(), { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    confirmButton(fixture).click();
    http.expectOne(`${base}/bookings`).flush(changed({ expectedPrice: 95, currentPrice: 99, expectedDurationMinutes: 45, currentDurationMinutes: 45, durationChanged: false }), { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="conditions-changed"]') as HTMLElement;
    expect(norm(panel.textContent)).toContain('R$ 99,00');
    expect(text(fixture)).not.toContain('AGENDAMENTO CONFIRMADO');
  });

});

describe('mapPublicBookingError - conditions changed (V2-MC-06)', () => {
  it('classifies the structured 409 and keeps the details; a plain 409 stays a slot conflict', () => {
    const mapped = mapPublicBookingError(new HttpErrorResponse({ status: 409, error: changed() }));
    expect(mapped.kind).toBe('ConditionsChanged');
    expect(mapped.conditions).toEqual({ expectedPrice: 80, currentPrice: 95, expectedDurationMinutes: 30, currentDurationMinutes: 45, priceChanged: true, durationChanged: true });
    expect(mapPublicBookingError(new HttpErrorResponse({ status: 409, error: { errors: ['CONFIGURATION CONFLICT: indisponível.'] } })).kind).toBe('SlotUnavailable');
  });
});
