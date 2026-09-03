import { InjectionToken } from '@angular/core';

export interface ApiEndpointsConfig {
  bookingConfig: (slug: string) => string;
  bookingTheme: (pessoaJuridicaId: number) => string;
  services: string;
  professionals: string;
  availableSlots: string;
  visitorUser: string;
  login: string;
  user: string;
  publicUserRegister: string;
  usernameStatus?: string;
  defineUsername?: string;
  booking: string;
  publicInvite: (token: string) => string;
  acceptClientInvite: (token: string) => string;
  acceptProviderInvite: (token: string) => string;
}

export interface ApiConfig {
  baseUrl: string;
  swaggerUrl: string;
  endpoints: ApiEndpointsConfig;
}

const swaggerUrl = 'https://168.231.66.108:8080/swagger/v1/swagger.json';

/**
 * Phase 38B: the API base URL is now configurable per environment at container runtime, not only at
 * build time. `public/env-config.js` is a plain script loaded by `index.html` before this module ever
 * runs, so `window.__env` (browser) is already populated by the time this file is evaluated. It ships
 * checked in with an empty `apiBaseUrl` (see that file) — `ng serve`, unit tests, and any Docker image
 * built without the Phase 38B entrypoint override all keep working exactly as before, falling back to
 * the historical hardcoded origin below. Only when the deployment environment (Pilot/Staging/Production)
 * explicitly supplies `API_BASE_URL` at container start (see `booking-web/Dockerfile` and
 * `docs/V2/PILOT-CONFIGURATION-CONTRACT.md`) does this resolve to something else.
 */
function resolveApiBaseUrl(): string {
  const runtimeEnv = (globalThis as { __env?: { apiBaseUrl?: string } }).__env;
  const override = runtimeEnv?.apiBaseUrl?.trim();
  if (override) return override;
  return typeof window !== 'undefined' ? window.location.origin : 'https://localhost:8080';
}

export const apiConfig: ApiConfig = {
  baseUrl: resolveApiBaseUrl(),
  swaggerUrl,
  endpoints: {
    bookingConfig: (slug) => `/booking/config/${slug}`,
    bookingTheme: (pessoaJuridicaId) => `/pessoajuridica-booking-theme/public/${pessoaJuridicaId}`,
    services: '/servicoprice',
    professionals: '/prestador/list-prestador',
    availableSlots: '/horariodisponivel',
    visitorUser: '/usuariovisitante',
    login: '/login',
    user: '/usuario',
    publicUserRegister: '/usuario/public/register',
    usernameStatus: '/usuario/username-status',
    defineUsername: '/usuario/definir-username',
    booking: '/agendamento',
    publicInvite: (token) => `/convites/public/${encodeURIComponent(token)}`,
    acceptClientInvite: (token) => `/convites/public/${encodeURIComponent(token)}/aceitar-cliente`,
    acceptProviderInvite: (token) => `/convites/public/${encodeURIComponent(token)}/aceitar-prestador`,
  },
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  providedIn: 'root',
  factory: () => apiConfig,
});
