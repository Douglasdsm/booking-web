import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_CONFIG, ApiConfig } from '../../../core/api/api.config';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../../core/auth/auth-context';
import { BookingThemeService } from './booking-theme.service';
import { BookingApiService } from './booking-api.service';

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

describe('BookingApiService auth context', () => {
  let service: BookingApiService;
  let themeService: BookingThemeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(BookingApiService);
    themeService = TestBed.inject(BookingThemeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('uses anonymous context for public company config', () => {
    service.getConfig('barbearia').subscribe();

    const request = httpMock.expectOne('https://api.test/booking/config/barbearia');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    request.flush({});
  });

  it('uses anonymous context for public services', () => {
    service.getServices(10).subscribe();

    const request = httpMock.expectOne('https://api.test/servicoprice?PessoaJuridicaID=10');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    request.flush({ servicos: [] });
  });

  it('uses anonymous context for visitor creation', () => {
    service.createVisitor({ nome: 'Cliente', telefone: '65999999999' }).subscribe();

    const request = httpMock.expectOne('https://api.test/usuariovisitante');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    request.flush({ nome: 'Cliente', tokens: { accessToken: 'visitor-token' } });
  });

  it('uses anonymous context for public theme', () => {
    themeService.getPublicTheme(10).subscribe();

    const request = httpMock.expectOne('https://api.test/pessoajuridica-booking-theme/public/10');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    request.flush({ pessoaJuridicaID: 10, tema: null });
  });

  it('uses visitor context for protected professionals', () => {
    service.getProfessionals({ pessoaJuridicaID: 10, filialID: 20 }).subscribe();

    const request = httpMock.expectOne('https://api.test/prestador/list-prestador');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Visitor);
    request.flush({ prestadores: [] });
  });

  it('uses visitor context for available slots', () => {
    service.getAvailableSlots({ prestadorId: 1, data: '2026-07-17T00:00:00.000Z', duracaoMinutos: 30 }).subscribe();

    const request = httpMock.expectOne('https://api.test/horariodisponivel');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Visitor);
    request.flush([]);
  });

  it('uses visitor context for booking creation', () => {
    service.createBooking({} as never).subscribe();

    const request = httpMock.expectOne('https://api.test/agendamento');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Visitor);
    request.flush({ id: 1, ordemServicosID: 2 });
  });
});
