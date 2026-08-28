import { HttpErrorResponse } from '@angular/common/http';

import { mapPublicBookingError } from './public-booking-v2-error-mapper';

function errorResponse(status: number, errors: string[] = []): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { errors, tokenExpired: false } });
}

describe('mapPublicBookingError', () => {
  it('maps 403 with the PublicBookingPolicy message to PublicBookingDisabled', () => {
    const result = mapPublicBookingError(
      errorResponse(403, ['PUBLIC BOOKING DISABLED: este Esus não habilita agendamento público.']),
    );

    expect(result.kind).toBe('PublicBookingDisabled');
  });

  it('maps any other 403 to ServiceUnavailable, never leaking the internal reason', () => {
    const result = mapPublicBookingError(errorResponse(403, ['algum outro motivo interno']));

    expect(result.kind).toBe('ServiceUnavailable');
    expect(result.message).not.toContain('interno');
  });

  it('maps 404 to InvalidService', () => {
    expect(mapPublicBookingError(errorResponse(404, ['Registro não encontrado.'])).kind).toBe('InvalidService');
  });

  it('maps a slot/capacity 409 to SlotUnavailable', () => {
    const result = mapPublicBookingError(
      errorResponse(409, ['CONFIGURATION CONFLICT: Prestador já possui reserva confirmada nesse intervalo.']),
    );

    expect(result.kind).toBe('SlotUnavailable');
  });

  it('maps an idempotency-payload-mismatch 409 to Conflict', () => {
    const result = mapPublicBookingError(
      errorResponse(409, ['IDEMPOTENCY CONFLICT: Idempotency-Key já foi usada com um payload diferente.']),
    );

    expect(result.kind).toBe('Conflict');
  });

  it('maps a validation 400 mentioning VisitorName/VisitorPhone to InvalidVisitorData', () => {
    expect(mapPublicBookingError(errorResponse(400, ['VisitorPhone é obrigatório.'])).kind).toBe(
      'InvalidVisitorData',
    );
  });

  it('maps any other 400 to ValidationProblem', () => {
    expect(mapPublicBookingError(errorResponse(400, ['ServiceOfferId é obrigatório.'])).kind).toBe(
      'ValidationProblem',
    );
  });

  it('maps 429 to RateLimited', () => {
    expect(mapPublicBookingError(errorResponse(429)).kind).toBe('RateLimited');
  });

  it('maps 0/network and 500 to UnexpectedError without leaking exception detail', () => {
    expect(mapPublicBookingError(errorResponse(0)).kind).toBe('UnexpectedError');
    const serverError = mapPublicBookingError(errorResponse(500, ['Ocorreu um erro desconhecido.']));
    expect(serverError.kind).toBe('UnexpectedError');
    expect(serverError.message).not.toContain('Exception');
    expect(serverError.message).not.toContain('StackTrace');
  });
});
