import { computed, Injectable, signal } from '@angular/core';

import {
  BookingAvailableSlot,
  BookingCompanyConfig,
  BookingCustomer,
  BookingProfessional,
  BookingService,
  BookingState,
  BookingStep,
  CreateBookingResponse,
} from '../models/booking.models';

const initialState: BookingState = {
  slug: null,
  currentStep: 'servicos',
  company: null,
  services: [],
  professionals: [],
  availableSlots: [],
  selectedServices: [],
  selectedProfessional: null,
  selectedDate: null,
  selectedSlot: null,
  customer: null,
  createdBooking: null,
  loading: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class BookingStore {
  private readonly state = signal<BookingState>(initialState);

  readonly snapshot = this.state.asReadonly();
  readonly slug = computed(() => this.state().slug);
  readonly currentStep = computed(() => this.state().currentStep);
  readonly company = computed(() => this.state().company);
  readonly services = computed(() => this.state().services);
  readonly professionals = computed(() => this.state().professionals);
  readonly availableSlots = computed(() => this.state().availableSlots);
  readonly selectedServices = computed(() => this.state().selectedServices);
  readonly selectedProfessional = computed(() => this.state().selectedProfessional);
  readonly selectedDate = computed(() => this.state().selectedDate);
  readonly selectedSlot = computed(() => this.state().selectedSlot);
  readonly customer = computed(() => this.state().customer);
  readonly createdBooking = computed(() => this.state().createdBooking);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  readonly totalDurationMinutes = computed(() =>
    this.selectedServices().reduce((total, service) => total + service.duracaoMinutos, 0),
  );

  readonly totalPrice = computed(() =>
    this.selectedServices().reduce((total, service) => total + service.preco, 0),
  );

  setSlug(slug: string): void {
    this.patch({ slug });
  }

  setStep(currentStep: BookingStep): void {
    this.patch({ currentStep });
  }

  setCompany(company: BookingCompanyConfig): void {
    this.patch({ company });
  }

  setServices(services: BookingService[]): void {
    this.patch({ services });
  }

  setProfessionals(professionals: BookingProfessional[]): void {
    this.patch({ professionals });
  }

  setAvailableSlots(availableSlots: BookingAvailableSlot[]): void {
    this.patch({ availableSlots });
  }

  toggleService(service: BookingService): void {
    const selectedServices = this.selectedServices();
    const exists = selectedServices.some((item) => item.servicoId === service.servicoId);

    this.patch({
      selectedServices: exists
        ? selectedServices.filter((item) => item.servicoId !== service.servicoId)
        : [...selectedServices, service],
      selectedSlot: null,
      availableSlots: [],
    });
  }

  selectProfessional(selectedProfessional: BookingProfessional): void {
    this.patch({ selectedProfessional, selectedSlot: null, availableSlots: [] });
  }

  selectDate(selectedDate: string): void {
    this.patch({ selectedDate, selectedSlot: null });
  }

  selectSlot(selectedSlot: BookingAvailableSlot): void {
    this.patch({ selectedSlot });
  }

  setCustomer(customer: BookingCustomer): void {
    this.patch({ customer });
  }

  setCreatedBooking(createdBooking: CreateBookingResponse): void {
    this.patch({ createdBooking });
  }

  setLoading(loading: boolean): void {
    this.patch({ loading });
  }

  setError(error: string | null): void {
    this.patch({ error });
  }

  reset(): void {
    this.state.set(initialState);
  }

  private patch(partial: Partial<BookingState>): void {
    this.state.update((state) => ({ ...state, ...partial }));
  }
}
