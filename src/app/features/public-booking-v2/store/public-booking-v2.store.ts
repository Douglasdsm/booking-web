import { computed, Injectable, signal } from '@angular/core';

import {
  BookingPreview,
  PublicBookingError,
  PublicBookingSubmissionResult,
  PublicBookingStatusResult,
  PublicEsusProfile,
  PublicServiceOffer,
} from '../models/public-booking-v2.models';

export type PublicBookingV2SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface PublicBookingV2State {
  esusId: number | null;
  esusProfile: PublicEsusProfile | null;
  serviceOffers: PublicServiceOffer[];
  selectedServiceOffer: PublicServiceOffer | null;
  availabilityItems: BookingPreview[];
  selectedSlot: BookingPreview | null;
  visitorName: string;
  visitorPhone: string;
  submitStatus: PublicBookingV2SubmitStatus;
  result: PublicBookingSubmissionResult | null;
  submitError: PublicBookingError | null;
  loading: boolean;
  loadError: PublicBookingError | null;
  publicStatus: PublicBookingStatusResult | null;
}

const initialState: PublicBookingV2State = {
  esusId: null,
  esusProfile: null,
  serviceOffers: [],
  selectedServiceOffer: null,
  availabilityItems: [],
  selectedSlot: null,
  visitorName: '',
  visitorPhone: '',
  submitStatus: 'idle',
  result: null,
  submitError: null,
  loading: false,
  loadError: null,
  publicStatus: null,
};

/**
 * Phase 37: minimal state (plan §"STATE MANAGEMENT") — no store/framework beyond Angular Signals, the
 * SAME pattern `BookingStore` (V1) already uses. Deliberately does NOT hold price/duration/owner/
 * Debtor/Customer authority anywhere — every field here is either server-returned data or the visitor's
 * own raw input; the backend alone decides what any of it means (plan §"PRINCÍPIO ARQUITETURAL").
 */
@Injectable({ providedIn: 'root' })
export class PublicBookingV2Store {
  private readonly state = signal<PublicBookingV2State>(initialState);

  readonly esusId = computed(() => this.state().esusId);
  readonly esusProfile = computed(() => this.state().esusProfile);
  readonly serviceOffers = computed(() => this.state().serviceOffers);
  readonly selectedServiceOffer = computed(() => this.state().selectedServiceOffer);
  readonly availabilityItems = computed(() => this.state().availabilityItems);
  readonly selectedSlot = computed(() => this.state().selectedSlot);
  readonly visitorName = computed(() => this.state().visitorName);
  readonly visitorPhone = computed(() => this.state().visitorPhone);
  readonly submitStatus = computed(() => this.state().submitStatus);
  readonly result = computed(() => this.state().result);
  readonly submitError = computed(() => this.state().submitError);
  readonly loading = computed(() => this.state().loading);
  readonly loadError = computed(() => this.state().loadError);
  readonly publicStatus = computed(() => this.state().publicStatus);

  readonly publicBookingEnabled = computed(() => this.state().esusProfile?.publicBookingEnabled === true);

  setEsusId(esusId: number): void {
    this.patch({ esusId });
  }

  setEsusProfile(esusProfile: PublicEsusProfile): void {
    this.patch({ esusProfile });
  }

  setServiceOffers(serviceOffers: PublicServiceOffer[]): void {
    this.patch({ serviceOffers });
  }

  selectServiceOffer(selectedServiceOffer: PublicServiceOffer): void {
    this.patch({ selectedServiceOffer, selectedSlot: null, availabilityItems: [] });
  }

  setAvailabilityItems(availabilityItems: BookingPreview[]): void {
    this.patch({ availabilityItems });
  }

  /** Called after a `SlotUnavailable` conflict — the stale slot is no longer trustworthy and must not
   * be resubmitted as-is (plan §"CONCORRÊNCIA NORMAL": "não escolher outro horário sozinho"). */
  clearAvailabilityAfterConflict(): void {
    this.patch({ selectedSlot: null, availabilityItems: [] });
  }

  selectSlot(selectedSlot: BookingPreview): void {
    this.patch({ selectedSlot });
  }

  setVisitorName(visitorName: string): void {
    this.patch({ visitorName });
  }

  setVisitorPhone(visitorPhone: string): void {
    this.patch({ visitorPhone });
  }

  setSubmitting(): void {
    this.patch({ submitStatus: 'submitting', submitError: null });
  }

  setSubmitSuccess(result: PublicBookingSubmissionResult): void {
    this.patch({ submitStatus: 'success', result, submitError: null });
  }

  setSubmitError(submitError: PublicBookingError): void {
    this.patch({ submitStatus: 'error', submitError });
  }

  setPublicStatus(publicStatus: PublicBookingStatusResult): void { this.patch({ publicStatus }); }

  setLoading(loading: boolean): void {
    this.patch({ loading });
  }

  setLoadError(loadError: PublicBookingError | null): void {
    this.patch({ loadError });
  }

  reset(): void {
    this.state.set(initialState);
  }

  private patch(partial: Partial<PublicBookingV2State>): void {
    this.state.update((state) => ({ ...state, ...partial }));
  }
}
