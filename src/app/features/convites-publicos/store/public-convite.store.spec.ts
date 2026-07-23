import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { API_CONFIG, ApiConfig } from '../../../core/api/api.config';
import { AuthReturnUrlService } from '../../../core/auth/auth-return-url.service';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../../core/auth/auth-context';
import { PermanentTokenService } from '../../../core/auth/permanent-token.service';
import { VisitorTokenService } from '../../../core/auth/visitor-token.service';
import { BookingThemeService } from '../../booking/services/booking-theme.service';
import { PublicConviteStatus, PublicConviteTipo } from '../models/public-convite.models';
import { PublicConviteStore } from './public-convite.store';

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

const pendingInvite = {
  empresa: 'Barbearia Exemplo',
  filial: 'Unidade Centro',
  slug: 'barbearia-exemplo',
  tipoConvite: PublicConviteTipo.Cliente,
  nomeInformado: 'Joao Silva',
  telefoneMascarado: '(65) *****-9999',
  emailMascarado: 'j***@email.com',
  dataExpiracao: '2026-07-22T23:59:59Z',
  status: PublicConviteStatus.Pendente,
  versaoTermo: 'person-sharing-v1',
  escoposObrigatorios: ['Nome', 'Telefone', 'Email'],
  prestador: null,
};

const pendingProviderInvite = {
  ...pendingInvite,
  tipoConvite: PublicConviteTipo.Prestador,
  prestador: {
    deveAcessarPainel: true,
    deveAparecerBooking: false,
    role: 'Prestador',
    servicos: ['Corte', 'Barba'],
  },
};

