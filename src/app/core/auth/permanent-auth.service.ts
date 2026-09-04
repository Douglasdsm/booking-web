import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

import { API_CONFIG } from '../api/api.config';
import { bookingAuthContext, BookingAuthContext } from './auth-context';
import { PermanentTokenService } from './permanent-token.service';

export interface PermanentLoginRequest {
  user: string | null;
  senha: string | null;
}

export interface PermanentRegisterRequest {
  username: string;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmacaoSenha: string;
  aceitouTermos: boolean;
  aceitouPoliticaPrivacidade: boolean;
}

export interface PermanentAuthResponse {
  id: number;
  user: string | null;
  requerDefinicaoUsername?: boolean;
  tokens: {
    accessToken: string | null;
  } | null;
}

export interface UsernameStatusResponse {
  possuiUsernameDefinitivo: boolean;
  usernameTemporario: boolean;
  podeDefinirUsername: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermanentAuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly tokenService = inject(PermanentTokenService);
  private usernameStatusCache: UsernameStatusResponse | null = null;

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
      .post<PermanentAuthResponse>(this.url(this.config.endpoints.publicUserRegister), request, {
        context: bookingAuthContext(BookingAuthContext.Anonymous),
      })
      .pipe(tap((response) => this.storeAccessToken(response)));
  }

  usernameStatus(forceRefresh = false): Observable<UsernameStatusResponse> {
    if (!forceRefresh && this.usernameStatusCache) {
      return of(this.usernameStatusCache);
    }

    return this.http.get<UsernameStatusResponse>(
      this.url(this.config.endpoints.usernameStatus ?? '/usuario/username-status'),
      {
        context: bookingAuthContext(BookingAuthContext.User),
      },
    ).pipe(tap((status) => {
      this.usernameStatusCache = status;
    }));
  }

  defineUsername(username: string): Observable<void> {
    return this.http.post<void>(
      this.url(this.config.endpoints.defineUsername ?? '/usuario/definir-username'),
      { username },
      {
        context: bookingAuthContext(BookingAuthContext.User),
      },
    ).pipe(tap(() => {
      this.usernameStatusCache = {
        possuiUsernameDefinitivo: true,
        usernameTemporario: false,
        podeDefinirUsername: false,
      };
    }));
  }

  logout(): void {
    this.clearUsernameStatusCache();
    this.tokenService.removeToken();
  }

  hasSession(): boolean {
    return this.tokenService.hasSession();
  }

  accessToken(): string | null {
    return this.tokenService.getToken();
  }

  clearUsernameStatusCache(): void {
    this.usernameStatusCache = null;
  }

  private storeAccessToken(response: PermanentAuthResponse): void {
    this.clearUsernameStatusCache();
    this.tokenService.setToken(response.tokens?.accessToken ?? null);
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
