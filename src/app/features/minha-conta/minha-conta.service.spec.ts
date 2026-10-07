import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../core/api/api.config';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../core/auth/auth-context';
import { MinhaContaService } from './minha-conta.service';

const apiConfig: ApiConfig = {
  baseUrl: 'https://api.test',
  endpoints: {
    bookingConfig: (slug) => `/booking/config/${slug}`,
    bookingTheme: (id) => `/theme/${id}`,
    services: '/services', professionals: '/professionals', availableSlots: '/slots',
    visitorUser: '/visitor', login: '/login', user: '/usuario', publicUserRegister: '/register', booking: '/booking',
    publicInvite: (token) => `/convites/public/${token}`,
    acceptClientInvite: (token) => `/convites/public/${token}/aceitar-cliente`,
    acceptProviderInvite: (token) => `/convites/public/${token}/aceitar-prestador`,
  },
};

describe('MinhaContaService', () => {
  let service: MinhaContaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      { provide: API_CONFIG, useValue: apiConfig }, provideHttpClient(), provideHttpClientTesting(),
    ] });
    service = TestBed.inject(MinhaContaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the authenticated context for personal data and authorizations', () => {
    service.getPessoa().subscribe();
    const pessoa = http.expectOne('https://api.test/me/pessoa');
    expect(pessoa.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    pessoa.flush({ pessoaID: 1, nome: 'Cliente' });

    service.getAutorizacoes().subscribe();
    const auth = http.expectOne('https://api.test/me/autorizacoes');
    expect(auth.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    auth.flush({ autorizacoes: [] });
  });

  it('uses self-scoped booking query and never sends a user id', () => {
    service.getAgendamentos().subscribe();
    const request = http.expectOne((item) => item.url === 'https://api.test/v2/me/bookings');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.urlWithParams).not.toMatch(/usuario|pessoaID/i);
    request.flush({ page: 1, pageSize: 50, totalItems: 0, items: [] });
  });
});
