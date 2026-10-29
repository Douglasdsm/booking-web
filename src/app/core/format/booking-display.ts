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

/** "23/10/2026 às 10:00" — pt-BR, 24 h, in `timeZone` (IANA) or the browser zone when it is unknown. */
export function formatBookingDateTime(iso: string, timeZone?: string | null): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const zone = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat('pt-BR', { ...zone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { ...zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
  return `${day} às ${time}`;
}
