import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_CONFIG } from '../../core/api/api.config';
import { bookingAuthContext, BookingAuthContext } from '../../core/auth/auth-context';
import {
  MeusAgendamentosResponse,
  MinhaPessoa,
  MinhaPreferenciaMarketing,
  MinhasAutorizacoesResponse,
  MinhasPreferenciasMarketingResponse,
} from './minha-conta.models';

@Injectable({ providedIn: 'root' })
export class MinhaContaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getPessoa() {
    return this.http.get<MinhaPessoa>(this.url('/me/pessoa'), { context: bookingAuthContext(BookingAuthContext.User) });
  }

  updatePessoa(nome: string) {
    return this.http.put<void>(this.url('/me/pessoa'), { nome }, { context: bookingAuthContext(BookingAuthContext.User) });
  }

  getAutorizacoes() {
    return this.http.get<MinhasAutorizacoesResponse>(this.url('/me/autorizacoes'), { context: bookingAuthContext(BookingAuthContext.User) });
  }

  revogarAutorizacao(id: number) {
    return this.http.post<void>(this.url(`/me/autorizacoes/${id}/revogar`), {}, { context: bookingAuthContext(BookingAuthContext.User) });
  }

  getMarketing() {
    return this.http.get<MinhasPreferenciasMarketingResponse>(this.url('/v2/me/marketing-consents'), { context: bookingAuthContext(BookingAuthContext.User) });
  }

  setMarketing(esusId: number, granted: boolean) {
    return this.http.put<MinhaPreferenciaMarketing>(this.url(`/v2/me/marketing-consents/${esusId}`), { granted }, { context: bookingAuthContext(BookingAuthContext.User) });
  }

  getAgendamentos() {
    return this.http.get<MeusAgendamentosResponse>(this.url('/v2/me/bookings'), {
      params: { scope: 'Upcoming', page: 1, pageSize: 50 },
      context: bookingAuthContext(BookingAuthContext.User),
    });
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
