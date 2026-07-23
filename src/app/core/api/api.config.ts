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

const swaggerUrl = 'http://168.231.66.108:8080/swagger/v1/swagger.json';

export const apiConfig: ApiConfig = {
  baseUrl: new URL(swaggerUrl).origin,
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
