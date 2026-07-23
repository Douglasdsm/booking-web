export enum PublicConviteTipo {
  Cliente = 1,
  Prestador = 2,
  Funcionario = 3,
  Administrador = 4,
}

export enum PublicConviteStatus {
  Pendente = 1,
  Aceito = 2,
  Recusado = 3,
  Expirado = 4,
  Cancelado = 5,
}

export enum EscopoAutorizacaoPessoaJuridica {
  Nome = 1,
  Telefone = 2,
  Email = 4,
  Foto = 8,
  DataNascimento = 16,
}

export interface PublicConvitePrestador {
  deveAcessarPainel: boolean;
  deveAparecerBooking: boolean;
  role: string | null;
  servicos: string[] | null;
}

export interface PublicConvite {
  empresa: string | null;
  filial: string | null;
  slug: string | null;
  tipoConvite: PublicConviteTipo;
  nomeInformado: string | null;
  telefoneMascarado: string | null;
  emailMascarado: string | null;
  dataExpiracao: string;
  status: PublicConviteStatus;
  versaoTermo: string | null;
  escoposObrigatorios: string[] | null;
  prestador: PublicConvitePrestador | null;
}

export interface AcceptClientConviteRequest {
  nome: string | null;
  cpf: string | null;
  escoposAutorizados: number;
  versaoTermo: string | null;
}

export interface AcceptClientConviteResponse {
  status: PublicConviteStatus;
  empresa: string | null;
  filial: string | null;
  nome: string | null;
  escoposAutorizados: number;
  versaoTermo: string | null;
}

export interface AcceptProviderConviteRequest {
  nome: string | null;
  cpf: string | null;
  escoposAutorizados: number;
  versaoTermo: string | null;
}

export interface AcceptProviderConviteResponse {
  status: PublicConviteStatus;
  empresa: string | null;
  filial: string | null;
  nome: string | null;
  deveAcessarPainel: boolean;
  apareceBooking: boolean;
  role: string | null;
  servicos: string[] | null;
  escoposAutorizados: number;
  versaoTermo: string | null;
}

export type AcceptConviteResponse = AcceptClientConviteResponse | AcceptProviderConviteResponse;

export type PublicConviteViewState =
  | 'idle'
  | 'loading'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'canceled'
  | 'not-found'
  | 'temporary-error'
  | 'invalid-token';
