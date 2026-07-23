import { HttpErrorResponse } from '@angular/common/http';
import { AuthReturnUrlService } from '../../../core/auth/auth-return-url.service';

export const PUBLIC_AUTH_FALLBACK_ROUTE = '/agendar/demo';

export function resolveInitialReturnUrl(
  queryReturnUrl: string | null,
  returnUrlService: AuthReturnUrlService,
): string | null {
  const returnUrl = returnUrlService.normalizeReturnUrl(queryReturnUrl);

  if (returnUrl) {
    returnUrlService.setReturnUrl(returnUrl);
    return returnUrl;
  }

  return null;
}

export function consumeAuthReturnUrl(
  returnUrlService: AuthReturnUrlService,
  fallbackReturnUrl: string | null = null,
): string {
  return (
    returnUrlService.consumeReturnUrl() ??
    returnUrlService.normalizeReturnUrl(fallbackReturnUrl) ??
    PUBLIC_AUTH_FALLBACK_ROUTE
  );
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const apiError = error.error;

  if (typeof apiError === 'string' && apiError.trim()) {
    return apiError;
  }

  if (typeof apiError?.message === 'string' && apiError.message.trim()) {
    return apiError.message;
  }

  if (typeof apiError?.mensagem === 'string' && apiError.mensagem.trim()) {
    return apiError.mensagem;
  }

  if (Array.isArray(apiError?.errors) && apiError.errors.length) {
    return apiError.errors.filter(Boolean).join(' ');
  }

  if (apiError?.errors && typeof apiError.errors === 'object') {
    const messages = Object.values(apiError.errors)
      .flat()
      .filter((message): message is string => typeof message === 'string' && !!message.trim());

    if (messages.length) {
      return messages.join(' ');
    }
  }

  return fallback;
}

export function onlyDigits(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';

  return digits || null;
}
