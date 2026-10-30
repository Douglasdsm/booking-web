import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { PUBLIC_BOOKING_V2_API_CONFIG, PublicBookingV2Config } from '../../../../core/api/public-booking-v2.api.config';
import { PublicBookingV2Page } from './public-booking-v2.page';

/**
 * UX-BOOKING-WEB P1-02/P3-02: the public page did not say which company it belongs to (the header repeated "Agendamento
 * online"); the receiving company name is already public by V2-MC-04 (ESUS_SCOPED, `receivingCompanyName`).
 * P2-01: a link to a company that does not exist read "O serviço ou horário selecionado não está mais disponível".
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

async function open(): Promise<{ fixture: ComponentFixture<PublicBookingV2Page>; http: HttpTestingController }> {
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
  fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController) };
}

const text = (fixture: ComponentFixture<unknown>, selector: string) =>
  ((fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent ?? '').trim();

describe('PublicBookingV2Page — company identity and invalid link', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); sessionStorage.clear(); });

  it('names the receiving company in the page header', async () => {
    const { fixture, http } = await open();
    http.expectOne(base).flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true, timeZoneId: 'America/Cuiaba', receivingCompanyName: 'Barbearia Horizonte' });
    http.expectOne(`${base}/service-offers`).flush({ serviceOffers: [] });
    fixture.detectChanges();

    expect(text(fixture, '.booking-brand h1')).toBe('Barbearia Horizonte');
  });

  it('keeps the generic header when the company has no public name', async () => {
    const { fixture, http } = await open();
    http.expectOne(base).flush({ esusId: 42, tipo: 'Empresa', publicBookingEnabled: true, timeZoneId: 'America/Cuiaba' });
    http.expectOne(`${base}/service-offers`).flush({ serviceOffers: [] });
    fixture.detectChanges();

    expect(text(fixture, '.booking-brand h1')).toBe('Agendamento online');
  });

  it('says the booking page was not found when the company does not exist', async () => {
    const { fixture, http } = await open();
    http.expectOne(base).flush({ errors: ['not found'] }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(text(fixture, '[role="alert"]')).toBe('Não encontramos esta página de agendamento. Confira o link recebido.');
  });
});
