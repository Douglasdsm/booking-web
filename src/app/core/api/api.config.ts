import { InjectionToken } from '@angular/core';

export interface ApiEndpointsConfig {
  bookingConfig: (slug: string) => string;
  services: string;
  professionals: string;
  availableSlots: string;
  visitorUser: string;
  booking: string;
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
    services: '/servicoprice',
    professionals: '/prestador/list-prestador',
    availableSlots: '/horariodisponivel',
    visitorUser: '/usuariovisitante',
    booking: '/agendamento',
  },
};

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG', {
  providedIn: 'root',
  factory: () => apiConfig,
});
