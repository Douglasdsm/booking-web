import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { MeusAgendamentosPage } from './meus-agendamentos.page';

const apiConfig = { baseUrl: 'https://api.test', endpoints: {} } as unknown as ApiConfig;
const base = 'https://api.test';
const profile = { esusId: 42, tipo: 'Empresa', publicBookingEnabled: true, timeZoneId: 'America/Cuiaba' };
const summary = (over: object = {}) => ({
  bookingId: 41, startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z', currentState: 'Active', serviceLabel: 'Corte',
  serviceOfferId: 7, prestadorId: 9, prestadorName: 'Ana Souza', executionEsusId: 42, executionLocationId: 3, executionLocationName: 'Unidade A',
  hasServiceOrder: false, predecessorBookingId: null, successorBookingId: null, successorReason: null, ...over,
});
const list = (items: unknown[], totalItems = items.length) => ({ page: 1, pageSize: 5, totalItems, items });
const detail = (over: object = {}) => ({
  id: 41, serviceOfferId: 7, commercialOwnerEsusId: 42, executionEsusId: 42, executionLocationId: 3, prestadorId: 9,
  startUtc: '2027-01-05T14:00:00Z', endUtc: '2027-01-05T14:30:00Z', effectivePrice: 80, effectiveDurationMinutes: 30,
  confirmedAtUtc: '2027-01-01T10:00:00Z', customerUsuarioId: 20, customerPessoaId: null, quote: { serviceOfferName: 'Corte', price: 80, currency: 'BRL' }, ...over,
});
const lifecycle = (state = 'Active') => ({
  bookingId: 41, currentState: state, createdAtUtc: '2027-01-01T10:00:00Z', predecessorBookingId: null, successorBookingId: null,
  timeline: [{ occurredAtUtc: '2027-01-01T10:00:00Z', eventType: 'BookingCreated', detail: null }],
});
const candidate = (over: object = {}) => ({
  serviceOfferId: 7, serviceLabel: 'Corte', prestadorId: 9, prestadorName: 'Ana Souza', executionEsusId: 42, executionLocationId: 3,
  executionLocationName: 'Unidade A', startUtc: '2027-01-06T15:00:00Z', endUtc: '2027-01-06T15:30:00Z', durationMinutes: 30, currentPrice: 80, currency: 'BRL', ...over,
});

