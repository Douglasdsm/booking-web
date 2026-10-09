import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { ReservaPage } from './reserva.page';

const apiConfig = { baseUrl: 'https://api.test', endpoints: {} } as unknown as ApiConfig;
const base = 'https://api.test';
const offer = { id: 7, name: 'Corte', description: '', basePrice: 80, baseDurationMinutes: 30 };
const profile = { esusId: 42, tipo: 'Empresa', publicBookingEnabled: true, timeZoneId: 'America/Cuiaba' };
const candidate = {
  serviceOfferId: 7, serviceLabel: 'Corte', prestadorId: 9, prestadorName: 'Ana Souza', executionEsusId: 42,
  executionLocationId: 3, executionLocationName: 'Unidade A', startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z',
  durationMinutes: 30, currentPrice: 80, currency: 'BRL',
};
const hold = (over: object = {}) => ({
  id: 5, serviceOfferId: 7, commercialOwnerEsusId: 42, executionEsusId: 42, executionLocationId: 3, prestadorId: 9,
  startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z', frozenPrice: 80, frozenDurationMinutes: 30, status: 'Active',
  expiresAtUtc: '2027-01-01T10:01:30Z', bookingId: null, guarantee: null, canConfirm: true, serverNowUtc: '2027-01-01T10:00:00Z',
  serviceLabel: 'Corte', prestadorName: 'Ana Souza', executionLocationName: 'Unidade A', ...over,
});
const availability = (items: unknown[]) => ({ executionEsusId: 42, serviceOfferId: 7, startDate: '2027-01-01', endDate: '2027-01-08', items });

