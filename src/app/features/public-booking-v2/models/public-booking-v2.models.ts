/**
 * Phase 37: TypeScript mirror of the real V2 public contracts (Phase 36,
 * `API-CONTRACT-MATRIX.md` §11). Field names match the backend's actual JSON casing
 * (ASP.NET Core's default camelCase policy over the C# PascalCase properties) — never invented,
 * never reusing a V1 shape whose semantics diverge.
 */

// ---- GET /v2/public/esus/{esusId} ----
export interface PublicEsusProfile {
  esusId: number;
  tipo: string;
  publicBookingEnabled: boolean;
  timeZoneId?: string | null;
}

// ---- GET /v2/public/esus/{esusId}/service-offers ----
export interface PublicServiceOffer {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  baseDurationMinutes: number;
}

export interface PublicServiceOfferListResponse {
  serviceOffers: PublicServiceOffer[];
}

// ---- GET /v2/public/esus/{esusId}/availability/search ----
export interface AvailabilitySearchRequest {
  serviceOfferId: number;
  startDate: string; // yyyy-MM-dd (DateOnly)
  endDate: string; // yyyy-MM-dd (DateOnly), exclusive
  prestadorId?: number;
  executionLocationId?: number;
}

/** One candidate (Prestador, ExecutionLocation, slot) combination — advisory only, never a reservation. */
export interface BookingPreview {
  serviceOfferId: number;
  serviceLabel: string;
  prestadorId: number;
  executionEsusId: number;
  executionLocationId: number;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  currentPrice: number;
  currency: string;
}

export interface PublicBookingStatusResult {
  status: 'Pending' | 'Accepted' | 'Rejected';
  startUtc: string;
  endUtc: string;
  serviceLabel: string;
}

export interface AvailabilitySearchResponse {
  executionEsusId: number;
  serviceOfferId: number;
  startDate: string;
  endDate: string;
  items: BookingPreview[];
}

// ---- POST /v2/public/esus/{esusId}/bookings ----
export interface SubmitPublicBookingRequest {
  serviceOfferId: number;
  executionLocationId: number;
  prestadorId: number;
  requestedStartUtc: string;
  visitorName: string;
  visitorPhone: string;
}

export type PublicBookingSubmissionStatus = 'Confirmed' | 'PendingApproval';

export interface PublicBookingSubmissionResult {
  status: PublicBookingSubmissionStatus;
  bookingId: number | null;
  bookingRequestId: number | null;
  serviceLabel: string;
  startUtc: string;
  endUtc: string;
  price: number;
  currency: string;
  publicStatusToken?: string | null;
}

// ---- Error contract (API/Filters/GlobalExceptionHandler.cs → ResponseErrorJson) ----
export interface ApiErrorBody {
  errors: string[];
  tokenExpired: boolean;
}

/**
 * Classification the UI actually branches on — derived from HTTP status + the backend's own known
 * message text (never invented; each case traces to a real `throw` in `SubmitPublicBookingUseCase`/
 * `GetPublicServiceOffersUseCase`/`GetPublicAvailabilitySearchUseCase`, Phase 36). `RateLimited` is
 * included per the plan's own list even though no rate-limiting exists yet on this surface today
 * (audited, confirmed absent — the frontend still handles a 429 defensively, it just cannot be
 * triggered by the current backend).
 */
export type PublicBookingErrorKind =
  | 'PublicBookingDisabled'
  | 'ServiceUnavailable'
  | 'SlotUnavailable'
  | 'InvalidVisitorData'
  | 'InvalidService'
  | 'ValidationProblem'
  | 'Conflict'
  | 'RateLimited'
  | 'UnexpectedError';

export interface PublicBookingError {
  kind: PublicBookingErrorKind;
  message: string;
}
