import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { combineLatest, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { VisitorTokenService } from '../../../../core/auth/visitor-token.service';
import {
  BookingAvailableSlot,
  BookingProfessional,
  BookingService,
  BookingStep,
  CreateBookingRequest,
  TimeSpan,
} from '../../models/booking.models';
import { BookingApiService } from '../../services/booking-api.service';
import { BookingStore } from '../../store/booking.store';

const bookingSteps: BookingStep[] = [
  'cliente',
  'servicos',
  'prestadores',
  'agenda',
  'confirmacao',
  'sucesso',
];

const stepLabels: Record<BookingStep, string> = {
  servicos: 'Servicos',
  prestadores: 'Prestador',
  agenda: 'Horario',
  cliente: 'Cliente',
  confirmacao: 'Confirmacao',
  sucesso: 'Sucesso',
};

@Component({
  selector: 'app-booking-shell-page',
  imports: [RouterLink],
  templateUrl: './booking-shell.page.html',
  styleUrl: './booking-shell.page.scss',
})
export class BookingShellPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(BookingApiService);
  private readonly visitorToken = inject(VisitorTokenService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(BookingStore);
  protected readonly steps = bookingSteps;
  protected readonly labels = stepLabels;
  protected readonly currentStepIndex = computed(() =>
    this.steps.findIndex((step) => step === this.store.currentStep()),
  );
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly customerName = signal(this.store.customer()?.nome ?? '');
  protected readonly customerPhone = signal(this.store.customer()?.telefone ?? '');
  protected readonly isCustomerFormValid = computed(
    () => !!this.customerName().trim() && !!this.customerPhone().trim(),
  );
  protected readonly canConfirmBooking = computed(
    () =>
      !!this.store.selectedServices().length &&
      !!this.store.selectedProfessional() &&
      !!this.store.selectedDate() &&
      !!this.store.selectedSlot() &&
      !!this.store.customer()?.nome &&
      !!this.store.customer()?.telefone,
  );

  constructor() {
    const parentRoute = this.route.parent;

    if (!parentRoute) {
      return;
    }

    combineLatest([parentRoute.paramMap, this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([tenantParams, stepParams]) => {
        const slug = tenantParams.get('slug');
        const step = stepParams.get('etapa') as BookingStep | null;
        const tenantChanged = !!slug && slug !== this.store.slug();

        if (tenantChanged) {
          this.store.setSlug(slug);
          this.store.clearServices();
          this.store.setVisitorAccessToken(null);
          this.visitorToken.setToken(null);
        }

        if (!step || !this.steps.includes(step)) {
          void this.router.navigate(['../cliente'], { relativeTo: this.route });
          return;
        }

        this.store.setStep(step);

        if (step !== 'cliente' && !this.visitorToken.token()) {
          void this.router.navigate(['../cliente'], { relativeTo: this.route });
          return;
        }

        if (slug && step === 'servicos' && (!this.store.company() || !this.store.services().length)) {
          this.loadCompanyConfig(slug);
          return;
        }

        if (slug && step === 'prestadores' && !this.store.company()) {
          this.loadCompanyConfig(slug);
          return;
        }

        if (step === 'prestadores' && !tenantChanged) {
          this.loadProfessionals();
        }
      });
  }

  protected stepLink(step: BookingStep): string[] {
    return ['../', step];
  }

  protected isServiceSelected(service: BookingService): boolean {
    return this.store
      .selectedServices()
      .some((selectedService) => selectedService.servicoId === service.servicoId);
  }

  protected toggleService(service: BookingService): void {
    this.store.toggleService(service);
  }

  protected continueToProfessionals(): void {
    if (!this.store.selectedServices().length) {
      return;
    }

    void this.router.navigate(['../prestadores'], { relativeTo: this.route });
  }

  protected isProfessionalSelected(professional: BookingProfessional): boolean {
    return this.store.selectedProfessional()?.usuarioID === professional.usuarioID;
  }

  protected selectProfessional(professional: BookingProfessional): void {
    this.store.selectProfessional(professional);
  }

  protected continueToSchedule(): void {
    if (!this.store.selectedProfessional()) {
      return;
    }

    void this.router.navigate(['../agenda'], { relativeTo: this.route });
  }

  protected professionalInitial(professional: BookingProfessional): string {
    return professional.nome?.trim().charAt(0).toUpperCase() || 'P';
  }

  protected onDateChange(event: Event): void {
    const date = (event.target as HTMLInputElement).value;
    this.store.selectDate(date);

    if (!date) {
      this.store.setAvailableSlots([]);
      return;
    }

    this.loadAvailableSlots(date);
  }

  protected isSlotSelected(slot: BookingAvailableSlot): boolean {
    const selectedSlot = this.store.selectedSlot();

    return !!selectedSlot && this.slotKey(selectedSlot) === this.slotKey(slot);
  }

  protected selectSlot(slot: BookingAvailableSlot): void {
    this.store.selectSlot(slot);
  }

  protected continueToCustomer(): void {
    if (!this.store.selectedSlot()) {
      return;
    }

    void this.router.navigate(['../confirmacao'], { relativeTo: this.route });
  }

  protected onCustomerNameInput(event: Event): void {
    this.customerName.set((event.target as HTMLInputElement).value);
  }

  protected onCustomerPhoneInput(event: Event): void {
    this.customerPhone.set((event.target as HTMLInputElement).value);
  }

  protected submitCustomer(): void {
    const nome = this.customerName().trim();
    const telefone = this.customerPhone().trim();

    if (!nome || !telefone || this.store.loading()) {
      return;
    }

    this.store.setLoading(true);
    this.store.setError(null);

    this.api
      .createVisitor({ nome, telefone })
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => {
          const accessToken = response.tokens?.accessToken;

          if (!accessToken) {
            this.store.setError('Nao foi possivel autenticar o visitante.');
            return;
          }

          this.visitorToken.setToken(accessToken);
          this.store.setVisitorAccessToken(accessToken);
          this.store.setCustomer({ nome, telefone });
          void this.router.navigate(['../servicos'], { relativeTo: this.route });
        },
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Nao foi possivel salvar os dados do cliente.');
        },
      });
  }

  protected confirmBooking(): void {
    if (!this.canConfirmBooking()) {
      return;
    }

    if (!this.visitorToken.token()) {
      void this.router.navigate(['../cliente'], { relativeTo: this.route });
      return;
    }

    const payload = this.buildBookingPayload();

    if (!payload) {
      this.store.setError('Revise os dados do agendamento antes de confirmar.');
      return;
    }

    this.store.setLoading(true);
    this.store.setError(null);

    this.api
      .createBooking(payload)
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => {
          this.store.setCreatedBooking(response);
          void this.router.navigate(['../sucesso'], { relativeTo: this.route });
        },
        error: () => {
          this.store.setError('Nao foi possivel confirmar o agendamento. Tente novamente.');
        },
      });
  }

  protected startNewBooking(): void {
    const slug = this.store.slug() ?? this.route.parent?.snapshot.paramMap.get('slug') ?? '';

    this.store.reset();
    this.visitorToken.setToken(null);
    this.customerName.set('');
    this.customerPhone.set('');

    void this.router.navigate(['/agendar', slug, 'cliente']);
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'Nao selecionada';
    }

    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`));
  }

  protected formatSlotTime(value: BookingAvailableSlot['horaInicio']): string {
    if (typeof value === 'string') {
      return value.slice(0, 5);
    }

    const totalMinutes =
      value.totalMinutes !== undefined
        ? Math.trunc(value.totalMinutes)
        : (value.hours ?? 0) * 60 + (value.minutes ?? 0);
    const hours = Math.trunc(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  protected formatSlotTimeWithSeconds(value: BookingAvailableSlot['horaInicio']): string {
    if (typeof value === 'string') {
      return value.length === 5 ? `${value}:00` : value.slice(0, 8);
    }

    const totalMinutes =
      value.totalMinutes !== undefined
        ? Math.trunc(value.totalMinutes)
        : (value.hours ?? 0) * 60 + (value.minutes ?? 0);
    const hours = Math.trunc(totalMinutes / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    const seconds = (value.seconds ?? 0).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  private loadCompanyConfig(slug: string): void {
    this.store.setLoading(true);
    this.store.setError(null);

    this.api
      .getConfig(slug)
      .pipe(
        switchMap((company) => {
          this.store.setCompany(company);

          return this.api.getServices(company.pessoaJuridicaID).pipe(
            switchMap((serviceResponse) => {
              this.store.setServices(serviceResponse.servicos ?? []);

              if (this.store.currentStep() !== 'prestadores') {
                return of(null);
              }

              return this.api.getProfessionals({
                pessoaJuridicaID: company.pessoaJuridicaID,
                filialID: company.filialID,
              });
            }),
          );
        }),
        finalize(() => this.store.setLoading(false)),
      )
      .subscribe({
        next: (response) => {
          if (response) {
            this.store.setProfessionals(response.prestadores ?? []);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Nao foi possivel carregar os dados do agendamento.');
        },
      });
  }

  private loadProfessionals(): void {
    const company = this.store.company();

    if (!company || this.store.professionals().length) {
      return;
    }

    this.store.setLoading(true);
    this.store.setError(null);

    this.api
      .getProfessionals({
        pessoaJuridicaID: company.pessoaJuridicaID,
        filialID: company.filialID,
      })
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => this.store.setProfessionals(response.prestadores ?? []),
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Nao foi possivel carregar os prestadores.');
        },
      });
  }

  private loadAvailableSlots(date: string): void {
    const professional = this.store.selectedProfessional();
    const duration = this.store.totalDurationMinutes();

    if (!professional || !duration) {
      this.store.setAvailableSlots([]);
      return;
    }

    this.store.setLoading(true);
    this.store.setError(null);

    this.api
      .getAvailableSlots({
        prestadorId: professional.usuarioID,
        data: `${date}T00:00:00.000Z`,
        duracaoMinutos: duration,
      })
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (slots) => this.store.setAvailableSlots(slots),
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Nao foi possivel carregar os horarios.');
        },
      });
  }

  private buildBookingPayload(): CreateBookingRequest | null {
    const company = this.store.company();
    const professional = this.store.selectedProfessional();
    const selectedDate = this.store.selectedDate();
    const selectedSlot = this.store.selectedSlot();
    const selectedServices = this.store.selectedServices();

    if (!company || !professional || !selectedDate || !selectedSlot || !selectedServices.length) {
      return null;
    }

    return {
      isCliente: false,
      dataHoraAgendamento: `${selectedDate}T${this.formatSlotTimeWithSeconds(selectedSlot.horaInicio)}`,
      duracaoMinutos: this.store.totalDurationMinutes(),
      usuarioID: 0,
      pessoaJuridicaID: company.pessoaJuridicaID,
      filialID: company.filialID,
      prestadorID: professional.usuarioID,
      ordemServico: {
        valorTotal: this.store.totalPrice(),
        descontoTotal: 0,
        usuarioID: 0,
        pessoaJuridicaID: company.pessoaJuridicaID,
        filialID: company.filialID,
        itens: selectedServices.map((service) => ({
          valor: service.preco,
          desconto: 0,
          servicoID: service.servicoId,
          tabelaPrecosID: service.tabelaPrecosID,
        })),
      },
    };
  }

  protected slotKey(slot: BookingAvailableSlot): string {
    return `${this.timeKey(slot.horaInicio)}-${this.timeKey(slot.horaFim)}`;
  }

  private timeKey(value: TimeSpan | string): string {
    return typeof value === 'string' ? value : `${value.ticks}-${value.hours}-${value.minutes}`;
  }
}
