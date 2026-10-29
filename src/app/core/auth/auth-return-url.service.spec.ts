import { TestBed } from '@angular/core/testing';

import { AuthReturnUrlService } from './auth-return-url.service';

describe('AuthReturnUrlService', () => {
  let service: AuthReturnUrlService;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthReturnUrlService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('accepts convite internal paths', () => {
    service.setReturnUrl('/convite/token');

    expect(service.consumeReturnUrl()).toBe('/convite/token');
  });

  it('rejects external URLs', () => {
    service.setReturnUrl('https://evil.test/convite/token');

    expect(service.consumeReturnUrl()).toBeNull();
  });

  it('rejects protocols inside paths', () => {
    service.setReturnUrl('/convite/javascript:alert');

    expect(service.consumeReturnUrl()).toBeNull();
  });

  it('rejects query strings, hash fragments and double slashes', () => {
    expect(service.normalizeReturnUrl('/convite/token?next=/admin')).toBeNull();
    expect(service.normalizeReturnUrl('/convite/token#section')).toBeNull();
    expect(service.normalizeReturnUrl('/convite//token')).toBeNull();
  });

  it('rejects encoded paths that could normalize outside the convite route', () => {
    expect(service.normalizeReturnUrl('/convite/%2F%2Fevil.test')).toBeNull();
    expect(service.normalizeReturnUrl('/convite/%5Cevil')).toBeNull();
    expect(service.normalizeReturnUrl('/convite/http%3A%2F%2Fevil.test')).toBeNull();
    expect(service.normalizeReturnUrl('/convite/token%3Fnext%3D%2Fadmin')).toBeNull();
  });

  it('F-COV-24: accepts the protected pages a person is sent away from', () => {
    for (const url of ['/meus-agendamentos', '/meus-avisos', '/minha-conta', '/minha-conta/dados', '/minha-conta/autorizacoes', '/minha-conta/agendamentos', '/minha-conta/marketing', '/reservar/42', '/agendar-v2/7']) {
      expect(service.normalizeReturnUrl(url)).toBe(url);
    }
  });

  it('keeps refusing anything outside the allowlist', () => {
    for (const url of ['/', '/entrar', '/agendar/demo', '/minha-conta/outra', '/reservar/abc', '/meus-agendamentos/../admin', '/reservar/1?x=y']) {
      expect(service.normalizeReturnUrl(url)).toBeNull();
    }
  });

  it('consumes and removes the stored return URL', () => {
    service.setReturnUrl('/convite/token');

    expect(service.consumeReturnUrl()).toBe('/convite/token');
    expect(service.consumeReturnUrl()).toBeNull();
  });
});
