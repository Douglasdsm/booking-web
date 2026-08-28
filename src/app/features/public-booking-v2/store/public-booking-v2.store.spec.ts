import { TestBed } from '@angular/core/testing';

import { PublicBookingV2Store } from './public-booking-v2.store';

describe('PublicBookingV2Store', () => {
  let store: PublicBookingV2Store;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(PublicBookingV2Store);
  });

  it('publicBookingEnabled() is false until a profile with Enabled=true is set', () => {
    expect(store.publicBookingEnabled()).toBe(false);

    store.setEsusProfile({ esusId: 1, tipo: 'Empresa', publicBookingEnabled: false });
    expect(store.publicBookingEnabled()).toBe(false);

    store.setEsusProfile({ esusId: 1, tipo: 'Empresa', publicBookingEnabled: true });
    expect(store.publicBookingEnabled()).toBe(true);
  });

  it('selecting a new service offer clears any previously selected slot/availability', () => {
    const slot = {
      serviceOfferId: 1,
      serviceLabel: 'Corte',
      prestadorId: 1,
      executionEsusId: 1,
      executionLocationId: 1,
      startUtc: '2027-01-01T10:00:00Z',
      endUtc: '2027-01-01T11:00:00Z',
      durationMinutes: 60,
      currentPrice: 80,
      currency: 'BRL',
    };
    store.setAvailabilityItems([slot]);
    store.selectSlot(slot);
    expect(store.selectedSlot()).toEqual(slot);

    store.selectServiceOffer({ id: 2, name: 'Barba', description: '', basePrice: 40, baseDurationMinutes: 30 });

    expect(store.selectedSlot()).toBeNull();
    expect(store.availabilityItems()).toEqual([]);
  });

  it('clearAvailabilityAfterConflict clears the stale slot without touching visitor data', () => {
    store.setVisitorName('Visitante');
    store.setVisitorPhone('65999990000');
    store.selectSlot({
      serviceOfferId: 1,
      serviceLabel: 'Corte',
      prestadorId: 1,
      executionEsusId: 1,
      executionLocationId: 1,
      startUtc: '2027-01-01T10:00:00Z',
      endUtc: '2027-01-01T11:00:00Z',
      durationMinutes: 60,
      currentPrice: 80,
      currency: 'BRL',
    });

    store.clearAvailabilityAfterConflict();

    expect(store.selectedSlot()).toBeNull();
    expect(store.availabilityItems()).toEqual([]);
    expect(store.visitorName()).toBe('Visitante');
    expect(store.visitorPhone()).toBe('65999990000');
  });

  it('reset() returns to the initial idle state', () => {
    store.setVisitorName('Visitante');
    store.setSubmitting();

    store.reset();

    expect(store.visitorName()).toBe('');
    expect(store.submitStatus()).toBe('idle');
    expect(store.esusId()).toBeNull();
  });
});
