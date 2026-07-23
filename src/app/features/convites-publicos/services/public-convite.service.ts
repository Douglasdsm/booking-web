import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_CONFIG } from '../../../core/api/api.config';
import { bookingAuthContext, BookingAuthContext } from '../../../core/auth/auth-context';
import {
  AcceptClientConviteRequest,
  AcceptClientConviteResponse,
  AcceptProviderConviteRequest,
  AcceptProviderConviteResponse,
  PublicConvite,
} from '../models/public-convite.models';

@Injectable({ providedIn: 'root' })
export class PublicConviteService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getPublic(token: string) {
    return this.http.get<PublicConvite>(this.url(this.config.endpoints.publicInvite(token)), {
      context: bookingAuthContext(BookingAuthContext.Anonymous),
    });
  }

  aceitarCliente(token: string, request: AcceptClientConviteRequest) {
    return this.http.post<AcceptClientConviteResponse>(
      this.url(this.config.endpoints.acceptClientInvite(token)),
      request,
      {
        context: bookingAuthContext(BookingAuthContext.User),
      },
    );
  }

  aceitarPrestador(token: string, request: AcceptProviderConviteRequest) {
    return this.http.post<AcceptProviderConviteResponse>(
      this.url(this.config.endpoints.acceptProviderInvite(token)),
      request,
      {
        context: bookingAuthContext(BookingAuthContext.User),
      },
    );
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
