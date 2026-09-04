import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { API_CONFIG, ApiConfig } from '../../../../core/api/api.config';
import { authContextInterceptor } from '../../../../core/auth/auth-context.interceptor';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../../../core/auth/auth-context';
import { AuthReturnUrlService } from '../../../../core/auth/auth-return-url.service';
import { PermanentTokenService } from '../../../../core/auth/permanent-token.service';
import { VisitorTokenService } from '../../../../core/auth/visitor-token.service';
import { LoginPage } from './login.page';

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

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let httpMock: HttpTestingController;
  let router: Router;
  let visitorToken: VisitorTokenService;
  let permanentToken: PermanentTokenService;
  let returnUrlService: AuthReturnUrlService;

  async function setup(returnUrl: string | null = '/convite/invite-token'): Promise<void> {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) } },
        },
        provideHttpClient(withInterceptors([authContextInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    visitorToken = TestBed.inject(VisitorTokenService);
    permanentToken = TestBed.inject(PermanentTokenService);
    returnUrlService = TestBed.inject(AuthReturnUrlService);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('sends login as Anonymous without visitor or previous permanent token and returns to invite', async () => {
    await setup();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('old-user-token');

    fillLogin('cliente', 'senha');
    submit();
    submit();

    const request = httpMock.expectOne('https://api.test/login');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({ user: 'cliente', senha: 'senha' });
    httpMock.expectNone('https://api.test/login');
    request.flush({ id: 1, user: 'cliente', tokens: { accessToken: 'new-user-token' } });

    expect(permanentToken.getToken()).toBe('new-user-token');
    expect(visitorToken.getToken()).toBe('visitor-token');
    expect(navigateSpy).toHaveBeenCalledWith('/convite/invite-token');
    expect(returnUrlService.consumeReturnUrl()).toBeNull();
  });

  it('shows generic invalid credentials message', async () => {
    await setup();

    fillLogin('cliente', 'senha-errada');
    submit();
    httpMock
      .expectOne('https://api.test/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(textContent()).toContain('Usuario ou senha invalidos.');
  });

  it('uses safe public fallback after direct access without returnUrl', async () => {
    await setup(null);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fillLogin('cliente', 'senha');
    submit();
    httpMock.expectOne('https://api.test/login').flush({
      id: 1,
      user: 'cliente',
      tokens: { accessToken: 'new-user-token' },
    });

    expect(navigateSpy).toHaveBeenCalledWith('/agendar/demo');
  });

  it('redirects temporary username accounts to username definition using the same token', async () => {
    await setup('/convite/invite-token');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fillLogin('cliente@email.com', 'senha');
    submit();
    httpMock.expectOne('https://api.test/login').flush({
      id: 1,
      user: 'cliente@email.com',
      requerDefinicaoUsername: true,
      tokens: { accessToken: 'new-user-token' },
    });

    expect(permanentToken.getToken()).toBe('new-user-token');
    expect(navigateSpy).toHaveBeenCalledWith(['/definir-username'], {
      queryParams: { returnUrl: '/convite/invite-token' },
    });
  });

  it('rejects external returnUrl and uses fallback', async () => {
    await setup('https://evil.test/convite/invite-token');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fillLogin('cliente', 'senha');
    submit();
    httpMock.expectOne('https://api.test/login').flush({
      id: 1,
      user: 'cliente',
      tokens: { accessToken: 'new-user-token' },
    });

    expect(navigateSpy).toHaveBeenCalledWith('/agendar/demo');
  });

  function fillLogin(user: string, senha: string): void {
    fixture.componentInstance['form'].setValue({ user, senha });
    fixture.detectChanges();
  }

  function submit(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  }

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
