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

  it('consumes and removes the stored return URL', () => {
    service.setReturnUrl('/convite/token');

    expect(service.consumeReturnUrl()).toBe('/convite/token');
    expect(service.consumeReturnUrl()).toBeNull();
  });
});
