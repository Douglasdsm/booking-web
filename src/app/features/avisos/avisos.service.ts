import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_CONFIG } from '../../core/api/api.config';
import { bookingAuthContext, BookingAuthContext } from '../../core/auth/auth-context';

export interface Notificacao {
  id: number;
  eventType: string;
  causeType: string;
  causeId: number;
  createdAtUtc: string;
  isRead: boolean;
  readAtUtc: string | null;
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

/** FE-V2-07: only existing V2 contracts (notification inbox, reconfirmation respond, opportunity get/accept/decline). */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly context = () => ({ context: bookingAuthContext(BookingAuthContext.User) });

  list(): Observable<Notificacao[]> {
    const params = new HttpParams().set('skip', 0).set('take', 50);
    return this.http.get<Notificacao[]>(this.url('/v2/notifications'), { params, ...this.context() });
  }

  markRead(notificationId: number): Observable<unknown> {
    return this.http.post(this.url(`/v2/notifications/${notificationId}/read`), {}, this.context());
  }

  respondReconfirmation(reconfirmationId: number, confirmed: boolean): Observable<unknown> {
    return this.http.post(this.url(`/v2/bookings/reconfirmations/${reconfirmationId}/respond`), { confirmed }, this.context());
  }

  getOpportunity(opportunityId: number): Observable<Oportunidade> {
    return this.http.get<Oportunidade>(this.url(`/v2/booking-opportunities/${opportunityId}`), this.context());
  }

  acceptOpportunity(opportunityId: number): Observable<unknown> {
    return this.http.post(this.url(`/v2/booking-opportunities/${opportunityId}/accept`), {}, this.context());
  }

  declineOpportunity(opportunityId: number): Observable<unknown> {
    return this.http.post(this.url(`/v2/booking-opportunities/${opportunityId}/decline`), {}, this.context());
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
