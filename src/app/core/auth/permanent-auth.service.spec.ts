import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../api/api.config';
import { authContextInterceptor } from './auth-context.interceptor';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from './auth-context';
import { PermanentAuthService } from './permanent-auth.service';
import { PermanentTokenService } from './permanent-token.service';
import { VisitorTokenService } from './visitor-token.service';

const apiConfig: ApiConfig = {
  baseUrl: 'https://api.test',
  swaggerUrl: 'https://api.test/swagger.json',
  endpoints: {
    bookingConfig: (slug) => `/booking/config/${slug}`,
    bookingTheme: (pessoaJuridicaId) => `/pessoajuridica-booking-theme/public/${pessoaJuridicaId}`,
    services: '/servicoprice',
    professionals: '/prestador/list-prestador',
    availableSlots: '/horariodisponivel',
    visitorUser: '/usuariovisitante',
    login: '/login',
    user: '/usuario',
    booking: '/agendamento',
    publicInvite: (token) => `/convites/public/${token}`,
    acceptClientInvite: (token) => `/convites/public/${token}/aceitar-cliente`,
    acceptProviderInvite: (token) => `/convites/public/${token}/aceitar-prestador`,
  },
};

describe('PermanentAuthService', () => {
  let service: PermanentAuthService;
  let httpMock: HttpTestingController;
  let permanentToken: PermanentTokenService;
  let visitorToken: VisitorTokenService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideHttpClient(withInterceptors([authContextInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PermanentAuthService);
    httpMock = TestBed.inject(HttpTestingController);
    permanentToken = TestBed.inject(PermanentTokenService);
    visitorToken = TestBed.inject(VisitorTokenService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('stores only permanent token after login and sends login as anonymous', () => {
    visitorToken.setToken('visitor-token');

    service.login({ user: 'cliente', senha: 'senha' }).subscribe();

    const request = httpMock.expectOne('https://api.test/login');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ id: 1, user: 'cliente', tokens: { accessToken: 'user-token' } });

    expect(permanentToken.getToken()).toBe('user-token');
    expect(visitorToken.getToken()).toBe('visitor-token');
  });

  it('stores only permanent token after register and sends register as anonymous', () => {
    visitorToken.setToken('visitor-token');

    service
      .register({
        nome: 'Cliente',
        email: 'cliente@example.com',
        phone: '65999999999',
        cpfCnpj: null,
        user: 'cliente',
        senha: 'senha',
      })
      .subscribe();

    const request = httpMock.expectOne('https://api.test/usuario');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ id: 1, user: 'cliente', tokens: { accessToken: 'user-token' } });

    expect(permanentToken.getToken()).toBe('user-token');
    expect(visitorToken.getToken()).toBe('visitor-token');
  });

  it('permanent logout does not remove visitor token', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    service.logout();

    expect(permanentToken.getToken()).toBeNull();
    expect(visitorToken.getToken()).toBe('visitor-token');
  });
});
