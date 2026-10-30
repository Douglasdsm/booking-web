import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody, ConditionsChangedDetails, PublicBookingError, PublicBookingErrorKind } from '../models/public-booking-v2.models';

/**
 * Phase 37: maps a raw HTTP failure into the small, closed set of error kinds the UI actually branches
 * on (plan §"ERROR HANDLING") — never leaks a stack trace, an exception type name, or any internal
 * detail (lock reason, capacity internals). Only status code + the backend's own already-user-safe
 * message text are read; message TEXT matching is a best-effort refinement, the STATUS CODE is always
 * the authoritative fallback so an unrecognized/rewritten message string still lands in a sane bucket.
 */
export function mapPublicBookingError(error: HttpErrorResponse): PublicBookingError {
  const serverMessage = extractMessages(error.error).join('\n');
  const conditions = extractConditions(error);
  if (conditions) {
    return { kind: 'ConditionsChanged', message: userFacingMessage('ConditionsChanged', serverMessage), conditions };
  }
  const kind = classify(error.status, serverMessage);

  return { kind, message: userFacingMessage(kind, serverMessage) };
}

/**
 * Loading the company profile itself: a 404 there means the link points to no company (UX-BOOKING-WEB P2-01), not that a
 * chosen service or time went away; every other failure keeps the general mapping.
 */
export function mapPublicEsusProfileError(error: HttpErrorResponse): PublicBookingError {
  return error.status === 404
    ? { kind: 'InvalidService', message: 'Não encontramos esta página de agendamento. Confira o link recebido.' }
    : mapPublicBookingError(error);
}

/** V2-MC-06 / F-12: only the backend's structured 409 CONDITIONS_CHANGED is trusted - never inferred from message text. */
function extractConditions(error: HttpErrorResponse): ConditionsChangedDetails | null {
  if (error.status !== 409 || typeof error.error !== 'object' || error.error === null) return null;
  const body = error.error as Partial<ApiErrorBody>;
  if (body.code !== 'CONDITIONS_CHANGED' || typeof body.details !== 'object' || body.details === null) return null;
  const details = body.details as Partial<ConditionsChangedDetails>;
  if (typeof details.currentPrice !== 'number' || typeof details.currentDurationMinutes !== 'number') return null;
  return {
    expectedPrice: details.expectedPrice ?? null,
    currentPrice: details.currentPrice,
    expectedDurationMinutes: details.expectedDurationMinutes ?? null,
    currentDurationMinutes: details.currentDurationMinutes,
    priceChanged: details.priceChanged === true,
    durationChanged: details.durationChanged === true,
  };
}

function extractMessages(body: unknown): string[] {
  if (typeof body !== 'object' || body === null) return [];

  const apiError = body as Partial<ApiErrorBody> & Record<string, unknown>;
  if (Array.isArray(apiError.errors)) {
    const messages = apiError.errors.filter(
      (message): message is string => typeof message === 'string' && message.trim().length > 0,
    );
    if (messages.length > 0) return messages;
  }

  const legacyMessage = apiError['message'] ?? apiError['mensagem'] ?? apiError['detail'] ?? apiError['title'];
  return typeof legacyMessage === 'string' && legacyMessage.trim().length > 0 ? [legacyMessage] : [];
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
    case 'ConditionsChanged':
      return 'O preço ou a duração mudaram desde a sua revisão. Nada foi reservado; revise os novos valores e confirme novamente.';
    case 'PublicBookingDisabled':
      return 'Agendamento online indisponível.';
    case 'ServiceUnavailable':
      return 'O serviço ou profissional selecionado não está mais disponível. A lista foi atualizada; selecione outro horário.';
    case 'SlotUnavailable':
      return 'Esse horário acabou de ficar indisponível. A lista foi atualizada; selecione outro horário.';
    case 'InvalidVisitorData':
      return serverMessage || 'Confira seu nome e telefone.';
    case 'InvalidService':
      return 'O serviço ou horário selecionado não está mais disponível. A lista foi atualizada; faça uma nova escolha.';
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
