import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../../core/api/api.config';
import { authContextInterceptor } from '../../../core/auth/auth-context.interceptor';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../../core/auth/auth-context';
import { PermanentTokenService } from '../../../core/auth/permanent-token.service';
import { VisitorTokenService } from '../../../core/auth/visitor-token.service';
import { PublicConviteService } from './public-convite.service';

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
    publicUserRegister: '/usuario/public/register',
    booking: '/agendamento',
    publicInvite: (token) => `/convites/public/${token}`,
    acceptClientInvite: (token) => `/convites/public/${token}/aceitar-cliente`,
    acceptProviderInvite: (token) => `/convites/public/${token}/aceitar-prestador`,
  },
};

describe('PublicConviteService', () => {
  let service: PublicConviteService;
  let httpMock: HttpTestingController;
  let visitorToken: VisitorTokenService;
  let permanentToken: PermanentTokenService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideHttpClient(withInterceptors([authContextInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(PublicConviteService);
    httpMock = TestBed.inject(HttpTestingController);
    visitorToken = TestBed.inject(VisitorTokenService);
    permanentToken = TestBed.inject(PermanentTokenService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('calls public invite with Anonymous context and without Authorization', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    service.getPublic('invite-token').subscribe();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ status: 1 });
  });

  it('accepts client invite with User context and permanent token only', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    service
      .aceitarCliente('invite-token', {
        nome: 'Joao Silva',
        cpf: '12345678909',
        escoposAutorizados: 7,
        versaoTermo: 'person-sharing-v1',
      })
      .subscribe();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente');
    expect(request.request.method).toBe('POST');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.headers.get('Authorization')).toBe('Bearer user-token');
    expect(request.request.headers.get('Authorization')).not.toContain('visitor-token');
    expect(request.request.body).toEqual({
      nome: 'Joao Silva',
      cpf: '12345678909',
      escoposAutorizados: 7,
      versaoTermo: 'person-sharing-v1',
    });
    expect(request.request.body.pessoaID).toBeUndefined();
    expect(request.request.body.usuarioID).toBeUndefined();
    expect(request.request.body.pessoaJuridicaID).toBeUndefined();
    expect(request.request.body.filialID).toBeUndefined();
    request.flush({ status: 2 });
  });

  it('does not send visitor token as fallback for client acceptance', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.removeToken();

    service
      .aceitarCliente('invite-token', {
        nome: 'Joao Silva',
        cpf: null,
        escoposAutorizados: 1,
        versaoTermo: 'person-sharing-v1',
      })
      .subscribe();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ status: 2 });
  });

  it('accepts provider invite with User context, permanent token only and no operational config', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    service
      .aceitarPrestador('invite-token', {
        nome: 'Maria Silva',
        cpf: '12345678909',
        escoposAutorizados: 7,
        versaoTermo: 'person-sharing-v1',
      })
      .subscribe();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-prestador');
    expect(request.request.method).toBe('POST');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.headers.get('Authorization')).toBe('Bearer user-token');
    expect(request.request.headers.get('Authorization')).not.toContain('visitor-token');
    expect(request.request.body).toEqual({
      nome: 'Maria Silva',
      cpf: '12345678909',
      escoposAutorizados: 7,
      versaoTermo: 'person-sharing-v1',
    });
    expect(request.request.body.pessoaID).toBeUndefined();
    expect(request.request.body.usuarioID).toBeUndefined();
    expect(request.request.body.prestadorID).toBeUndefined();
    expect(request.request.body.pessoaJuridicaID).toBeUndefined();
    expect(request.request.body.filialID).toBeUndefined();
    expect(request.request.body.servicoIDs).toBeUndefined();
    expect(request.request.body.role).toBeUndefined();
    expect(request.request.body.deveAcessarPainel).toBeUndefined();
    expect(request.request.body.deveAparecerBooking).toBeUndefined();
    expect(request.request.body.tipoConvite).toBeUndefined();
    request.flush({ status: 2 });
  });

  it('does not send visitor token as fallback for provider acceptance', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.removeToken();

    service
      .aceitarPrestador('invite-token', {
        nome: 'Maria Silva',
        cpf: null,
        escoposAutorizados: 1,
        versaoTermo: 'person-sharing-v1',
      })
      .subscribe();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-prestador');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ status: 2 });
  });
});
