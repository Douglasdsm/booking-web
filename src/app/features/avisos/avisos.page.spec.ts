import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { AvisosPage } from './avisos.page';

const apiConfig = { baseUrl: 'https://api.test', endpoints: {} } as unknown as ApiConfig;
const base = 'https://api.test';

const reconfirmation = (over: object = {}) => ({ id: 5, bookingId: 41, status: 'Requested', requestedAtUtc: '2026-10-01T10:00:00Z', deadlineUtc: '2026-10-02T12:00:00Z', respondedAtUtc: null, bookingStartUtc: '2026-10-03T14:00:00Z', canRespond: true, ...over });
const opportunity = (over: object = {}) => ({ id: 9, waitlistEntryId: 3, executionEsusId: 13, executionLocationId: 9, prestadorId: 7, startUtc: '2026-10-02T14:00:00Z', endUtc: '2026-10-02T14:30:00Z', status: 'Offered', expiresAtUtc: '2026-10-02T15:00:00Z', ...over });
const waitlist = (over: object = {}) => ({ id: 8, bookingId: 41, requesterUsuarioId: 20, serviceOfferId: 5, executionEsusId: 13, prestadorId: null, executionLocationId: null, status: 'Active', ...over });
const booking = (over: object = {}) => ({ bookingId: 41, startUtc: '2026-10-03T14:00:00Z', endUtc: '2026-10-03T14:30:00Z', currentState: 'Active', serviceLabel: 'Corte', prestadorId: 7, executionEsusId: 13, executionLocationId: 9, hasServiceOrder: false, predecessorBookingId: null, successorBookingId: null, successorReason: null, ...over });
const bookings = (items: unknown[]) => ({ page: 1, pageSize: 50, totalItems: items.length, items });

