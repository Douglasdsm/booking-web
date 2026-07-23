import {
  EscopoAutorizacaoPessoaJuridica,
  PublicConviteStatus,
  PublicConviteTipo,
} from '../models/public-convite.models';

const scopeLabels: Record<string, string> = {
  nome: 'Nome',
  telefone: 'Telefone',
  email: 'E-mail',
  'e-mail': 'E-mail',
  foto: 'Foto',
  datanascimento: 'Data de nascimento',
  data_nascimento: 'Data de nascimento',
  'data-nascimento': 'Data de nascimento',
  'data nascimento': 'Data de nascimento',
};

const scopeValues: Record<string, EscopoAutorizacaoPessoaJuridica> = {
  nome: EscopoAutorizacaoPessoaJuridica.Nome,
  telefone: EscopoAutorizacaoPessoaJuridica.Telefone,
  email: EscopoAutorizacaoPessoaJuridica.Email,
  'e-mail': EscopoAutorizacaoPessoaJuridica.Email,
  foto: EscopoAutorizacaoPessoaJuridica.Foto,
  datanascimento: EscopoAutorizacaoPessoaJuridica.DataNascimento,
  data_nascimento: EscopoAutorizacaoPessoaJuridica.DataNascimento,
  'data-nascimento': EscopoAutorizacaoPessoaJuridica.DataNascimento,
  'data nascimento': EscopoAutorizacaoPessoaJuridica.DataNascimento,
};

function normalizeScope(scope: string): string {
  return scope
    .trim()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

export function publicConviteTipoLabel(tipo: PublicConviteTipo): string {
  const labels: Record<PublicConviteTipo, string> = {
    [PublicConviteTipo.Cliente]: 'Cliente',
    [PublicConviteTipo.Prestador]: 'Prestador',
    [PublicConviteTipo.Funcionario]: 'Funcionario',
    [PublicConviteTipo.Administrador]: 'Administrador',
  };

  return labels[tipo] ?? 'Convite';
}

export function publicConviteStatusLabel(status: PublicConviteStatus): string {
  const labels: Record<PublicConviteStatus, string> = {
    [PublicConviteStatus.Pendente]: 'Pendente',
    [PublicConviteStatus.Aceito]: 'Aceito',
    [PublicConviteStatus.Recusado]: 'Recusado',
    [PublicConviteStatus.Expirado]: 'Expirado',
    [PublicConviteStatus.Cancelado]: 'Cancelado',
  };

  return labels[status] ?? 'Indisponivel';
}

export function publicConviteScopeLabel(scope: string): string {
  const normalizedScope = normalizeScope(scope);

  return scopeLabels[normalizedScope.replace(/\s+/g, '')] ?? scopeLabels[normalizedScope] ?? scope;
}

export function publicConviteScopeValue(scope: string): EscopoAutorizacaoPessoaJuridica | null {
  const normalizedScope = normalizeScope(scope);

  return scopeValues[normalizedScope.replace(/\s+/g, '')] ?? scopeValues[normalizedScope] ?? null;
}

export function publicConviteScopeFlags(scopes: string[] | null): EscopoAutorizacaoPessoaJuridica | null {
  if (!scopes?.length) {
    return null;
  }

  let flags = 0;

  for (const scope of scopes) {
    const value = publicConviteScopeValue(scope);

    if (!value) {
      return null;
    }

    flags |= value;
  }

  return flags as EscopoAutorizacaoPessoaJuridica;
}

export function publicConviteScopeLabelsFromFlags(flags: number | null): string[] {
  if (!flags) {
    return [];
  }

  return [
    [EscopoAutorizacaoPessoaJuridica.Nome, 'Nome'],
    [EscopoAutorizacaoPessoaJuridica.Telefone, 'Telefone'],
    [EscopoAutorizacaoPessoaJuridica.Email, 'E-mail'],
    [EscopoAutorizacaoPessoaJuridica.Foto, 'Foto'],
    [EscopoAutorizacaoPessoaJuridica.DataNascimento, 'Data de nascimento'],
  ]
    .filter(([value]) => (flags & (value as number)) === (value as number))
    .map(([, label]) => label as string);
}

export function publicConviteTermLabel(version: string | null): string {
  if (!version?.trim()) {
    return 'Termo vigente';
  }

  return version.trim().replace(/-/g, ' ');
}

export function formatPublicConviteDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Nao informado';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function booleanBusinessLabel(value: boolean): string {
  return value ? 'Sim' : 'Nao';
}

export function normalizeCpf(value: string | null): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';

  return digits || null;
}

export function maskCpf(value: string | null): string {
  const digits = (value?.replace(/\D/g, '') ?? '').slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidPublicInviteToken(token: string | null): token is string {
  const normalizedToken = token?.trim() ?? '';

  return (
    normalizedToken.length > 0 &&
    normalizedToken.length <= 512 &&
    !normalizedToken.includes('/') &&
    !normalizedToken.includes('\\') &&
    !normalizedToken.includes(':') &&
    /^[A-Za-z0-9._~-]+$/.test(normalizedToken)
  );
}
