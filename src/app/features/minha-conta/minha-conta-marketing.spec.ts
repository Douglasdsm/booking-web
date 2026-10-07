import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../core/auth/auth-context';
import { MinhaContaMarketingPage } from './pages/minha-conta-marketing-page/minha-conta-marketing.page';

const apiConfig = {
  baseUrl: 'https://api.test',
  endpoints: {},
} as unknown as ApiConfig;

const url = 'https://api.test/v2/me/marketing-consents';

describe('MinhaContaMarketingPage (V2-MC-04)', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MinhaContaMarketingPage],
      providers: [provideRouter([]), { provide: API_CONFIG, useValue: apiConfig }, provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists the companies from the backend, unchecked by default, using the authenticated user context', () => {
    const fixture = TestBed.createComponent(MinhaContaMarketingPage);
    fixture.detectChanges();
    const list = http.expectOne(url);
    expect(list.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    list.flush({ items: [{ esusId: 5, companyName: 'Barbearia Horizonte', granted: false, changedAtUtc: null }] });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Barbearia Horizonte');
    expect((root.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false);
  });

  it('persists a change with PUT and renders the state the backend returned (not the optimistic click)', () => {
    const fixture = TestBed.createComponent(MinhaContaMarketingPage);
    fixture.detectChanges();
    http.expectOne(url).flush({ items: [{ esusId: 5, companyName: 'Barbearia Horizonte', granted: false, changedAtUtc: null }] });
    fixture.detectChanges();
    const box = (fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement;
    box.click();
    const put = http.expectOne(`${url}/5`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ granted: true });
    put.flush({ esusId: 5, companyName: 'Barbearia Horizonte', granted: true, changedAtUtc: '2026-10-07T12:00:00Z' });
    fixture.detectChanges();
    expect(((fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true);
  });

  it('reloads the canonical state when saving fails', () => {
    const fixture = TestBed.createComponent(MinhaContaMarketingPage);
    fixture.detectChanges();
    http.expectOne(url).flush({ items: [{ esusId: 5, companyName: 'Barbearia Horizonte', granted: false }] });
    fixture.detectChanges();
    ((fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    http.expectOne(`${url}/5`).flush({}, { status: 500, statusText: 'err' });
    http.expectOne(url).flush({ items: [{ esusId: 5, companyName: 'Barbearia Horizonte', granted: false }] });
    fixture.detectChanges();
    expect(((fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false);
  });
});
