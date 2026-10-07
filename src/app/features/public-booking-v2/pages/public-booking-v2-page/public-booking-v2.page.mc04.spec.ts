import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { PUBLIC_BOOKING_V2_API_CONFIG, PublicBookingV2Config } from '../../../../core/api/public-booking-v2.api.config';
import { PublicBookingV2Page } from './public-booking-v2.page';

/**
 * V2-MC-04: the data-use notice (informational, names the receiving company, NOT an acceptance), the independent
 * optional marketing opt-in, and the optional account call-to-action after booking.
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
const profile = { esusId: 42, tipo: 'Empresa', publicBookingEnabled: true, timeZoneId: 'America/Cuiaba', receivingCompanyName: 'Barbearia Horizonte' };
const serviceOffer = { id: 7, name: 'Corte', description: 'Corte simples', basePrice: 80, baseDurationMinutes: 30 };
const candidate = {
  serviceOfferId: 7, serviceLabel: 'Corte', prestadorId: 9, prestadorName: 'Ana Souza', executionEsusId: 42,
  executionLocationId: 3, executionLocationName: 'Unidade A', startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z',
  durationMinutes: 30, currentPrice: 80, currency: 'BRL',
};

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
  http.expectOne(base).flush(profile);
  http.expectOne(`${base}/service-offers`).flush({ serviceOffers: [serviceOffer] });
  fixture.componentInstance['selectServiceOffer'](serviceOffer);
  http.expectOne((r) => r.url === `${base}/availability/search`).flush({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-08', items: [candidate] });
  fixture.detectChanges();
  ((fixture.nativeElement as HTMLElement).querySelector('.booking-slot') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { fixture, http };
}

const confirmButton = (fixture: ComponentFixture<unknown>) => [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes('Confirmar agendamento')) as HTMLButtonElement;
const el = (fixture: ComponentFixture<unknown>, selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector) as HTMLElement | null;

function fillAndSubmit(fixture: ComponentFixture<PublicBookingV2Page>): void {
  const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('form input[type="text"], form input[type="tel"]') as NodeListOf<HTMLInputElement>;
  inputs[0].value = 'Visitante'; inputs[0].dispatchEvent(new Event('input'));
  inputs[1].value = '65999990000'; inputs[1].dispatchEvent(new Event('input'));
  fixture.detectChanges();
  confirmButton(fixture).click();
}

describe('PublicBookingV2Page — privacy notice, marketing and optional account (V2-MC-04)', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); sessionStorage.clear(); });

  it('shows an informational data-use notice naming the receiving company at the point of collection, with no acceptance control', async () => {
    const { fixture } = await withSelectedSlot();
    const notice = el(fixture, '[data-testid="privacy-notice"]');
    expect(notice).not.toBeNull();
    expect(notice!.textContent).toContain('Barbearia Horizonte');
    expect(notice!.textContent).toMatch(/nome e telefone/i);
    expect(notice!.querySelector('input')).toBeNull();
  });

  it('offers marketing as a separate, optional, unchecked opt-in that never blocks the booking', async () => {
    const { fixture } = await withSelectedSlot();
    const marketing = el(fixture, '[data-testid="marketing-optin"]') as HTMLInputElement | null;
    expect(marketing).not.toBeNull();
    expect(marketing!.type).toBe('checkbox');
    expect(marketing!.checked).toBe(false);
    expect(marketing!.required).toBe(false);
    expect(el(fixture, '[data-testid="privacy-notice"]')!.contains(marketing)).toBe(false);

    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('form input[type="text"], form input[type="tel"]') as NodeListOf<HTMLInputElement>;
    inputs[0].value = 'Visitante'; inputs[0].dispatchEvent(new Event('input'));
    inputs[1].value = '65999990000'; inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton(fixture).disabled).toBe(false);
  });

  it('sends marketingOptIn=false by default and true only when the visitor ticks the box', async () => {
    const first = await withSelectedSlot();
    fillAndSubmit(first.fixture);
    const declined = first.http.expectOne(`${base}/bookings`);
    expect(declined.request.body.marketingOptIn).toBe(false);
    declined.flush({ status: 'Confirmed', bookingId: 1, serviceLabel: 'Corte', startUtc: candidate.startUtc, endUtc: candidate.endUtc, price: 80 });
    TestBed.resetTestingModule();

    const second = await withSelectedSlot();
    const box = el(second.fixture, '[data-testid="marketing-optin"]') as HTMLInputElement;
    box.click();
    second.fixture.detectChanges();
    fillAndSubmit(second.fixture);
    const accepted = second.http.expectOne(`${base}/bookings`);
    expect(accepted.request.body.marketingOptIn).toBe(true);
    accepted.flush({ status: 'Confirmed', bookingId: 2, serviceLabel: 'Corte', startUtc: candidate.startUtc, endUtc: candidate.endUtc, price: 80 });
  });

  it('after booking, offers an optional account that does not claim this booking automatically', async () => {
    const { fixture, http } = await withSelectedSlot();
    fillAndSubmit(fixture);
    http.expectOne(`${base}/bookings`).flush({ status: 'Confirmed', bookingId: 1, serviceLabel: 'Corte', startUtc: candidate.startUtc, endUtc: candidate.endUtc, price: 80 });
    fixture.detectChanges();
    const cta = el(fixture, '[data-testid="optional-account"]');
    expect(cta).not.toBeNull();
    expect(cta!.textContent).toMatch(/opcional/i);
    expect(cta!.textContent).toMatch(/não.*(vincul|import)/i);
    expect(cta!.querySelector('a[href="/cadastrar"]')).not.toBeNull();
    expect(el(fixture, '.booking-success-card')).not.toBeNull(); // the booking is already complete without an account
  });
});
