import { InjectionToken } from '@angular/core';

import { apiConfig } from './api.config';

/**
 * Phase 37: dedicated endpoint config for the V2 public visitor booking surface
 * (`PublicBookingController`, Phase 36). Kept as its OWN token/config object instead of extending the
 * existing `ApiEndpointsConfig`/`API_CONFIG` — the V1 config file already carries unrelated, in-flight
 * local changes at the time this was written, and appending here avoids any risk of touching that
 * unfinished work. Reuses the SAME `baseUrl` (same API host/process, just the `v2/public/...` route
 * prefix) — never a second, divergent host resolution.
 */
export interface PublicBookingV2EndpointsConfig {
  publicEsus: (esusId: number) => string;
  serviceOffers: (esusId: number) => string;
  availabilitySearch: (esusId: number) => string;
  submitBooking: (esusId: number) => string;
}

export interface PublicBookingV2Config {
  baseUrl: string;
  endpoints: PublicBookingV2EndpointsConfig;
}

export const publicBookingV2ApiConfig: PublicBookingV2Config = {
  baseUrl: apiConfig.baseUrl,
  endpoints: {
    publicEsus: (esusId) => `/v2/public/esus/${esusId}`,
    serviceOffers: (esusId) => `/v2/public/esus/${esusId}/service-offers`,
    availabilitySearch: (esusId) => `/v2/public/esus/${esusId}/availability/search`,
    submitBooking: (esusId) => `/v2/public/esus/${esusId}/bookings`,
  },
};

export const PUBLIC_BOOKING_V2_API_CONFIG = new InjectionToken<PublicBookingV2Config>(
  'PUBLIC_BOOKING_V2_API_CONFIG',
  { providedIn: 'root', factory: () => publicBookingV2ApiConfig },
);
