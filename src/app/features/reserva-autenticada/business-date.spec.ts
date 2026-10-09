import { addDays, businessToday } from './business-date';

describe('business date (company timezone anchoring)', () => {
  it('uses the company wall-clock date around the UTC/local boundary of America/Cuiaba (UTC-4)', () => {
    expect(businessToday('America/Cuiaba', new Date('2026-10-11T00:59:00Z'))).toBe('2026-10-10'); // 20:59 local
    expect(businessToday('America/Cuiaba', new Date('2026-10-11T01:00:00Z'))).toBe('2026-10-10'); // 21:00 local
    expect(businessToday('America/Cuiaba', new Date('2026-10-11T03:59:00Z'))).toBe('2026-10-10'); // 23:59 local
    expect(businessToday('America/Cuiaba', new Date('2026-10-11T04:00:00Z'))).toBe('2026-10-11'); // 00:00 local
    expect(businessToday('America/Cuiaba', new Date('2026-10-11T04:01:00Z'))).toBe('2026-10-11'); // 00:01 local
  });

  it('is generic: positive and negative offsets, and a different zone gives a different day for the same instant', () => {
    const instant = new Date('2026-10-10T18:30:00Z');
    expect(businessToday('America/Sao_Paulo', instant)).toBe('2026-10-10');
    expect(businessToday('Pacific/Auckland', instant)).toBe('2026-10-11'); // 07:30 next day (UTC+13)
    expect(businessToday('Asia/Kolkata', new Date('2026-10-10T19:00:00Z'))).toBe('2026-10-11'); // 00:30 next day (UTC+5:30)
    expect(businessToday('UTC', instant)).toBe('2026-10-10');
  });

  it('adds days to a date-only value without off-by-one, across month/year and DST changes', () => {
    expect(addDays('2026-10-10', 0)).toBe('2026-10-10');
    expect(addDays('2026-10-10', 7)).toBe('2026-10-17');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(addDays('2026-10-17', -7)).toBe('2026-10-10');
    expect(addDays('2026-09-27', 7)).toBe('2026-10-04'); // NZ DST starts 2026-09-27: calendar days, not 24h blocks
  });
});
