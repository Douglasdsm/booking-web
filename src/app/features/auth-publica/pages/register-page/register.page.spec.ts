import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { API_CONFIG, ApiConfig } from '../../../../core/api/api.config';
import { authContextInterceptor } from '../../../../core/auth/auth-context.interceptor';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../../../core/auth/auth-context';
import { PermanentTokenService } from '../../../../core/auth/permanent-token.service';
import { VisitorTokenService } from '../../../../core/auth/visitor-token.service';
import { RegisterPage } from './register.page';

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

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let httpMock: HttpTestingController;
  let router: Router;
  let visitorToken: VisitorTokenService;
  let permanentToken: PermanentTokenService;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/convite/invite-token' }) },
          },
        },
        provideHttpClient(withInterceptors([authContextInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterPage);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    visitorToken = TestBed.inject(VisitorTokenService);
    permanentToken = TestBed.inject(PermanentTokenService);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sends register as Anonymous without tokens, strips masks and returns to invite', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('old-user-token');

    fillRegister({ senha: 'senha123', confirmacaoSenha: 'senha123' });
    submit();
    submit();

    const request = httpMock.expectOne('https://api.test/usuario/public/register');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.Anonymous);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body).toEqual({
      username: 'joao.silva',
      nome: 'Joao Silva',
      email: 'joao@email.com',
      telefone: '65999999999',
      senha: 'senha123',
      confirmacaoSenha: 'senha123',
      aceitouTermos: true,
      aceitouPoliticaPrivacidade: true,
    });
    httpMock.expectNone('https://api.test/usuario/public/register');
    request.flush({ id: 1, user: 'joao', tokens: { accessToken: 'new-user-token' } });

    expect(permanentToken.getToken()).toBe('new-user-token');
    expect(visitorToken.getToken()).toBe('visitor-token');
    expect(navigateSpy).toHaveBeenCalledWith('/convite/invite-token');
  });

  it('validates password confirmation without sending it to the backend', () => {
    fillRegister({ senha: 'senha123', confirmacaoSenha: 'outra123' });
    submit();
    fixture.detectChanges();

    expect(textContent()).toContain('As senhas informadas não conferem.');
    httpMock.expectNone('https://api.test/usuario/public/register');
  });

  it('validates username before sending it to the backend', () => {
    fillRegister({ username: 'joao@email.com' });
    submit();
    fixture.detectChanges();

    expect(textContent()).toContain('Username nao pode ser um e-mail.');
    httpMock.expectNone('https://api.test/usuario/public/register');
  });

  it('shows backend validation errors', () => {
    fillRegister({ senha: 'senha123', confirmacaoSenha: 'senha123' });
    submit();
    httpMock.expectOne('https://api.test/usuario/public/register').flush(
      { errors: ['E-mail ja cadastrado.'] },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(textContent()).toContain('E-mail ja cadastrado.');
  });

  it('requires terms acceptance', () => {
    fillRegister({ aceitouTermos: false });
    submit();

    httpMock.expectNone('https://api.test/usuario/public/register');
  });

  it('renders the login link', () => {
    expect(textContent()).toContain('Já possui uma conta?');
    expect((fixture.nativeElement as HTMLElement).querySelector('a')?.getAttribute('href')).toContain('/entrar');
  });

  function fillRegister(overrides: Partial<ReturnType<typeof fixture.componentInstance['form']['getRawValue']>>): void {
    fixture.componentInstance['form'].setValue({
      username: 'Joao.Silva',
      nome: 'Joao Silva',
      email: 'joao@email.com',
      telefone: '(65) 99999-9999',
      senha: 'senha123',
      confirmacaoSenha: 'senha123',
      aceitouTermos: true,
      aceitouPoliticaPrivacidade: true,
      ...overrides,
    });
    fixture.detectChanges();
  }

  function submit(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  }

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
