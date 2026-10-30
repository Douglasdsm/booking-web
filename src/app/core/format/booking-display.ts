/**
 * How a booking is shown to a person: Portuguese labels for the derived lifecycle state (BookingLifecycleState in the API)
 * and dates/times in pt-BR, in the company's time zone when it is known. F-COV-25 (UX audit P1-04): the pages printed
 * "Active" and "10/23/26, 10:00 AM".
 */
const STATE_LABELS: Record<string, string> = {
  Active: 'Confirmado',
  Cancelled: 'Cancelado',
  NoShow: 'Não compareceu',
  Rescheduled: 'Remarcado',
  Superseded: 'Substituído',
  Executed: 'Realizado',
};

export function bookingStateLabel(state: string | null | undefined): string {
  if (!state) return '';
  return STATE_LABELS[state] ?? state;
}

// BookingLifecycleEventType (API, closed set) — the timeline printed "HoldRequested", "BookingCreated"
const EVENT_LABELS: Record<string, string> = {
  BookingCreated: 'Agendamento criado',
  HoldRequested: 'Horário reservado',
  GuaranteeSatisfied: 'Garantia confirmada',
  ReconfirmationRequested: 'Confirmação solicitada',
  ReconfirmationResponded: 'Confirmação respondida',
  WaitlistEntryCreated: 'Entrada na lista de espera',
  OpportunityOffered: 'Vaga oferecida',
  Cancelled: 'Cancelado',
  NoShow: 'Não compareceu',
  RescheduledTo: 'Remarcado para outro horário',
  RescheduledFrom: 'Remarcação de outro horário',
  ReplacedBy: 'Substituído por outro agendamento',
  ReplacementOf: 'Substitui outro agendamento',
  ServiceOrderOpened: 'Atendimento iniciado',
  ServiceOrderClosed: 'Atendimento encerrado',
  ServiceOrderCompleted: 'Atendimento concluído',
};

export function bookingEventLabel(eventType: string | null | undefined): string {
  if (!eventType) return '';
  return EVENT_LABELS[eventType] ?? eventType;
}

/** "23/10/2026 às 10:00" — pt-BR, 24 h, in `timeZone` (IANA) or the browser zone when it is unknown. */
export function formatBookingDateTime(iso: string, timeZone?: string | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const zone = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat('pt-BR', { ...zone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { ...zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${day} às ${time}`;
}
