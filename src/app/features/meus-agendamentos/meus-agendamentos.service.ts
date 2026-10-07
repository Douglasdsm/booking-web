import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { bookingAuthContext, BookingAuthContext } from '../../core/auth/auth-context';

export interface ResumoAgendamento {
  bookingId: number; startUtc: string; endUtc: string; currentState: string; serviceLabel: string; serviceOfferId: number;
  prestadorId: number; prestadorName?: string | null; executionEsusId: number; executionLocationId: number; executionLocationName?: string | null;
  hasServiceOrder: boolean; predecessorBookingId: number | null; successorBookingId: number | null; successorReason: string | null;
}
export interface ListaAgendamentos { page: number; pageSize: number; totalItems: number; items: ResumoAgendamento[] }
export interface DetalheAgendamento {
  id: number; serviceOfferId: number; executionEsusId: number; executionLocationId: number; prestadorId: number; startUtc: string; endUtc: string;
  effectivePrice: number; effectiveDurationMinutes: number; quote: { serviceOfferName: string; price: number; currency: string };
}
export interface CicloDeVida {
  bookingId: number; currentState: string; predecessorBookingId: number | null; successorBookingId: number | null;
  timeline: Array<{ occurredAtUtc: string; eventType: string; detail: string | null }>;
}
export interface CandidatoRemarcacao {
  serviceOfferId: number; serviceLabel: string; prestadorId: number; prestadorName?: string | null; executionEsusId: number;
  executionLocationId: number; executionLocationName?: string | null; startUtc: string; endUtc: string; durationMinutes: number; currentPrice: number;
}

/** V2-MC-02B: existing contracts only (`/v2/me/bookings`, `/v2/bookings/{id}`, `/lifecycle`, `/cancel`, `/reschedule`, availability search). */
@Injectable({ providedIn: 'root' })
export class MeusAgendamentosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly context = () => ({ context: bookingAuthContext(BookingAuthContext.User) });

  list(scope: 'Upcoming' | 'History', page: number, pageSize: number): Observable<ListaAgendamentos> {
    const params = new HttpParams().set('scope', scope).set('page', page).set('pageSize', pageSize);
    return this.http.get<ListaAgendamentos>(this.url('/v2/me/bookings'), { params, ...this.context() });
  }

  getBooking(id: number): Observable<DetalheAgendamento> { return this.http.get<DetalheAgendamento>(this.url(`/v2/bookings/${id}`), this.context()); }
  getLifecycle(id: number): Observable<CicloDeVida> { return this.http.get<CicloDeVida>(this.url(`/v2/bookings/${id}/lifecycle`), this.context()); }
  cancel(id: number, reason: string | null): Observable<unknown> { return this.http.post(this.url(`/v2/bookings/${id}/cancel`), { reason }, this.context()); }

  reschedule(id: number, candidate: CandidatoRemarcacao, reason: string | null): Observable<unknown> {
    return this.http.post(this.url(`/v2/bookings/${id}/reschedule`), {
      executionLocationId: candidate.executionLocationId, prestadorId: candidate.prestadorId, requestedStartUtc: candidate.startUtc, reason,
    }, this.context());
  }

  searchAvailability(esusId: number, serviceOfferId: number, startDate: string, endDate: string): Observable<{ items: CandidatoRemarcacao[] }> {
    const params = new HttpParams().set('ServiceOfferId', serviceOfferId).set('StartDate', startDate).set('EndDate', endDate);
    return this.http.get<{ items: CandidatoRemarcacao[] }>(this.url(`/v2/esus/${esusId}/availability/search`), { params, ...this.context() });
  }

  getTimeZone(esusId: number): Observable<{ timeZoneId?: string | null }> {
    return this.http.get<{ timeZoneId?: string | null }>(this.url(`/v2/public/esus/${esusId}`), this.context());
  }

  private url(path: string): string { return `${this.config.baseUrl}${path}`; }
}