describe('MeusAgendamentosPage (customer booking lifecycle, V2-MC-02B)', () => {
  let fixture: ComponentFixture<MeusAgendamentosPage>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MeusAgendamentosPage], providers: [provideRouter([]), { provide: API_CONFIG, useValue: apiConfig }, provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    fixture = TestBed.createComponent(MeusAgendamentosPage);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const button = (label: string) => [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) => b.textContent?.includes(label)) as HTMLButtonElement | undefined;
  const bookingsReq = () => http.expectOne((r) => r.url === `${base}/v2/me/bookings`);

  function boot(items: unknown[], total = items.length): void {
    fixture.detectChanges();
    bookingsReq().flush(list(items, total));
    http.expectOne(`${base}/v2/public/esus/42`).flush(profile);
    fixture.detectChanges();
  }
  function open(state = 'Active'): void {
    button('Ver detalhes')!.click();
    http.expectOne(`${base}/v2/bookings/41`).flush(detail());
    http.expectOne(`${base}/v2/bookings/41/lifecycle`).flush(lifecycle(state));
    fixture.detectChanges();
  }
  function reloadAfterAction(items: unknown[], state: string): void {
    bookingsReq().flush(list(items));
    http.expectOne(`${base}/v2/bookings/41`).flush(detail());
    http.expectOne(`${base}/v2/bookings/41/lifecycle`).flush(lifecycle(state));
    fixture.detectChanges();
  }

  it('lists the own upcoming bookings with canonical names in the Esus timezone and paginates through the backend', () => {
    boot([summary()], 7);
    const all = text();
    for (const expected of ['Corte', 'Ana Souza', 'Unidade A', '10:00', '10:30', '05/01/2027']) expect(all).toContain(expected);
    button('Próxima página')!.click();
    const next = bookingsReq();
    expect(next.request.params.get('page')).toBe('2');
    expect(next.request.params.get('scope')).toBe('Upcoming');
    next.flush(list([summary({ bookingId: 42 })], 7));
    fixture.detectChanges();
    expect(button('Página anterior')!.disabled).toBe(false);
  });

  it('switches to the history scope and shows terminal states from the backend', () => {
    boot([summary()]);
    button('Histórico')!.click();
    const history = bookingsReq();
    expect(history.request.params.get('scope')).toBe('History');
    history.flush(list([summary({ currentState: 'Cancelled' }), summary({ bookingId: 43, currentState: 'Rescheduled' })]));
    fixture.detectChanges();
    expect(text()).toContain('Cancelado');
    expect(text()).toContain('Remarcado');
    expect(button('Ver detalhes')).toBeDefined();
  });

  it('opens the detail with price, duration and lifecycle, offering actions only for an Active booking', () => {
    boot([summary()]);
    open('Active');
    const all = text();
    for (const expected of ['Agendamento nº 41', '30 min', 'Agendamento criado']) expect(all).toContain(expected);
    expect(all).toMatch(/R\$\s?80,00/);
    expect(button('Cancelar agendamento')).toBeDefined();
    expect(button('Remarcar')).toBeDefined();
  });

  it('cancels once with an optional reason, then reloads the canonical state without the actions', () => {
    boot([summary()]);
    open();
    button('Cancelar agendamento')!.click();
    fixture.detectChanges();
    button('Confirmar cancelamento')!.click();
    button('Confirmar cancelamento')?.click();
    const cancel = http.expectOne(`${base}/v2/bookings/41/cancel`);
    expect(cancel.request.method).toBe('POST');
    expect(cancel.request.body).toEqual({ reason: null });
    cancel.flush({});
    reloadAfterAction([], 'Cancelled');
    expect(text()).toContain('Cancelado');
    expect(button('Cancelar agendamento')).toBeUndefined();
    expect(button('Remarcar')).toBeUndefined();
  });

  it('keeps a backend error visible when cancel fails and reloads the authoritative state', () => {
    boot([summary()]);
    open();
    button('Cancelar agendamento')!.click();
    fixture.detectChanges();
    button('Confirmar cancelamento')!.click();
    http.expectOne(`${base}/v2/bookings/41/cancel`).flush({ errors: ['CONFIGURATION CONFLICT: ServiceOrder já existe.'] }, { status: 409, statusText: 'Conflict' });
    reloadAfterAction([summary()], 'Active');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')!.textContent).toContain('ServiceOrder');
  });

  it('reschedules by picking a backend candidate for the same service and reloads the new interval', () => {
    boot([summary()]);
    open();
    button('Remarcar')!.click();
    const search = http.expectOne((r) => r.url === `${base}/v2/esus/42/availability/search`);
    expect(search.request.params.get('ServiceOfferId')).toBe('7');
    search.flush({ items: [candidate()] });
    fixture.detectChanges();
    ((fixture.nativeElement as HTMLElement).querySelector('.booking-slot') as HTMLButtonElement).click();
    fixture.detectChanges();
    button('Confirmar remarcação')!.click();
    button('Confirmar remarcação')?.click();
    const move = http.expectOne(`${base}/v2/bookings/41/reschedule`);
    expect(move.request.body).toEqual({ executionLocationId: 3, prestadorId: 9, requestedStartUtc: '2027-01-06T15:00:00Z', reason: null });
    move.flush({});
    reloadAfterAction([summary({ bookingId: 44, startUtc: '2027-01-06T15:00:00Z', endUtc: '2027-01-06T15:30:00Z' })], 'Rescheduled');
    expect(text()).toContain('06/01/2027');
  });

  it('on a reschedule conflict shows the backend error, preserves the original booking and refreshes the candidates', () => {
    boot([summary()]);
    open();
    button('Remarcar')!.click();
    http.expectOne((r) => r.url === `${base}/v2/esus/42/availability/search`).flush({ items: [candidate()] });
    fixture.detectChanges();
    ((fixture.nativeElement as HTMLElement).querySelector('.booking-slot') as HTMLButtonElement).click();
    fixture.detectChanges();
    button('Confirmar remarcação')!.click();
    http.expectOne(`${base}/v2/bookings/41/reschedule`).flush({ errors: ['CONFIGURATION CONFLICT: Prestador já possui reserva confirmada nesse intervalo.'] }, { status: 409, statusText: 'Conflict' });
    reloadAfterAction([summary()], 'Active');
    http.expectOne((r) => r.url === `${base}/v2/esus/42/availability/search`).flush({ items: [] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')!.textContent).toContain('Prestador já possui reserva');
    expect(text()).toContain('10:00');
    expect(button('Confirmar remarcação')).toBeUndefined();
  });
});
