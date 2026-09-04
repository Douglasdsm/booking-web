import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { API_CONFIG, ApiConfig } from '../../../../core/api/api.config';
import { authContextInterceptor } from '../../../../core/auth/auth-context.interceptor';
import { BOOKING_AUTH_CONTEXT, BookingAuthContext } from '../../../../core/auth/auth-context';
import { PermanentTokenService } from '../../../../core/auth/permanent-token.service';
import { DefineUsernamePage } from './define-username.page';

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
    usernameStatus: '/usuario/username-status',
    defineUsername: '/usuario/definir-username',
    booking: '/agendamento',
    publicInvite: (token) => `/convites/public/${token}`,
    acceptClientInvite: (token) => `/convites/public/${token}/aceitar-cliente`,
    acceptProviderInvite: (token) => `/convites/public/${token}/aceitar-prestador`,
  },
};

describe('DefineUsernamePage', () => {
  let fixture: ComponentFixture<DefineUsernamePage>;
  let httpMock: HttpTestingController;
  let router: Router;
  let permanentToken: PermanentTokenService;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [DefineUsernamePage],
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

    router = TestBed.inject(Router);
    permanentToken = TestBed.inject(PermanentTokenService);
    permanentToken.setToken('user-token');

    fixture = TestBed.createComponent(DefineUsernamePage);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('checks status and defines username with the current token', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const statusRequest = httpMock.expectOne('https://api.test/usuario/username-status');
    expect(statusRequest.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(statusRequest.request.headers.get('Authorization')).toBe('Bearer user-token');
    statusRequest.flush({
      possuiUsernameDefinitivo: false,
      usernameTemporario: true,
      podeDefinirUsername: true,
    });
    fixture.detectChanges();

    fixture.componentInstance['form'].setValue({ username: 'Novo.Username' });
    submit();

    const request = httpMock.expectOne('https://api.test/usuario/definir-username');
    expect(request.request.context.get(BOOKING_AUTH_CONTEXT)).toBe(BookingAuthContext.User);
    expect(request.request.headers.get('Authorization')).toBe('Bearer user-token');
    expect(request.request.body).toEqual({ username: 'novo.username' });
    request.flush(null);

    expect(permanentToken.getToken()).toBe('user-token');
    expect(navigateSpy).toHaveBeenCalledWith('/convite/invite-token');
  });

  it('shows duplicate username errors from backend', () => {
    httpMock.expectOne('https://api.test/usuario/username-status').flush({
      possuiUsernameDefinitivo: false,
      usernameTemporario: true,
      podeDefinirUsername: true,
    });
    fixture.detectChanges();

    fixture.componentInstance['form'].setValue({ username: 'novo.username' });
    submit();
    httpMock.expectOne('https://api.test/usuario/definir-username').flush(
      { errors: ['Este username nao esta disponivel.'] },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Este username nao esta disponivel.',
    );
  });

  function submit(): void {
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  }
});