describe('AvisosPage (canonical state, notification-independent)', () => {
  let fixture: ComponentFixture<AvisosPage>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvisosPage], providers: [{ provide: API_CONFIG, useValue: apiConfig }, provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    fixture = TestBed.createComponent(AvisosPage);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function load(state: { reconfirmations?: unknown[]; opportunities?: unknown[]; waitlist?: unknown[]; bookings?: unknown[] }): void {
    fixture.detectChanges();
    http.expectOne(`${base}/v2/me/booking-reconfirmations`).flush(state.reconfirmations ?? []);
    http.expectOne(`${base}/v2/me/booking-opportunities`).flush(state.opportunities ?? []);
    http.expectOne(`${base}/v2/me/booking-waitlist`).flush(state.waitlist ?? []);
    http.expectOne((r) => r.url === `${base}/v2/me/bookings`).flush(bookings(state.bookings ?? []));
    fixture.detectChanges();
  }
  function reloadAll(state: { reconfirmations?: unknown[]; opportunities?: unknown[]; waitlist?: unknown[]; bookings?: unknown[] }): void {
    http.expectOne(`${base}/v2/me/booking-reconfirmations`).flush(state.reconfirmations ?? []);
    http.expectOne(`${base}/v2/me/booking-opportunities`).flush(state.opportunities ?? []);
    http.expectOne(`${base}/v2/me/booking-waitlist`).flush(state.waitlist ?? []);
    http.expectOne((r) => r.url === `${base}/v2/me/bookings`).flush(bookings(state.bookings ?? []));
    fixture.detectChanges();
  }
  const button = (label: string): HTMLButtonElement | null =>
    [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.includes(label)) ?? null;
  const text = (): string => fixture.nativeElement.textContent as string;

  it('rebuilds reconfirmation and opportunity from backend state alone, showing the real deadline', () => {
    load({ reconfirmations: [reconfirmation()], opportunities: [opportunity()] });
    expect(text()).toContain('Reconfirmação solicitada');
    expect(text()).toContain('02/10/2026 12:00');
    expect(text()).toContain('Vaga disponível');
    expect(button('Confirmar presença')).not.toBeNull();
    expect(button('Aceitar vaga')).not.toBeNull();
  });

  it('shows actions only when the backend says the item is actionable', () => {
    load({ reconfirmations: [reconfirmation({ status: 'Expired', canRespond: false }), reconfirmation({ id: 6, status: 'Confirmed', canRespond: false })], opportunities: [opportunity({ status: 'Expired' })] });
    expect(button('Confirmar presença')).toBeNull();
    expect(button('Aceitar vaga')).toBeNull();
    expect(text()).toContain('Expired');
    expect(text()).toContain('Confirmed');
  });

  it('confirms once, then reloads canonical state', () => {
    load({ reconfirmations: [reconfirmation()] });
    button('Confirmar presença')!.click();
    button('Confirmar presença')?.click();
    const respond = http.expectOne(`${base}/v2/bookings/reconfirmations/5/respond`);
    expect(respond.request.body).toEqual({ confirmed: true });
    respond.flush({});
    reloadAll({ reconfirmations: [reconfirmation({ status: 'Confirmed', canRespond: false })] });
    expect(button('Confirmar presença')).toBeNull();
    expect(text()).toContain('Confirmed');
  });

  it('keeps the backend error visible and reloads authoritative state', () => {
    load({ reconfirmations: [reconfirmation()] });
    button('Não poderei comparecer')!.click();
    http.expectOne(`${base}/v2/bookings/reconfirmations/5/respond`).flush({ errors: ['CONFIGURATION CONFLICT: prazo de reconfirmação expirado.'] }, { status: 409, statusText: 'Conflict' });
    reloadAll({ reconfirmations: [reconfirmation({ status: 'Expired', canRespond: false })] });
    expect((fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement).textContent).toContain('prazo de reconfirmação expirado');
    expect(button('Não poderei comparecer')).toBeNull();
  });

  it('accepts an opportunity and reflects the refreshed status', () => {
    load({ opportunities: [opportunity()] });
    button('Aceitar vaga')!.click();
    http.expectOne(`${base}/v2/booking-opportunities/9/accept`).flush({ id: 77 });
    reloadAll({ opportunities: [opportunity({ status: 'Consumed' })] });
    expect(button('Aceitar vaga')).toBeNull();
    expect(text()).toContain('Consumed');
  });

  it('offers the waitlist only for upcoming Active own bookings and recovers an existing entry after reload', () => {
    load({ bookings: [booking(), booking({ bookingId: 42, currentState: 'Cancelled' })], waitlist: [waitlist()] });
    expect(button('Entrar na lista de espera')).toBeNull();
    expect(button('Sair da lista de espera')).not.toBeNull();
    expect(text()).toContain('Booking #41');
    expect(text()).not.toContain('Booking #42');
  });

  it('joins the waitlist and then leaves it using the recovered entry id', () => {
    load({ bookings: [booking()] });
    button('Entrar na lista de espera')!.click();
    button('Entrar na lista de espera')?.click();
    const join = http.expectOne(`${base}/v2/booking-waitlist`);
    expect(join.request.body).toEqual({ bookingId: 41 });
    join.flush(waitlist());
    reloadAll({ bookings: [booking()], waitlist: [waitlist()] });
    expect(button('Sair da lista de espera')).not.toBeNull();
    button('Sair da lista de espera')!.click();
    http.expectOne(`${base}/v2/booking-waitlist/8`).flush(null);
    reloadAll({ bookings: [booking()], waitlist: [waitlist({ status: 'Cancelled' })] });
    expect(button('Entrar na lista de espera')).not.toBeNull();
    expect(text()).toContain('Cancelled');
  });

  it('shows the backend error when joining the waitlist fails', () => {
    load({ bookings: [booking()] });
    button('Entrar na lista de espera')!.click();
    http.expectOne(`${base}/v2/booking-waitlist`).flush({ errors: ['CONFIGURATION CONFLICT: já existe uma WaitlistEntry ativa para este Booking.'] }, { status: 409, statusText: 'Conflict' });
    reloadAll({ bookings: [booking()], waitlist: [waitlist()] });
    expect((fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement).textContent).toContain('WaitlistEntry ativa');
    expect(button('Sair da lista de espera')).not.toBeNull();
  });
});
