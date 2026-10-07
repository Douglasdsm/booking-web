import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { bookingAuthContext, BookingAuthContext } from '../../core/auth/auth-context';

export interface EsusPerfil { esusId: number; publicBookingEnabled: boolean; timeZoneId?: string | null }
export interface Oferta { id: number; name: string; description: string; basePrice: number; baseDurationMinutes: number }
export interface Candidato {
  serviceOfferId: number; serviceLabel: string; prestadorId: number; prestadorName?: string | null; executionEsusId: number;
  executionLocationId: number; executionLocationName?: string | null; startUtc: string; endUtc: string;
  durationMinutes: number; currentPrice: number; currency: string;
}
export interface MeuHold {
  id: number; serviceOfferId: number; executionEsusId: number; executionLocationId: number; prestadorId: number;
  startUtc: string; endUtc: string; frozenPrice: number; frozenDurationMinutes: number; status: string; expiresAtUtc: string;
  bookingId: number | null; canConfirm: boolean; serverNowUtc: string;
  serviceLabel: string; prestadorName?: string | null; executionLocationName?: string | null;
}

/**
 * V2-MC-02A: the authenticated Hold journey consumes ONLY existing contracts (`/v2/booking-holds`) plus the personal
 * canonical listing `GET /v2/me/booking-holds`. Availability, capacity and expiry are always backend decisions.
 */
@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly context = () => ({ context: bookingAuthContext(BookingAuthContext.User) });

  getProfile(esusId: number): Observable<EsusPerfil> {
    return this.http.get<EsusPerfil>(this.url(`/v2/public/esus/${esusId}`), this.context());
  }

  getOffers(esusId: number): Observable<{ serviceOffers: Oferta[] }> {
    return this.http.get<{ serviceOffers: Oferta[] }>(this.url(`/v2/public/esus/${esusId}/service-offers`), this.context());
  }

  searchAvailability(esusId: number, serviceOfferId: number, startDate: string, endDate: string): Observable<{ items: Candidato[] }> {
    const params = new HttpParams().set('ServiceOfferId', serviceOfferId).set('StartDate', startDate).set('EndDate', endDate);
    return this.http.get<{ items: Candidato[] }>(this.url(`/v2/esus/${esusId}/availability/search`), { params, ...this.context() });
  }

  listHolds(): Observable<MeuHold[]> {
    return this.http.get<MeuHold[]>(this.url('/v2/me/booking-holds'), this.context());
  }

  createHold(candidate: Candidato): Observable<unknown> {
    return this.http.post(this.url('/v2/booking-holds'), {
      serviceOfferId: candidate.serviceOfferId, executionEsusId: candidate.executionEsusId,
      executionLocationId: candidate.executionLocationId, prestadorId: candidate.prestadorId, requestedStartUtc: candidate.startUtc,
    }, this.context());
  }

  confirmHold(holdId: number): Observable<unknown> {
    return this.http.post(this.url(`/v2/booking-holds/${holdId}/confirm`), {}, this.context());
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
