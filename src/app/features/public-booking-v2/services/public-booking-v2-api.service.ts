import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PUBLIC_BOOKING_V2_API_CONFIG } from '../../../core/api/public-booking-v2.api.config';
import {
  AvailabilitySearchRequest,
  AvailabilitySearchResponse,
  PublicBookingSubmissionResult,
  PublicBookingStatusResult,
  PublicEsusProfile,
  PublicServiceOfferListResponse,
  SubmitPublicBookingRequest,
} from '../models/public-booking-v2.models';

/**
 * Phase 37: the ONLY place in this app that knows the four V2 public HTTP routes (plan §"API CLIENT").
 * Every call is anonymous by construction (`new HttpContext()`, never the existing `bookingAuthContext`
 * helper) — no interceptor attaches an Authorization header to any of these four calls, matching the
 * real backend contract exactly: these are `PUBLIC_READ`/`PUBLIC_COMMAND` endpoints
 * (`API-CONTRACT-MATRIX.md` §11), never `[AuthenticatedUser]`. No component calls `HttpClient` directly
 * for this flow — only this service does.
 */
@Injectable({ providedIn: 'root' })
export class PublicBookingV2ApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(PUBLIC_BOOKING_V2_API_CONFIG);

  getPublicEsus(esusId: number) {
    return this.http.get<PublicEsusProfile>(this.url(this.config.endpoints.publicEsus(esusId)), {
      context: new HttpContext(),
    });
  }

  getPublicBookingStatus(esusId: number, token: string) {
    return this.http.get<PublicBookingStatusResult>(
      `${this.config.baseUrl}/v2/public/esus/${esusId}/booking-status/${encodeURIComponent(token)}`,
      { context: new HttpContext() },
    );
  }

  getServiceOffers(esusId: number) {
    return this.http.get<PublicServiceOfferListResponse>(this.url(this.config.endpoints.serviceOffers(esusId)), {
      context: new HttpContext(),
    });
  }

  searchAvailability(esusId: number, request: AvailabilitySearchRequest) {
    const params: Record<string, string> = {
      serviceOfferId: String(request.serviceOfferId),
      startDate: request.startDate,
      endDate: request.endDate,
    };

    if (request.prestadorId !== undefined) {
      params['prestadorId'] = String(request.prestadorId);
    }

    if (request.executionLocationId !== undefined) {
      params['executionLocationId'] = String(request.executionLocationId);
    }

    return this.http.get<AvailabilitySearchResponse>(this.url(this.config.endpoints.availabilitySearch(esusId)), {
      params,
      context: new HttpContext(),
    });
  }

  /** `idempotencyKey` is optional at the HTTP layer (mirrors the backend's own optional header, Phase
   * 36) but always supplied by the store in practice — see `IdempotencyKeyService`. */
  createPublicBooking(esusId: number, request: SubmitPublicBookingRequest, idempotencyKey: string) {
    return this.http.post<PublicBookingSubmissionResult>(
      this.url(this.config.endpoints.submitBooking(esusId)),
      request,
      {
        context: new HttpContext(),
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
