import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody, PublicBookingError, PublicBookingErrorKind } from '../models/public-booking-v2.models';

/**
 * Phase 37: maps a raw HTTP failure into the small, closed set of error kinds the UI actually branches
 * on (plan §"ERROR HANDLING") — never leaks a stack trace, an exception type name, or any internal
 * detail (lock reason, capacity internals). Only status code + the backend's own already-user-safe
 * message text are read; message TEXT matching is a best-effort refinement, the STATUS CODE is always
 * the authoritative fallback so an unrecognized/rewritten message string still lands in a sane bucket.
 */
export function mapPublicBookingError(error: HttpErrorResponse): PublicBookingError {
  const body = error.error as ApiErrorBody | null | undefined;
  const serverMessage = body?.errors?.[0] ?? '';
  const kind = classify(error.status, serverMessage);

  return { kind, message: userFacingMessage(kind, serverMessage) };
}

function classify(status: number, serverMessage: string): PublicBookingErrorKind {
  if (status === 0) {
    return 'UnexpectedError';
  }

  if (status === 403) {
    return serverMessage.includes('PUBLIC BOOKING DISABLED') ? 'PublicBookingDisabled' : 'ServiceUnavailable';
  }

  if (status === 404) {
    return 'InvalidService';
  }

  if (status === 409) {
    return serverMessage.includes('IDEMPOTENCY CONFLICT') ? 'Conflict' : 'SlotUnavailable';
  }

  if (status === 400) {
    return serverMessage.toLowerCase().includes('visitorname') || serverMessage.toLowerCase().includes('visitorphone')
      ? 'InvalidVisitorData'
      : 'ValidationProblem';
  }

  if (status === 429) {
    return 'RateLimited';
  }

  return 'UnexpectedError';
}

function userFacingMessage(kind: PublicBookingErrorKind, serverMessage: string): string {
  switch (kind) {
    case 'PublicBookingDisabled':
      return 'Agendamento online indisponível.';
    case 'ServiceUnavailable':
      return 'Não foi possível carregar os dados deste estabelecimento agora.';
    case 'SlotUnavailable':
      return 'Esse horário acabou de ficar indisponível. Escolha outro horário.';
    case 'InvalidVisitorData':
      return 'Confira seu nome e telefone.';
    case 'InvalidService':
      return 'Serviço não encontrado ou indisponível.';
    case 'ValidationProblem':
      return serverMessage || 'Revise os dados informados.';
    case 'Conflict':
      return 'Esta solicitação já foi processada com dados diferentes. Tente novamente do início.';
    case 'RateLimited':
      return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.';
    case 'UnexpectedError':
    default:
      return 'Não foi possível concluir a solicitação. Tente novamente em instantes.';
  }
}
