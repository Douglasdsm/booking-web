import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { API_CONFIG, ApiConfig } from '../../../../core/api/api.config';
import { AuthReturnUrlService } from '../../../../core/auth/auth-return-url.service';
import { PermanentTokenService } from '../../../../core/auth/permanent-token.service';
import { VisitorTokenService } from '../../../../core/auth/visitor-token.service';
import { routes } from '../../../../app.routes';
import { PublicConviteStatus, PublicConviteTipo } from '../../models/public-convite.models';
import { PublicConviteStore } from '../../store/public-convite.store';
import { PublicConvitePage } from './public-convite.page';

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

const baseInvite = {
  empresa: 'Barbearia Exemplo',
  filial: 'Unidade Centro',
  slug: null,
  tipoConvite: PublicConviteTipo.Cliente,
  nomeInformado: 'Joao Silva',
  telefoneMascarado: '(65) *****-9999',
  emailMascarado: 'j***@email.com',
  dataExpiracao: '2026-07-22T23:59:59Z',
  status: PublicConviteStatus.Pendente,
  versaoTermo: 'person-sharing-v1',
  escoposObrigatorios: ['Nome', 'Telefone', 'Email', 'DataNascimento'],
  prestador: null,
};

describe('PublicConvitePage', () => {
  let fixture: ComponentFixture<PublicConvitePage>;
  let httpMock: HttpTestingController;
  let paramMap$: BehaviorSubject<ParamMap>;
  let router: Router;
  let permanentToken: PermanentTokenService;
  let visitorToken: VisitorTokenService;
  let returnUrlService: AuthReturnUrlService;
  let store: PublicConviteStore;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    paramMap$ = new BehaviorSubject(convertToParamMap({ token: 'invite-token' }));

    await TestBed.configureTestingModule({
      imports: [PublicConvitePage],
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$.asObservable() } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicConvitePage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    permanentToken = TestBed.inject(PermanentTokenService);
    visitorToken = TestBed.inject(VisitorTokenService);
    returnUrlService = TestBed.inject(AuthReturnUrlService);
    store = TestBed.inject(PublicConviteStore);
    Object.defineProperty(router, 'url', { configurable: true, value: '/convite/invite-token' });
  });

  afterEach(() => {
    httpMock.verify();
    store.reset();
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('shows pending client invite with masked contacts, scopes and future auth actions', () => {
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush(baseInvite);
    fixture.detectChanges();

    const text = textContent();
    expect(text).toContain('Barbearia Exemplo');
    expect(text).toContain('Unidade Centro');
    expect(text).toContain('(65) *****-9999');
    expect(text).toContain('j***@email.com');
    expect(text).toContain('Nome');
    expect(text).toContain('Telefone');
    expect(text).toContain('E-mail');
    expect(text).toContain('Data de nascimento');
    expect(text).toContain('Para continuar, sera necessario entrar ou criar uma conta.');
    expect(fixture.nativeElement.querySelector('[data-testid="pending-actions"]')).toBeTruthy();
  });

  it('navigates to login and register with a validated return URL', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    httpMock.expectOne('https://api.test/convites/public/invite-token').flush(baseInvite);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('[data-testid="pending-actions"] button');
    buttons[0].click();
    expect(navigateSpy).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { returnUrl: '/convite/invite-token' },
    });
    expect(returnUrlService.consumeReturnUrl()).toBe('/convite/invite-token');

    returnUrlService.setReturnUrl('/convite/invite-token');
    buttons[1].click();
    expect(navigateSpy).toHaveBeenCalledWith(['/cadastrar'], {
      queryParams: { returnUrl: '/convite/invite-token' },
    });
  });

  it('shows pending client acceptance form after authentication with invite name filled', () => {
    permanentToken.setToken('user-token');
    visitorToken.setToken('visitor-token');

    httpMock.expectOne('https://api.test/convites/public/invite-token').flush(baseInvite);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="pending-actions"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid="client-accept-form"]')).toBeTruthy();
    expect((fixture.nativeElement.querySelector('[data-testid="accept-name"]') as HTMLInputElement).value).toBe(
      'Joao Silva',
    );
    expect(textContent()).toContain('A empresa podera consultar somente os dados indicados.');
    expect(textContent()).toContain('Usado somente se sua conta ainda nao possuir um perfil de pessoa.');

    const logoutButton = fixture.nativeElement.querySelector('.secondary-button') as HTMLButtonElement;
    logoutButton.click();
    fixture.detectChanges();

    expect(permanentToken.getToken()).toBeNull();
    expect(visitorToken.getToken()).toBe('visitor-token');
    expect(fixture.nativeElement.querySelector('[data-testid="pending-actions"]')).toBeTruthy();
  });

  it('requires confirmation before accepting and posts normalized client acceptance', () => {
    permanentToken.setToken('user-token');
    visitorToken.setToken('visitor-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush(baseInvite);
    fixture.detectChanges();

    const acceptButton = fixture.nativeElement.querySelector('[data-testid="accept-client-button"]') as HTMLButtonElement;
    expect(acceptButton.disabled).toBe(true);

    const cpf = fixture.nativeElement.querySelector('[data-testid="accept-cpf"]') as HTMLInputElement;
    cpf.value = '12345678909';
    cpf.dispatchEvent(new Event('input'));

    const confirm = fixture.nativeElement.querySelector('[data-testid="accept-confirm"]') as HTMLInputElement;
    confirm.checked = true;
    confirm.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const enabledAcceptButton = fixture.nativeElement.querySelector(
      '[data-testid="accept-client-button"]',
    ) as HTMLButtonElement;
    expect(enabledAcceptButton.disabled).toBe(false);
    (fixture.componentInstance as unknown as { aceitarCliente: () => void }).aceitarCliente();
    expect(store.acceptValidationErrors()).toEqual([]);

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente');
    expect(request.request.body).toEqual({
      nome: 'Joao Silva',
      cpf: '12345678909',
      escoposAutorizados: 23,
      versaoTermo: 'person-sharing-v1',
    });
    request.flush({
      status: PublicConviteStatus.Aceito,
      empresa: 'Barbearia Exemplo',
      filial: 'Unidade Centro',
      nome: 'Joao Silva',
      escoposAutorizados: 23,
      versaoTermo: 'person-sharing-v1',
    });
    fixture.detectChanges();

    const text = textContent();
    expect(text).toContain('Convite aceito. Agora voce esta vinculado como cliente desta empresa.');
    expect(text).toContain('Barbearia Exemplo');
    expect(text).toContain('Unidade Centro');
    expect(text).toContain('Data de nascimento');
    expect(text).not.toContain('pessoaID');
    expect(text).not.toContain('usuarioID');
    expect((fixture.nativeElement.querySelector('[data-testid="accept-cpf"]') as HTMLInputElement | null)).toBeNull();
  });

  it('shows provider configuration without technical IDs', () => {
    permanentToken.setToken('user-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...baseInvite,
      tipoConvite: PublicConviteTipo.Prestador,
      prestador: {
        deveAcessarPainel: true,
        deveAparecerBooking: false,
        role: 'Prestador',
        servicos: ['Corte', 'Barba'],
      },
    });
    fixture.detectChanges();

    const text = textContent();
    expect(text).toContain('Configuracao de prestador');
    expect(text).toContain('Acesso ao painel');
    expect(text).toContain('Exibido no agendamento publico');
    expect(text).toContain('Prestador');
    expect(text).toContain('Corte');
    expect(text).toContain('Barba');
    expect(fixture.nativeElement.querySelector('[data-testid="client-accept-form"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid="provider-accept-form"]')).toBeTruthy();
    expect(text).toContain('Confirmar aceite como prestador');
    expect(text).not.toContain('pessoaJuridicaID');
    expect(text).not.toContain('filialID');
    expect(text).not.toContain('servicoID');
    expect(text).not.toContain('invite-token');
    httpMock.expectNone((request) => request.url.includes('aceitar-cliente'));
    httpMock.expectNone((request) => request.url.includes('aceitar-prestador'));
  });

  it('posts provider acceptance and shows business result without IDs', () => {
    permanentToken.setToken('user-token');
    visitorToken.setToken('visitor-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...baseInvite,
      tipoConvite: PublicConviteTipo.Prestador,
      prestador: {
        deveAcessarPainel: true,
        deveAparecerBooking: true,
        role: 'Prestador',
        servicos: ['Corte', 'Barba'],
      },
    });
    fixture.detectChanges();

    const acceptButton = fixture.nativeElement.querySelector('[data-testid="accept-provider-button"]') as HTMLButtonElement;
    expect(acceptButton.disabled).toBe(true);

    const cpf = fixture.nativeElement.querySelector('[data-testid="accept-provider-cpf"]') as HTMLInputElement;
    cpf.value = '12345678909';
    cpf.dispatchEvent(new Event('input'));
    const confirm = fixture.nativeElement.querySelector('[data-testid="accept-provider-confirm"]') as HTMLInputElement;
    confirm.checked = true;
    confirm.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('[data-testid="accept-provider-button"]') as HTMLButtonElement).disabled).toBe(false);
    (fixture.componentInstance as unknown as { aceitarPrestador: () => void }).aceitarPrestador();

    const request = httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-prestador');
    expect(request.request.body).toEqual({
      nome: 'Joao Silva',
      cpf: '12345678909',
      escoposAutorizados: 23,
      versaoTermo: 'person-sharing-v1',
    });
    expect(request.request.body.role).toBeUndefined();
    expect(request.request.body.servicoIDs).toBeUndefined();
    expect(request.request.body.deveAcessarPainel).toBeUndefined();
    request.flush({
      status: PublicConviteStatus.Aceito,
      empresa: 'Barbearia Exemplo',
      filial: 'Unidade Centro',
      nome: 'Joao Silva',
      deveAcessarPainel: true,
      apareceBooking: true,
      role: 'Prestador',
      servicos: ['Corte', 'Barba'],
      escoposAutorizados: 23,
      versaoTermo: 'person-sharing-v1',
    });
    fixture.detectChanges();

    const text = textContent();
    expect(text).toContain('Convite aceito. Seu vinculo como prestador foi criado para esta empresa.');
    expect(text).toContain('Acesso ao painel');
    expect(text).toContain('Exibido no agendamento publico');
    expect(text).toContain('Servicos vinculados');
    expect(text).toContain('Corte');
    expect(text).not.toContain('pessoaID');
    expect(text).not.toContain('prestadorID');
    expect(fixture.nativeElement.querySelector('[data-testid="accept-provider-cpf"]')).toBeFalsy();
  });

  it('shows backend validation messages near the acceptance form', () => {
    permanentToken.setToken('user-token');
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush(baseInvite);
    fixture.detectChanges();

    const confirm = fixture.nativeElement.querySelector('[data-testid="accept-confirm"]') as HTMLInputElement;
    confirm.checked = true;
    confirm.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    (fixture.componentInstance as unknown as { aceitarCliente: () => void }).aceitarCliente();
    expect(store.acceptValidationErrors()).toEqual([]);
    httpMock.expectOne('https://api.test/convites/public/invite-token/aceitar-cliente').flush(
      { errors: ['CPF invalido'] },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="accept-errors"]')).toBeTruthy();
    expect(textContent()).toContain('CPF invalido');
  });

  it('shows terminal states without auth actions', () => {
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush({
      ...baseInvite,
      status: PublicConviteStatus.Expirado,
    });
    fixture.detectChanges();

    expect(textContent()).toContain('Expirado');
    expect(textContent()).toContain('Este convite passou da data de validade.');
    expect(fixture.nativeElement.querySelector('[data-testid="pending-actions"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid="authenticated-actions"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[data-testid="terminal-message"]')).toBeTruthy();
    httpMock.expectNone((request) => request.url.includes('aceitar-cliente') || request.url.includes('aceitar-prestador'));
  });

  it('shows not found and temporary error states', () => {
    httpMock
      .expectOne('https://api.test/convites/public/invite-token')
      .flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(textContent()).toContain('Convite nao encontrado');

    paramMap$.next(convertToParamMap({ token: 'temporary-token' }));
    httpMock
      .expectOne('https://api.test/convites/public/temporary-token')
      .flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(textContent()).toContain('Nao foi possivel carregar');
  });

  it('keeps a mobile-first shell and fixed action area', () => {
    httpMock.expectOne('https://api.test/convites/public/invite-token').flush(baseInvite);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.public-invite-shell')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.public-invite-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.action-panel')).toBeTruthy();
  });

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

describe('public invite route', () => {
  it('keeps the public invite route without canMatch and applies permanent username enforcement only on activation', () => {
    const route = routes.find((item) => item.path === 'convite/:token');

    expect(route).toBeTruthy();
    expect(route?.canActivate).toBeTruthy();
    expect(route?.canMatch).toBeUndefined();
  });

  it('keeps login and register routes public', () => {
    const loginRoute = routes.find((item) => item.path === 'entrar');
    const registerRoute = routes.find((item) => item.path === 'cadastrar');

    expect(loginRoute).toBeTruthy();
    expect(registerRoute).toBeTruthy();
    expect(loginRoute?.canActivate).toBeUndefined();
    expect(registerRoute?.canActivate).toBeUndefined();
    expect(loginRoute?.canMatch).toBeUndefined();
    expect(registerRoute?.canMatch).toBeUndefined();
  });
});
