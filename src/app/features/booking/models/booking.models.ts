export type BookingStep =
  | 'servicos'
  | 'prestadores'
  | 'agenda'
  | 'cliente'
  | 'confirmacao'
  | 'sucesso';

export interface BookingCompanyConfig {
  pessoaJuridicaID: number;
  filialID: number;
  nomeEmpresa: string | null;
  slug: string | null;
  logoUrl: string | null;
  imageUrl?: string | null;
  url?: string | null;
  caminhoImagem?: string | null;
  imagemUrl?: string | null;
}

export interface BookingTheme {
  corPrimaria: string;
  corSecundaria: string;
  corFundo: string;
  corTexto: string;
  corBotao: string;
  corTextoBotao: string;
  corBorda: string;
  corCard: string;
  corInput: string;
  corTextoInput: string;
  corErro: string;
  corSucesso: string;
  borderRadius: string;
}

export interface BookingThemeResponse {
  pessoaJuridicaID: number;
  tema: BookingTheme | null;
}

export interface BookingService {
  servicoId: number;
  tabelaPrecosID: number;
  nome: string | null;
  descricao: string | null;
  duracaoMinutos: number;
  preco: number;
}

export interface BookingProfessional {
  id: number;
  nome: string | null;
  usuarioID: number;
  pessoaID: number;
  pessoaJuridicaID: number;
  filialID: number;
  pessoaFisicaID: number;
  url: string | null;
}

export interface TimeSpan {
  ticks: number;
  days?: number;
  hours?: number;
  milliseconds?: number;
  microseconds?: number;
  nanoseconds?: number;
  minutes?: number;
  seconds?: number;
  totalDays?: number;
  totalHours?: number;
  totalMilliseconds?: number;
  totalMicroseconds?: number;
  totalNanoseconds?: number;
  totalMinutes?: number;
  totalSeconds?: number;
}

export interface BookingAvailableSlot {
  horaInicio: TimeSpan | string;
  horaFim: TimeSpan | string;
}

export interface BookingCustomer {
  nome: string;
  telefone: string;
  email?: string;
}

export interface CreateVisitorRequest {
  nome: string | null;
  telefone: string | null;
}

export interface CreateVisitorResponse {
  nome: string | null;
  tokens: {
    accessToken: string | null;
  } | null;
}

export interface GetProfessionalsRequest {
  pessoaJuridicaID: number;
  filialID: number;
}

export interface GetAvailableSlotsRequest {
  prestadorId: number;
  data: string;
  duracaoMinutos: number;
}

export interface CreateBookingRequest {
  isCliente: boolean;
  dataHoraAgendamento: string;
  duracaoMinutos: number;
  usuarioID: number;
  pessoaJuridicaID: number;
  filialID: number;
  prestadorID: number;
  ordemServico: {
    valorTotal: number;
    descontoTotal: number;
    usuarioID: number;
    pessoaJuridicaID: number;
    filialID: number;
    itens: Array<{
      valor: number;
      desconto: number;
      servicoID: number;
      tabelaPrecosID: number;
    }>;
  };
}

export interface CreateBookingResponse {
  id: number;
  ordemServicosID: number;
}

export interface BookingState {
  slug: string | null;
  currentStep: BookingStep;
  company: BookingCompanyConfig | null;
  services: BookingService[];
  professionals: BookingProfessional[];
  availableSlots: BookingAvailableSlot[];
  selectedServices: BookingService[];
  selectedProfessional: BookingProfessional | null;
  selectedDate: string | null;
  selectedSlot: BookingAvailableSlot | null;
  customer: BookingCustomer | null;
  visitorAccessToken: string | null;
  createdBooking: CreateBookingResponse | null;
  loading: boolean;
  error: string | null;
}

export interface ServiceListResponse {
  servicos: BookingService[] | null;
}

export interface ProfessionalListResponse {
  prestadores: BookingProfessional[] | null;
}
