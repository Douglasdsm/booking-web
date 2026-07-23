import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_CONFIG } from '../api/api.config';
import { bookingAuthContext, BookingAuthContext } from './auth-context';
import { PermanentTokenService } from './permanent-token.service';

export interface PermanentLoginRequest {
  user: string | null;
  senha: string | null;
}

export interface PermanentRegisterRequest {
  nome: string | null;
  email: string | null;
  phone: string | null;
  cpfCnpj: string | null;
  user: string | null;
  senha: string | null;
}

export interface PermanentAuthResponse {
  id: number;
  user: string | null;
  tokens: {
    accessToken: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class PermanentAuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly tokenService = inject(PermanentTokenService);

  readonly isAuthenticated = this.tokenService.hasSession;

  login(request: PermanentLoginRequest): Observable<PermanentAuthResponse> {
    return this.http
      .post<PermanentAuthResponse>(this.url(this.config.endpoints.login), request, {
        context: bookingAuthContext(BookingAuthContext.Anonymous),
      })
      .pipe(tap((response) => this.storeAccessToken(response)));
  }

  register(request: PermanentRegisterRequest): Observable<PermanentAuthResponse> {
    return this.http
      .post<PermanentAuthResponse>(this.url(this.config.endpoints.user), request, {
        context: bookingAuthContext(BookingAuthContext.Anonymous),
      })
      .pipe(tap((response) => this.storeAccessToken(response)));
  }

  logout(): void {
    this.tokenService.removeToken();
  }

  hasSession(): boolean {
    return this.tokenService.hasSession();
  }

  accessToken(): string | null {
    return this.tokenService.getToken();
  }

  private storeAccessToken(response: PermanentAuthResponse): void {
    this.tokenService.setToken(response.tokens?.accessToken ?? null);
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
