import { bookingStateLabel, formatBookingDateTime } from './booking-display';

describe('booking display (F-COV-25)', () => {
  it('labels every lifecycle state in Portuguese', () => {
    expect(bookingStateLabel('Active')).toBe('Confirmado');
    expect(bookingStateLabel('Cancelled')).toBe('Cancelado');
    expect(bookingStateLabel('NoShow')).toBe('Não compareceu');
    expect(bookingStateLabel('Rescheduled')).toBe('Remarcado');
    expect(bookingStateLabel('Executed')).toBe('Realizado');
    expect(bookingStateLabel(null)).toBe('');
  });

  it('formats date and time in pt-BR in the company time zone', () => {
    expect(formatBookingDateTime('2026-10-23T14:00:00Z', 'America/Cuiaba')).toBe('23/10/2026 às 10:00');
    expect(formatBookingDateTime('2026-10-23T14:00:00Z', 'UTC')).toBe('23/10/2026 às 14:00');
    expect(formatBookingDateTime('não é data')).toBe('');
  });
});
