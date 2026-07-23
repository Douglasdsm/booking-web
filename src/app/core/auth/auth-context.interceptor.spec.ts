import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authContextInterceptor } from './auth-context.interceptor';
import { bookingAuthContext, BookingAuthContext } from './auth-context';
import { PermanentTokenService } from './permanent-token.service';
import { VisitorTokenService } from './visitor-token.service';

describe('authContextInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let visitorToken: VisitorTokenService;
  let permanentToken: PermanentTokenService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authContextInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    visitorToken = TestBed.inject(VisitorTokenService);
    permanentToken = TestBed.inject(PermanentTokenService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('keeps anonymous requests without Authorization', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    http.get('/anonymous').subscribe();

    const request = httpMock.expectOne('/anonymous');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('uses visitor token for visitor requests', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    http.get('/visitor', { context: bookingAuthContext(BookingAuthContext.Visitor) }).subscribe();

    const request = httpMock.expectOne('/visitor');
    expect(request.request.headers.get('Authorization')).toBe('Bearer visitor-token');
    request.flush({});
  });

  it('does not overwrite an explicitly provided Authorization header', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    http
      .get('/explicit', {
        context: bookingAuthContext(BookingAuthContext.User),
        headers: { Authorization: 'Bearer explicit-token' },
      })
      .subscribe();

    const request = httpMock.expectOne('/explicit');
    expect(request.request.headers.get('Authorization')).toBe('Bearer explicit-token');
    request.flush({});
  });

  it('uses permanent token for user requests', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    http.get('/user', { context: bookingAuthContext(BookingAuthContext.User) }).subscribe();

    const request = httpMock.expectOne('/user');
    expect(request.request.headers.get('Authorization')).toBe('Bearer user-token');
    request.flush({});
  });

  it('does not fallback from user requests to visitor token', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.removeToken();

    http.get('/user', { context: bookingAuthContext(BookingAuthContext.User) }).subscribe();

    const request = httpMock.expectOne('/user');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('does not fallback from visitor requests to permanent token', () => {
    visitorToken.removeToken();
    permanentToken.setToken('user-token');

    http.get('/visitor', { context: bookingAuthContext(BookingAuthContext.Visitor) }).subscribe();

    const request = httpMock.expectOne('/visitor');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('keeps both tokens stored without conflict', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    expect(visitorToken.getToken()).toBe('visitor-token');
    expect(permanentToken.getToken()).toBe('user-token');
  });

  it('permanent logout preserves visitor session', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    permanentToken.removeToken();

    expect(visitorToken.getToken()).toBe('visitor-token');
    expect(permanentToken.getToken()).toBeNull();
  });

  it('visitor logout preserves permanent session', () => {
    visitorToken.setToken('visitor-token');
    permanentToken.setToken('user-token');

    visitorToken.removeToken();

    expect(visitorToken.getToken()).toBeNull();
    expect(permanentToken.getToken()).toBe('user-token');
  });
});
