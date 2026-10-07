import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { bookingAuthContext, BookingAuthContext } from '../../core/auth/auth-context';

export interface Reconfirmacao {
  id: number;
  bookingId: number;
  status: string;
  requestedAtUtc: string;
  deadlineUtc: string;
  respondedAtUtc: string | null;
  bookingStartUtc: string;
  canRespond: boolean;
}

export interface Oportunidade {
  id: number;
  waitlistEntryId: number;
  executionEsusId: number;
  executionLocationId: number;
  prestadorId: number;
  startUtc: string;
  endUtc: string;
  status: string;
  expiresAtUtc: string;
}

export interface EntradaListaEspera {
  id: number;
  bookingId: number;
  requesterUsuarioId: number;
  serviceOfferId: number;
  executionEsusId: number;
  prestadorId: number | null;
  executionLocationId: number | null;
  status: string;
}

export interface AgendamentoResumo {
  bookingId: number;
  startUtc: string;
  endUtc: string;
  currentState: string;
  serviceLabel: string;
}

interface MeusAgendamentos {
  items: AgendamentoResumo[];
}

/**
 * FE-V2-07: the customer's canonical state comes ONLY from the backend personal endpoints
 * (NOTIFICATION != SOURCE OF TRUTH). The notification inbox is intentionally not consumed here.
 */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly context = () => ({ context: bookingAuthContext(BookingAuthContext.User) });

  listReconfirmations(): Observable<Reconfirmacao[]> {
    return this.http.get<Reconfirmacao[]>(this.url('/v2/me/booking-reconfirmations'), this.context());
  }

  listOpportunities(): Observable<Oportunidade[]> {
    return this.http.get<Oportunidade[]>(this.url('/v2/me/booking-opportunities'), this.context());
  }

  listWaitlist(): Observable<EntradaListaEspera[]> {
    return this.http.get<EntradaListaEspera[]>(this.url('/v2/me/booking-waitlist'), this.context());
  }

  listUpcomingBookings(): Observable<MeusAgendamentos> {
    const params = new HttpParams().set('scope', 'Upcoming').set('page', 1).set('pageSize', 50);
    return this.http.get<MeusAgendamentos>(this.url('/v2/me/bookings'), { params, ...this.context() });
  }

  respondReconfirmation(reconfirmationId: number, confirmed: boolean): Observable<unknown> {
    return this.http.post(this.url(`/v2/bookings/reconfirmations/${reconfirmationId}/respond`), { confirmed }, this.context());
  }

  acceptOpportunity(opportunityId: number): Observable<unknown> {
    return this.http.post(this.url(`/v2/booking-opportunities/${opportunityId}/accept`), {}, this.context());
  }

  declineOpportunity(opportunityId: number): Observable<unknown> {
    return this.http.post(this.url(`/v2/booking-opportunities/${opportunityId}/decline`), {}, this.context());
  }

  joinWaitlist(bookingId: number): Observable<unknown> {
    return this.http.post(this.url('/v2/booking-waitlist'), { bookingId }, this.context());
  }

  leaveWaitlist(entryId: number): Observable<unknown> {
    return this.http.delete(this.url(`/v2/booking-waitlist/${entryId}`), this.context());
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
