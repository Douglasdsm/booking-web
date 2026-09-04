import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';

import { API_CONFIG, ApiConfig } from '../api/api.config';
import { authContextInterceptor } from './auth-context.interceptor';
import { PermanentTokenService } from './permanent-token.service';
import { permanentUsernameGuard } from './permanent-username.guard';

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

describe('permanentUsernameGuard', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let token: PermanentTokenService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        { provide: API_CONFIG, useValue: apiConfig },
        provideRouter([]),
        provideHttpClient(withInterceptors([authContextInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    token = TestBed.inject(PermanentTokenService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('allows visitor or anonymous navigation without consulting username status', async () => {
    const result = await runGuard('/agendar/demo/cliente');

    expect(result).toBe(true);
    httpMock.expectNone('https://api.test/usuario/username-status');
  });

  it('redirects an existing permanent session with temporary username', async () => {
    token.setToken('user-token');
    const resultPromise = runGuard('/convite/invite-token');

    const request = httpMock.expectOne('https://api.test/usuario/username-status');
    expect(request.request.headers.get('Authorization')).toBe('Bearer user-token');
    request.flush({
      possuiUsernameDefinitivo: false,
      usernameTemporario: true,
      podeDefinirUsername: true,
    });

    expect(serialize(await resultPromise)).toBe('/definir-username?returnUrl=%2Fconvite%2Finvite-token');
  });

  it('allows definitive username sessions and reuses cached status', async () => {
    token.setToken('user-token');
    const firstResultPromise = runGuard('/convite/invite-token');

    httpMock.expectOne('https://api.test/usuario/username-status').flush({
      possuiUsernameDefinitivo: true,
      usernameTemporario: false,
      podeDefinirUsername: false,
    });

    expect(await firstResultPromise).toBe(true);
    expect(await runGuard('/agendar/demo/cliente')).toBe(true);
    httpMock.expectNone('https://api.test/usuario/username-status');
  });

  it('clears session and redirects to login when status returns 401', async () => {
    token.setToken('user-token');
    const resultPromise = runGuard('/convite/invite-token');

    httpMock.expectOne('https://api.test/usuario/username-status').flush(
      {},
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(serialize(await resultPromise)).toBe('/entrar?returnUrl=%2Fconvite%2Finvite-token');
    expect(token.getToken()).toBeNull();
  });

  it('does not assume username is definitive on temporary status failures', async () => {
    token.setToken('user-token');
    const resultPromise = runGuard('/convite/invite-token');

    httpMock.expectOne('https://api.test/usuario/username-status').flush(
      {},
      { status: 500, statusText: 'Server Error' },
    );

    expect(serialize(await resultPromise)).toBe(
      '/definir-username?returnUrl=%2Fconvite%2Finvite-token&status=erro',
    );
    expect(token.getToken()).toBe('user-token');
  });

  async function runGuard(url: string): Promise<unknown> {
    const result = TestBed.runInInjectionContext(() =>
      (permanentUsernameGuard as CanActivateFn)({} as never, { url } as never),
    );

    return isObservable(result) ? firstValueFrom(result) : result;
  }

  function serialize(result: unknown): string {
    return result instanceof UrlTree ? router.serializeUrl(result) : String(result);
  }
});
