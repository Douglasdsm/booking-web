export interface MinhaPessoa {
  pessoaID: number;
  nome: string;
  telefones?: { telefones?: { numeroTelefone: string; isDefault: boolean }[] };
  emails?: { emails?: { enderecoEmail: string }[] };
}

export interface MinhaAutorizacao {
  id: number;
  pessoaJuridicaID: number;
  status: string | number;
  escoposAutorizados: string | number;
  versaoTermo: string;
  dataSolicitacao: string;
  dataAutorizacao?: string | null;
  dataRevogacao?: string | null;
}

export interface MinhasAutorizacoesResponse {
  autorizacoes: MinhaAutorizacao[];
}

export interface MinhaPreferenciaMarketing {
  esusId: number;
  companyName: string;
  granted: boolean;
  changedAtUtc?: string | null;
}

export interface MinhasPreferenciasMarketingResponse {
  items: MinhaPreferenciaMarketing[];
}

export interface MeuAgendamento {
  bookingId: number;
  startUtc: string;
  endUtc: string;
  currentState: string;
  serviceLabel: string;
  prestadorId: number;
  executionEsusId: number;
  executionLocationId: number;
  hasServiceOrder: boolean;
  predecessorBookingId?: number | null;
  successorBookingId?: number | null;
  successorReason?: string | null;
}

export interface MeusAgendamentosResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  items: MeuAgendamento[];
}