describe('PublicConviteStore', () => {
  let store: PublicConviteStore;
  let httpMock: HttpTestingController;
  let permanentToken: PermanentTokenService;
  let visitorToken: VisitorTokenService;
  let returnUrlService: AuthReturnUrlService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    store = TestBed.inject(PublicConviteStore);
    httpMock = TestBed.inject(HttpTestingController);
    permanentToken = TestBed.inject(PermanentTokenService);
    visitorToken = TestBed.inject(VisitorTokenService);
    returnUrlService = TestBed.inject(AuthReturnUrlService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    store.reset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads a pending invite and theme by slug anonymously', () => {
    store.load('invite-token');

    const inviteRequest = httpMock.expectOne('https://api.test/convites/public/invite-token');
    expect(inviteRequest.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    inviteRequest.flush(pendingInvite);

    const configRequest = httpMock.expectOne('https://api.test/booking/config/barbearia-exemplo');
    expect(configRequest.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    configRequest.flush({ pessoaJuridicaID: 10, filialID: 20 });

    const themeRequest = httpMock.expectOne('https://api.test/pessoajuridica-booking-theme/public/10');
    expect(themeRequest.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    themeRequest.flush({ pessoaJuridicaID: 10, tema: null });

    expect(store.viewState()).toBe('pending');
    expect(store.convite()?.empresa).toBe('Barbearia Exemplo');
    expect(store.themeLoading()).toBe(false);
  });

  it('maps accepted, rejected, expired and canceled states', () => {
    const cases: Array<[PublicConviteStatus, string]> = [
      [PublicConviteStatus.Aceito, 'accepted'],
      [PublicConviteStatus.Recusado, 'rejected'],
      [PublicConviteStatus.Expirado, 'expired'],
      [PublicConviteStatus.Cancelado, 'canceled'],
    ];

    for (const [status, expectedState] of cases) {
      store.load(`token-${status}`);
      httpMock.expectOne(`https://api.test/convites/public/token-${status}`).flush({
        ...pendingInvite,
        slug: null,
        status,
      });

      expect(store.viewState()).toBe(expectedState);
      store.reset();
    }
  });

  it('maps not found and temporary API errors', () => {
    store.load('missing-token');
    httpMock
      .expectOne('https://api.test/convites/public/missing-token')
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(store.viewState()).toBe('not-found');

    store.load('temporary-token');
    httpMock
      .expectOne('https://api.test/convites/public/temporary-token')
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(store.viewState()).toBe('temporary-error');
  });

  it('rejects empty or invalid tokens without calling the API', () => {
    store.load('');
    expect(store.viewState()).toBe('invalid-token');

    store.load('https:evil');
    expect(store.viewState()).toBe('invalid-token');

    httpMock.expectNone((request) => request.url.includes('/convites/public/'));
  });

  it('falls back to the neutral theme when theme loading fails', () => {
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush(pendingInvite);
    httpMock.expectOne('https://api.test/booking/config/barbearia-exemplo').flush({ pessoaJuridicaID: 10 });
    httpMock
      .expectOne('https://api.test/pessoajuridica-booking-theme/public/10')
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(store.viewState()).toBe('pending');
    expect(store.themeLoading()).toBe(false);
  });

  it('clears state when token changes and avoids duplicate requests for the same loaded token', () => {
    store.load('first-token');
    httpMock.expectOne('https://api.test/convites/public/first-token').flush({ ...pendingInvite, slug: null });

    store.load('first-token');
    httpMock.expectNone('https://api.test/convites/public/first-token');

    store.load('second-token');
    expect(store.convite()).toBeNull();
    expect(store.loading()).toBe(true);
    httpMock.expectOne('https://api.test/convites/public/second-token').flush({ ...pendingInvite, slug: null });
    expect(store.token()).toBe('second-token');
  });

  it('blocks client acceptance without permanent session', () => {
    visitorToken.setToken('visitor-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();

    expect(store.acceptValidationErrors()).toContain('Entre com sua conta para aceitar o convite.');
    httpMock.expectNone((request) => request.url.includes('aceitar-cliente'));
  });

  it('validates required name, confirmation, term version and scopes before accepting', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingInvite,
      slug: null,
      nomeInformado: '',
      versaoTermo: null,
      escoposObrigatorios: ['EscopoInventado'],
    });

    store.aceitarCliente();

    expect(store.acceptValidationErrors()).toContain('Informe seu nome.');
    expect(store.acceptValidationErrors()).toContain('Confirme o compartilhamento dos dados indicados.');
    expect(store.acceptValidationErrors()).toContain('Nao foi possivel confirmar a versao do termo deste convite.');
    expect(store.acceptValidationErrors()).toContain('Nao foi possivel confirmar os dados obrigatorios deste convite.');
    httpMock.expectNone((request) => request.url.includes('aceitar-cliente'));
  });

  it('accepts pending client invite with normalized CPF and required scope flags', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    expect(store.acceptForm().nome).toBe('Joao Silva');
    store.updateCpf('123.456.789-09');
    store.updateTermoConfirmado(true);
    store.aceitarCliente();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.body).toEqual({
      nome: 'Joao Silva',
      cpf: '12345678909',
      escoposAutorizados: 7,
      versaoTermo: 'person-sharing-v1',
    });
    request.flush({
      status: PublicConviteStatus.Aceito,
      empresa: 'Barbearia Exemplo',
      filial: 'Unidade Centro',
      nome: 'Joao Silva',
      escoposAutorizados: 7,
      versaoTermo: 'person-sharing-v1',
    });

    expect(store.viewState()).toBe('accepted');
    expect(store.acceptSuccess()?.empresa).toBe('Barbearia Exemplo');
    expect(store.acceptForm().cpf).toBe('');
    store.aceitarCliente();
    httpMock.expectNone((item) => item.url.includes('aceitar-cliente'));
  });

  it('sends null CPF when it is omitted', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente');
    expect(request.request.body.cpf).toBeNull();
    request.flush({ status: PublicConviteStatus.Aceito, escoposAutorizados: 7 });
  });

  it('does not call client acceptance for provider invite', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingInvite,
      slug: null,
      tipoConvite: PublicConviteTipo.Prestador,
    });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();

    expect(store.acceptValidationErrors()).toContain('Este convite nao e de cliente.');
    httpMock.expectNone((request) => request.url.includes('aceitar-cliente'));
    httpMock.expectNone((request) => request.url.includes('aceitar-prestador'));
  });

  it('blocks provider acceptance without permanent session', () => {
    visitorToken.setToken('visitor-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingProviderInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();

    expect(store.acceptValidationErrors()).toContain('Entre com sua conta para aceitar o convite.');
    httpMock.expectNone((request) => request.url.includes('aceitar-prestador'));
  });

  it('does not call provider acceptance for client invite', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();

    expect(store.acceptValidationErrors()).toContain('Este convite nao e de prestador.');
    httpMock.expectNone((request) => request.url.includes('aceitar-prestador'));
    httpMock.expectNone((request) => request.url.includes('aceitar-cliente'));
  });

  it('validates provider config, confirmation, term version and scopes before accepting', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingProviderInvite,
      slug: null,
      nomeInformado: '',
      versaoTermo: null,
      escoposObrigatorios: ['EscopoInventado'],
      prestador: { deveAcessarPainel: true, deveAparecerBooking: true, role: null, servicos: [] },
    });

    store.aceitarPrestador();

    expect(store.acceptValidationErrors()).toContain('Nao foi possivel confirmar a configuracao profissional deste convite.');
    expect(store.acceptValidationErrors()).toContain('Informe seu nome.');
    expect(store.acceptValidationErrors()).toContain('Confirme o compartilhamento dos dados indicados.');
    expect(store.acceptValidationErrors()).toContain('Nao foi possivel confirmar a versao do termo deste convite.');
    expect(store.acceptValidationErrors()).toContain('Nao foi possivel confirmar os dados obrigatorios deste convite.');
    httpMock.expectNone((request) => request.url.includes('aceitar-prestador'));
  });

  it('blocks provider acceptance when required scopes do not include a valid name scope', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingProviderInvite,
      slug: null,
      escoposObrigatorios: ['Telefone', 'Email'],
    });

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();

    expect(store.acceptValidationErrors()).toContain('Nao foi possivel confirmar os dados obrigatorios deste convite.');
    httpMock.expectNone((request) => request.url.includes('aceitar-prestador'));
  });

  it('accepts pending provider invite with normalized CPF, user context and no operational fields', () => {
    permanentToken.setToken('user-token');
    visitorToken.setToken('visitor-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingProviderInvite, slug: null });

    expect(store.canShowProviderAcceptForm()).toBe(true);
    store.updateCpf('123.456.789-09');
    store.updateTermoConfirmado(true);
    store.updateCpf('123.456.789-09');
    store.aceitarPrestador();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-prestador');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.body).toEqual({
      nome: 'Joao Silva',
      cpf: '12345678909',
      escoposAutorizados: 7,
      versaoTermo: 'person-sharing-v1',
    });
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body.pessoaID).toBeUndefined();
    expect(request.request.body.usuarioID).toBeUndefined();
    expect(request.request.body.prestadorID).toBeUndefined();
    expect(request.request.body.pessoaJuridicaID).toBeUndefined();
    expect(request.request.body.filialID).toBeUndefined();
    expect(request.request.body.servicoIDs).toBeUndefined();
    expect(request.request.body.role).toBeUndefined();
    expect(request.request.body.deveAcessarPainel).toBeUndefined();
    expect(request.request.body.deveAparecerBooking).toBeUndefined();
    request.flush({
      status: PublicConviteStatus.Aceito,
      empresa: 'Barbearia Exemplo',
      filial: 'Unidade Centro',
      nome: 'Joao Silva',
      deveAcessarPainel: true,
      apareceBooking: false,
      role: 'Prestador',
      servicos: ['Corte', 'Barba'],
      escoposAutorizados: 7,
      versaoTermo: 'person-sharing-v1',
    });

    expect(store.viewState()).toBe('accepted');
    expect(store.providerAcceptSuccess()?.servicos).toEqual(['Corte', 'Barba']);
    expect(store.acceptForm().cpf).toBe('');
    expect(permanentToken.getToken()).toBe('user-token');
    expect(visitorToken.getToken()).toBe('visitor-token');
    store.aceitarPrestador();
    httpMock.expectNone((item) => item.url.includes('aceitar-prestador') && item.method === 'POST');
  });

  it('blocks duplicate provider acceptance while request is pending', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingProviderInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();
    store.aceitarPrestador();

    const requests = httpMock.match('https://api.test/convites/public/invite-token/aceitar-prestador');
    expect(requests.length).toBe(1);
    requests[0].flush({ status: PublicConviteStatus.Aceito, escoposAutorizados: 7 });
  });

  it('handles 401 during provider acceptance by removing only permanent token', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    permanentToken.setToken('user-token');
    visitorToken.setToken('visitor-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingProviderInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();
    httpMock
      .expectOne('https://api.test/convites/public/invite-token/aceitar-prestador')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(permanentToken.getToken()).toBeNull();
    expect(visitorToken.getToken()).toBe('visitor-token');
    expect(store.acceptForm().cpf).toBe('');
    expect(store.acceptForm().termoConfirmado).toBe(false);
    expect(returnUrlService.consumeReturnUrl()).toBe('/convite/invite-token');
    expect(navigateSpy).toHaveBeenCalledWith(['/entrar']);
  });

  it('shows provider business validation messages without trying old provider endpoints', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingProviderInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();
    httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-prestador').flush(
      { errors: ['Prestador inativo ou excluido'] },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(store.acceptValidationErrors()).toContain('Prestador inativo ou excluido');
    httpMock.expectNone((request) => request.url.includes('/prestador') && !request.url.includes('aceitar-prestador'));
    httpMock.expectNone((request) => request.url.includes('/usuario') && request.method === 'POST');
  });

  it('reloads provider public invite after stale term or concurrent acceptance', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingProviderInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();
    httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-prestador').flush(
      { message: 'Termo desatualizado' },
      { status: 400, statusText: 'Bad Request' },
    );
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingProviderInvite,
      slug: null,
      versaoTermo: 'person-sharing-v2',
    });

    expect(store.termUpdated()).toBe(true);
    expect(store.acceptForm().termoConfirmado).toBe(false);

    store.updateTermoConfirmado(true);
    store.aceitarPrestador();
    httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-prestador').flush(
      { message: 'Convite ja foi aceito' },
      { status: 409, statusText: 'Conflict' },
    );
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingProviderInvite,
      slug: null,
      status: PublicConviteStatus.Aceito,
    });
    expect(store.viewState()).toBe('accepted');
    expect(store.canShowProviderAcceptForm()).toBe(false);
  });

  it('maps provider acceptance 404 to not found and temporary failure to manual retry', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingProviderInvite, slug: null });

    store.updateCpf('123.456.789-09');
    store.updateTermoConfirmado(true);
    store.aceitarPrestador();
    httpMock
      .expectOne('https://api.test/convites/public/invite-token/aceitar-prestador')
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(store.acceptTemporaryError()).toBe('Houve uma falha temporaria. Tente novamente.');
    expect(store.acceptForm().cpf).toBe('123.456.789-09');

    store.aceitarPrestador();
    httpMock
      .expectOne('https://api.test/convites/public/invite-token/aceitar-prestador')
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(store.viewState()).toBe('not-found');
    expect(store.acceptForm().cpf).toBe('');
  });

  it('blocks duplicate acceptance while request is pending', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();
    store.aceitarCliente();

    const requests = httpMock.match('https://api.test/convites/public/invite-token/aceitar-cliente');
    expect(requests.length).toBe(1);
    requests[0].flush({ status: PublicConviteStatus.Aceito, escoposAutorizados: 7 });
  });

  it('handles 401 by removing only permanent token and registering invite return URL', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    permanentToken.setToken('user-token');
    visitorToken.setToken('visitor-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();
    httpMock
      .expectOne('https://api.test/convites/public/invite-token/aceitar-cliente')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(permanentToken.getToken()).toBeNull();
    expect(visitorToken.getToken()).toBe('visitor-token');
    expect(returnUrlService.consumeReturnUrl()).toBe('/convite/invite-token');
    expect(navigateSpy).toHaveBeenCalledWith(['/entrar']);
    expect(store.acceptValidationErrors()).toContain('Sua sessao expirou. Entre novamente para continuar.');
  });

  it('keeps form filled and shows backend validation messages on 400', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateNome('Nome Corrigido');
    store.updateCpf('111.111.111-11');
    store.updateTermoConfirmado(true);
    store.aceitarCliente();
    httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente').flush(
      { errors: ['CPF invalido'] },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(store.acceptValidationErrors()).toContain('CPF invalido');
    expect(store.acceptForm().nome).toBe('Nome Corrigido');
    expect(store.acceptForm().cpf).toBe('111.111.111-11');
  });

  it('reloads public invite after stale term and requires a new confirmation', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();
    httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente').flush(
      { message: 'Termo desatualizado' },
      { status: 400, statusText: 'Bad Request' },
    );
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingInvite,
      slug: null,
      versaoTermo: 'person-sharing-v2',
    });

    expect(store.termUpdated()).toBe(true);
    expect(store.acceptForm().termoConfirmado).toBe(false);
    httpMock.expectNone((request) => request.url.includes('aceitar-cliente') && request.method === 'POST');
  });

  it('reloads public invite when invite cannot be accepted anymore', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();
    httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente').flush(
      { message: 'Convite ja foi aceito' },
      { status: 400, statusText: 'Bad Request' },
    );
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...pendingInvite,
      slug: null,
      status: PublicConviteStatus.Aceito,
    });

    expect(store.viewState()).toBe('accepted');
    expect(store.canShowClientAcceptForm()).toBe(false);
  });

  it('maps 404 during acceptance to not found and clears stale form data', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateCpf('123.456.789-09');
    store.updateTermoConfirmado(true);
    store.aceitarCliente();
    httpMock
      .expectOne('https://api.test/convites/public/invite-token/aceitar-cliente')
      .flush({}, { status: 404, statusText: 'Not Found' });

    expect(store.viewState()).toBe('not-found');
    expect(store.convite()).toBeNull();
    expect(store.acceptForm().cpf).toBe('');
  });

  it('allows manual retry after temporary acceptance failure', () => {
    permanentToken.setToken('user-token');
    store.load('invite-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({ ...pendingInvite, slug: null });

    store.updateTermoConfirmado(true);
    store.aceitarCliente();
    httpMock
      .expectOne('https://api.test/convites/public/invite-token/aceitar-cliente')
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(store.acceptTemporaryError()).toBe('Houve uma falha temporaria. Tente novamente.');

    store.aceitarCliente();
    httpMock
      .expectOne('https://api.test/convites/public/invite-token/aceitar-cliente')
      .flush({ status: PublicConviteStatus.Aceito, escoposAutorizados: 7 });
    expect(store.viewState()).toBe('accepted');
  });

  it('cleans the acceptance form when token changes', () => {
    permanentToken.setToken('user-token');
    store.load('first-token');
    httpMock.expectOne('https://api.test/convites/public/first-token').flush({ ...pendingInvite, slug: null });
    store.updateCpf('123.456.789-09');
    store.updateTermoConfirmado(true);

    store.load('second-token');

    expect(store.acceptForm().cpf).toBe('');
    expect(store.acceptForm().termoConfirmado).toBe(false);
    httpMock.expectOne('https://api.test/convites/public/second-token').flush({
      ...pendingInvite,
      slug: null,
      nomeInformado: 'Maria Silva',
    });
    expect(store.acceptForm().nome).toBe('Maria Silva');
  });

  it('ignores stale invite responses when the route token changes quickly', () => {
    store.load('first-token');
    const firstRequest = httpMock.expectOne('https://api.test/convites/public/first-token');

    store.load('second-token');
    const secondRequest = httpMock.expectOne('https://api.test/convites/public/second-token');

    secondRequest.flush({
      ...pendingInvite,
      slug: null,
      nomeInformado: 'Maria Silva',
    });
    firstRequest.flush({
      ...pendingInvite,
      slug: null,
      nomeInformado: 'Joao Antigo',
    });

    expect(store.token()).toBe('second-token');
    expect(store.convite()?.nomeInformado).toBe('Maria Silva');
    expect(store.acceptForm().nome).toBe('Maria Silva');
    expect(store.loading()).toBe(false);
  });

  it('does not apply a stale theme after changing to an invite without slug', () => {
    const applyThemeSpy = vi.spyOn(TestBed.inject(BookingThemeService), 'applyTheme');

    store.load('first-token');
    httpMock.expectOne('https://api.test/convites/public/first-token').flush({
      ...pendingInvite,
      slug: 'old-slug',
    });
    const staleConfigRequest = httpMock.expectOne('https://api.test/booking/config/old-slug');

    store.load('second-token');
    httpMock.expectOne('https://api.test/convites/public/second-token').flush({
      ...pendingInvite,
      slug: null,
      nomeInformado: 'Maria Silva',
    });

    staleConfigRequest.flush({ pessoaJuridicaID: 10, filialID: 20 });
    httpMock.expectNone('https://api.test/pessoajuridica-booking-theme/public/10');
    expect(applyThemeSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ corPrimaria: '#111111' }),
    );
    expect(store.convite()?.nomeInformado).toBe('Maria Silva');
  });
});
