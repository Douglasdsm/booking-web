import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { AvisosPage } from './avisos.page';

const apiConfig = { baseUrl: 'https://api.test', endpoints: {} } as unknown as ApiConfig;
const reconfirmation = { id: 1, eventType: 'BookingReconfirmationRequired', causeType: 'BookingReconfirmation', causeId: 5, createdAtUtc: '2026-10-01T10:00:00Z', isRead: false, readAtUtc: null };
const opportunity = { id: 2, eventType: 'BookingOpportunityOffered', causeType: 'BookingOpportunity', causeId: 9, createdAtUtc: '2026-10-01T11:00:00Z', isRead: false, readAtUtc: null };
const other = { id: 3, eventType: 'BookingCancelled', causeType: 'BookingCancellation', causeId: 1, createdAtUtc: '2026-10-01T09:00:00Z', isRead: false, readAtUtc: null };
const offered = (status: string) => ({ id: 9, waitlistEntryId: 3, executionEsusId: 13, executionLocationId: 9, prestadorId: 7, startUtc: '2026-10-02T14:00:00Z', endUtc: '2026-10-02T14:30:00Z', status, expiresAtUtc: '2026-10-02T15:00:00Z' });

describe('AvisosPage', () => {
  let fixture: ComponentFixture<AvisosPage>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvisosPage], providers: [{ provide: API_CONFIG, useValue: apiConfig }, provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    fixture = TestBed.createComponent(AvisosPage);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function load(items: unknown[]): void {
    fixture.detectChanges();
    http.expectOne((r) => r.url === 'https://api.test/v2/notifications').flush(items);
    fixture.detectChanges();
  }
  function button(label: string): HTMLButtonElement | null {
    return [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent?.includes(label)) ?? null;
  }

  it('shows only actionable notifications and the authoritative opportunity detail', () => {
    load([reconfirmation, opportunity, other]);
    http.expectOne('https://api.test/v2/booking-opportunities/9').flush(offered('Offered'));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Reconfirmação solicitada');
    expect(text).toContain('Vaga disponível');
    expect(text).not.toContain('BookingCancelled');
    expect(button('Aceitar vaga')).not.toBeNull();
  });

  it('confirms a reconfirmation once, marks it read and reloads server truth', () => {
    load([reconfirmation]);
    button('Confirmar presença')!.click();
    button('Confirmar presença')?.click();
    const respond = http.expectOne('https://api.test/v2/bookings/reconfirmations/5/respond');
    expect(respond.request.body).toEqual({ confirmed: true });
    respond.flush({ id: 5, status: 'Confirmed' });
    http.expectOne('https://api.test/v2/notifications/1/read').flush(null);
    http.expectOne((r) => r.url === 'https://api.test/v2/notifications').flush([{ ...reconfirmation, isRead: true }]);
    fixture.detectChanges();
    expect(button('Confirmar presença')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Respondido');
  });

  it('keeps a backend error visible and does not mark the notification read', () => {
    load([reconfirmation]);
    button('Não poderei comparecer')!.click();
    http.expectOne('https://api.test/v2/bookings/reconfirmations/5/respond').flush({ errors: ['CONFIGURATION CONFLICT: prazo de reconfirmação expirado.'] }, { status: 409, statusText: 'Conflict' });
    http.expectOne((r) => r.url === 'https://api.test/v2/notifications').flush([reconfirmation]);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement).textContent).toContain('prazo de reconfirmação expirado');
  });

  it('accepts an opportunity and then shows the refreshed terminal status without actions', () => {
    load([opportunity]);
    http.expectOne('https://api.test/v2/booking-opportunities/9').flush(offered('Offered'));
    fixture.detectChanges();
    button('Aceitar vaga')!.click();
    http.expectOne('https://api.test/v2/booking-opportunities/9/accept').flush({ id: 77 });
    http.expectOne('https://api.test/v2/notifications/2/read').flush(null);
    http.expectOne((r) => r.url === 'https://api.test/v2/notifications').flush([{ ...opportunity, isRead: true }]);
    http.expectOne('https://api.test/v2/booking-opportunities/9').flush(offered('Consumed'));
    fixture.detectChanges();
    expect(button('Aceitar vaga')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Consumed');
  });
});
