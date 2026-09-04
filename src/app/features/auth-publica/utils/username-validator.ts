import { AbstractControl, ValidationErrors } from '@angular/forms';

const usernameRegex = /^[a-z][a-z0-9._-]{2,29}$/;
const reservedWords = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'sistema',
  'support',
  'suporte',
  'login',
  'logout',
  'register',
  'cadastro',
  'api',
  'swagger',
  'booking',
  'agendar',
  'null',
  'undefined',
]);

export function normalizeUsername(username: string | null | undefined): string {
  return username?.trim().toLowerCase() ?? '';
}

export function usernameValidator(control: AbstractControl<string>): ValidationErrors | null {
  const normalized = normalizeUsername(control.value);

  if (!normalized) {
    return { usernameRequired: true };
  }

  if (normalized.length < 3) {
    return { usernameTooShort: true };
  }

  if (normalized.length > 30) {
    return { usernameTooLong: true };
  }

  if (normalized.includes('@')) {
    return { usernameEmail: true };
  }

  if (/\s/.test(normalized)) {
    return { usernameInvalid: true };
  }

  if (/^\d+$/.test(normalized)) {
    return { usernamePhone: true };
  }

  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return { usernamePhone: true };
  }

  if (reservedWords.has(normalized)) {
    return { usernameReserved: true };
  }

  if (!usernameRegex.test(normalized)) {
    return { usernameInvalid: true };
  }

  if (/(?:\.{2}|_{2}|-{2}|[._-]{2})/.test(normalized)) {
    return { usernameInvalid: true };
  }

  return null;
}

export function usernameValidationMessage(errors: ValidationErrors | null | undefined): string {
  if (!errors) {
    return 'Informe um username valido.';
  }

  if (errors['usernameRequired']) {
    return 'Informe seu username.';
  }

  if (errors['usernameTooShort']) {
    return 'Username deve ter pelo menos 3 caracteres.';
  }

  if (errors['usernameTooLong']) {
    return 'Username deve ter no maximo 30 caracteres.';
  }

  if (errors['usernameEmail']) {
    return 'Username nao pode ser um e-mail.';
  }

  if (errors['usernamePhone']) {
    return 'Username nao pode ser um telefone.';
  }

  if (errors['usernameReserved']) {
    return 'Este username nao esta disponivel.';
  }

  return 'Use letras minusculas, numeros, ponto, hifen ou underline, comecando por letra.';
}