describe('ReservaPage (authenticated Hold, V2-MC-02A)', () => {
  let fixture: ComponentFixture<ReservaPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservaPage],
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ esusId: '42' }) } } },
        provideHttpClient(), provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReservaPage);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.useRealTimers(); });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const button = (label: string) => [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as HTMLButtonElement | undefined;

  function boot(holds: unknown[]): void {
    fixture.detectChanges();
    http.expectOne(`${base}/v2/public/esus/42`).flush(profile);
    http.expectOne(`${base}/v2/public/esus/42/service-offers`).flush({ serviceOffers: [offer] });
    http.expectOne(`${base}/v2/me/booking-holds`).flush(holds);
    fixture.detectChanges();
  }
  function pickCandidate(): void {
    button('Corte')!.click();
    http.expectOne((r) => r.url === `${base}/v2/esus/42/availability/search`).flush(availability([candidate]));
    fixture.detectChanges();
    ((fixture.nativeElement as HTMLElement).querySelector('.booking-slot') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('reviews the chosen candidate and creates ONE Hold with the real contract body, then shows the backend Hold', () => {
    boot([]);
    pickCandidate();
    expect(text()).toContain('Ana Souza');
    expect(text()).toContain('Unidade A');
    button('Segurar horário')!.click();
    button('Segurar horário')?.click();
    const create = http.expectOne(`${base}/v2/booking-holds`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ serviceOfferId: 7, executionEsusId: 42, executionLocationId: 3, prestadorId: 9, requestedStartUtc: '2027-01-05T14:00:00Z' });
    create.flush(hold());
    http.expectOne(`${base}/v2/me/booking-holds`).flush([hold()]);
    fixture.detectChanges();
    expect(button('Confirmar reserva')).toBeDefined();
    expect(text()).toContain('Reserva segura até');
  });

  it('rebuilds an active Hold after reload from the canonical listing only, with a countdown derived from the backend clock', () => {
    vi.useFakeTimers({ now: new Date('2030-06-01T00:00:00Z'), toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
    boot([hold()]);
    // browser clock is years away from the backend clock; the countdown must follow the backend deadline
    expect(text()).toContain('Unidade A');
    expect(text()).toContain('Ana Souza');
    const countdown = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="hold-countdown"]') as HTMLElement;
    expect(countdown.textContent).toContain('01:30');
    expect(button('Confirmar reserva')).toBeDefined();
  });

  describe('availability anchoring (V2-FIX-UJ-03)', () => {
    function openOfferBeforeProfile(zone: string, now: string): { search: () => ReturnType<HttpTestingController['expectOne']> } {
      vi.useFakeTimers({ now: new Date(now), toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
      fixture.detectChanges();
      const profileRequest = http.expectOne(`${base}/v2/public/esus/42`);
      http.expectOne(`${base}/v2/public/esus/42/service-offers`).flush({ serviceOffers: [offer] });
      http.expectOne(`${base}/v2/me/booking-holds`).flush([]);
      fixture.detectChanges();
      button('Corte')!.click(); // the service is chosen while the company profile is still on its way
      fixture.detectChanges();
      http.expectNone((r) => r.url.includes('/availability/search')); // INV-UJ03-02: no provisional search
      expect(text()).toContain('Carregando horários');
      profileRequest.flush({ ...profile, timeZoneId: zone });
      return { search: () => http.expectOne((r) => r.url === `${base}/v2/esus/42/availability/search`) };
    }

    it('sends the first search only after the profile, on the company day (21:00 in America/Cuiaba is already the next UTC day)', () => {
      const { search } = openOfferBeforeProfile('America/Cuiaba', '2026-10-11T01:00:00Z');
      const first = search();
      expect(first.request.params.get('StartDate')).toBe('2026-10-10'); // INV-UJ03-01
      expect(first.request.params.get('EndDate')).toBe('2026-10-17');
      first.flush(availability([]));
    });

    it('week navigation is calendar arithmetic on the business day and returns exactly to the first day', () => {
      const { search } = openOfferBeforeProfile('America/Cuiaba', '2026-10-11T03:59:00Z'); // 23:59 local
      search().flush(availability([]));
      fixture.detectChanges();
      button('Próxima semana')!.click();
      const next = search();
      expect(next.request.params.get('StartDate')).toBe('2026-10-17');
      next.flush(availability([]));
      fixture.detectChanges();
      button('Semana anterior')!.click();
      const back = search();
      expect(back.request.params.get('StartDate')).toBe('2026-10-10'); // INV-UJ03-05
      back.flush(availability([]));
    });

    it('is generic: a company ahead of UTC anchors to its own day (00:30 in Pacific/Auckland is still the previous UTC day)', () => {
      const { search } = openOfferBeforeProfile('Pacific/Auckland', '2026-10-10T11:30:00Z'); // 2026-10-11 00:30 local
      const first = search();
      expect(first.request.params.get('StartDate')).toBe('2026-10-11'); // INV-UJ03-06
      first.flush(availability([]));
    });
  });

  it('recognizes an expired Hold from backend state, offers no confirmation and lets the customer choose again', () => {
    boot([hold({ status: 'Expired', canConfirm: false, expiresAtUtc: '2027-01-01T09:59:00Z' })]);
    expect(text()).toContain('Sua reserva expirou');
    expect(button('Confirmar reserva')).toBeUndefined();
    expect(button('Corte')).toBeDefined();
  });

  it('confirms once and reflects the Consumed Hold with a link to the customer bookings', () => {
    boot([hold()]);
    button('Confirmar reserva')!.click();
    button('Confirmar reserva')?.click();
    const confirm = http.expectOne(`${base}/v2/booking-holds/5/confirm`);
    expect(confirm.request.method).toBe('POST');
    confirm.flush({ id: 77 });
    http.expectOne(`${base}/v2/me/booking-holds`).flush([hold({ status: 'Consumed', canConfirm: false, bookingId: 77 })]);
    fixture.detectChanges();
    expect(text()).toContain('Reserva confirmada');
    expect(button('Confirmar reserva')).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/meus-agendamentos"]')).not.toBeNull();
  });

  it('keeps a backend conflict visible on create and refreshes slots and holds from the backend', () => {
    boot([]);
    pickCandidate();
    button('Segurar horário')!.click();
    http.expectOne(`${base}/v2/booking-holds`).flush({ errors: ['CONFIGURATION CONFLICT: Prestador já possui Hold ativo nesse intervalo.'] }, { status: 409, statusText: 'Conflict' });
    http.expectOne(`${base}/v2/me/booking-holds`).flush([]);
    http.expectOne((r) => r.url === `${base}/v2/esus/42/availability/search`).flush(availability([]));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')!.textContent).toContain('Hold ativo');
    expect(button('Segurar horário')).toBeUndefined();
  });

  it('shows the backend error when confirming an expired Hold and reloads the canonical state', () => {
    boot([hold()]);
    button('Confirmar reserva')!.click();
    http.expectOne(`${base}/v2/booking-holds/5/confirm`).flush({ errors: ['CONFIGURATION CONFLICT: Hold expirado.'] }, { status: 409, statusText: 'Conflict' });
    http.expectOne(`${base}/v2/me/booking-holds`).flush([hold({ status: 'Expired', canConfirm: false })]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')!.textContent).toContain('Hold expirado');
    expect(text()).toContain('Sua reserva expirou');
  });
});
