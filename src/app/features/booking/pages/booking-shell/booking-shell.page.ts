import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import { VisitorTokenService } from '../../../../core/auth/visitor-token.service';
import { BookingClienteStepComponent } from '../../components/booking-cliente-step/booking-cliente-step.component';
import { BookingConfirmacaoStepComponent } from '../../components/booking-confirmacao-step/booking-confirmacao-step.component';
import {
  BookingDataHorarioStepComponent,
  BookingDateOption,
} from '../../components/booking-data-horario-step/booking-data-horario-step.component';
import { BookingFooterActionsComponent } from '../../components/booking-footer-actions/booking-footer-actions.component';
import { BookingLayoutComponent } from '../../components/booking-layout/booking-layout.component';
import { BookingProfissionalStepComponent } from '../../components/booking-profissional-step/booking-profissional-step.component';
import { BookingServicoStepComponent } from '../../components/booking-servico-step/booking-servico-step.component';
import { BookingStepperComponent } from '../../components/booking-stepper/booking-stepper.component';
import { BookingSucessoStepComponent } from '../../components/booking-sucesso-step/booking-sucesso-step.component';
import {
  BookingAvailableSlot,
  BookingProfessional,
  BookingService,
  BookingStep,
  CreateBookingRequest,
  TimeSpan,
} from '../../models/booking.models';
import { BookingApiService } from '../../services/booking-api.service';
import { BookingThemeService } from '../../services/booking-theme.service';
import { BookingStore } from '../../store/booking.store';

const bookingSteps: BookingStep[] = [
  'cliente',
  'servicos',
  'prestadores',
  'agenda',
  'confirmacao',
  'sucesso',
];

@Component({
  selector: 'app-booking-shell-page',
  imports: [
    BookingClienteStepComponent,
    BookingConfirmacaoStepComponent,
    BookingDataHorarioStepComponent,
    BookingFooterActionsComponent,
    BookingLayoutComponent,
    BookingProfissionalStepComponent,
    BookingServicoStepComponent,
    BookingStepperComponent,
    BookingSucessoStepComponent,
  ],
  templateUrl: './booking-shell.page.html',
  styleUrl: './booking-shell.page.scss',
})
export class BookingShellPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(BookingApiService);
  private readonly theme = inject(BookingThemeService);
  private readonly visitorToken = inject(VisitorTokenService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(BookingStore);
  protected readonly steps = bookingSteps;
  protected readonly currentStepIndex = computed(() =>
    Math.max(0, this.steps.findIndex((step) => step === this.store.currentStep())),
  );
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly dateOptions = computed<BookingDateOption[]>(() => this.buildDateOptions());
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
  protected readonly selectedSlotKey = computed(() => {
    const slot = this.store.selectedSlot();

    return slot ? this.slotKey(slot) : null;
  });
  protected readonly continueDisabled = computed(() => {
    if (this.store.loading()) {
      return true;
    }

    switch (this.store.currentStep()) {
      case 'cliente':
        return !this.isCustomerFormValid();
      case 'servicos':
        return !this.store.selectedServices().length;
      case 'prestadores':
        return !this.store.selectedProfessional();
      case 'agenda':
        return !this.store.selectedSlot();
      case 'confirmacao':
        return !this.canConfirmBooking();
      case 'sucesso':
        return false;
    }
  });
  protected readonly backDisabled = computed(() => this.store.currentStep() === 'cliente');
  protected readonly companyLogoUrl = computed(() => {
    const company = this.store.company();

    return company?.logoUrl || company?.imageUrl || company?.imagemUrl || company?.caminhoImagem || company?.url || null;
  });

  constructor() {
    this.theme.applyDefaultTheme();

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

        if (slug && (!this.store.company() || tenantChanged)) {
          this.loadCompany(slug, step !== 'cliente');
          return;
        }

        if (slug && step === 'servicos' && !this.store.services().length) {
          this.loadServices();
          return;
        }

        if (step === 'prestadores') {
          this.loadProfessionals();
        }
      });
  }

  protected toggleService(service: BookingService): void {
    this.store.toggleService(service);
  }

  protected selectProfessional(professional: BookingProfessional): void {
    this.store.selectProfessional(professional);
  }

  protected selectDate(date: string): void {
    this.store.selectDate(date);

    if (!date) {
      this.store.setAvailableSlots([]);
      return;
    }

    this.loadAvailableSlots(date);
  }

  protected selectSlot(slot: BookingAvailableSlot): void {
    this.store.selectSlot(slot);
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
            this.store.setError('Não foi possível autenticar o visitante.');
            return;
          }

          this.visitorToken.setToken(accessToken);
          this.store.setVisitorAccessToken(accessToken);
          this.store.setCustomer({ nome, telefone });
          void this.router.navigate(['../servicos'], { relativeTo: this.route });
        },
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Não foi possível salvar os dados do cliente.');
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
          this.store.setError('Não foi possível confirmar o agendamento. Tente novamente.');
        },
      });
  }

  protected footerContinueText(): string {
    if (this.store.loading() && this.store.currentStep() === 'cliente') {
      return 'SALVANDO...';
    }

    if (this.store.loading() && this.store.currentStep() === 'confirmacao') {
      return 'CONFIRMANDO...';
    }

    if (this.store.currentStep() === 'confirmacao') {
      return 'CONFIRMAR AGENDAMENTO';
    }

    if (this.store.currentStep() === 'sucesso') {
      return 'NOVO AGENDAMENTO';
    }

    return 'CONTINUAR';
  }

  protected goBack(): void {
    if (this.store.currentStep() === 'sucesso') {
      this.startNewBooking();
      return;
    }

    const previousStep = this.steps[this.currentStepIndex() - 1];

    if (!previousStep) {
      return;
    }

    void this.router.navigate(['../', previousStep], { relativeTo: this.route });
  }

  protected continueCurrentStep(): void {
    switch (this.store.currentStep()) {
      case 'cliente':
        this.submitCustomer();
        break;
      case 'servicos':
        if (this.store.selectedServices().length) {
          void this.router.navigate(['../prestadores'], { relativeTo: this.route });
        }
        break;
      case 'prestadores':
        if (this.store.selectedProfessional()) {
          void this.router.navigate(['../agenda'], { relativeTo: this.route });
        }
        break;
      case 'agenda':
        if (this.store.selectedSlot()) {
          void this.router.navigate(['../confirmacao'], { relativeTo: this.route });
        }
        break;
      case 'confirmacao':
        this.confirmBooking();
        break;
      case 'sucesso':
        this.startNewBooking();
        break;
    }
  }

  private startNewBooking(): void {
    const slug = this.store.slug() ?? this.route.parent?.snapshot.paramMap.get('slug') ?? '';

    this.store.reset();
    this.visitorToken.setToken(null);
    this.customerName.set('');
    this.customerPhone.set('');
    this.theme.applyDefaultTheme();

    void this.router.navigate(['/agendar', slug, 'cliente']);
  }

  private loadCompany(slug: string, shouldLoadServices: boolean): void {
    this.store.setLoading(true);
    this.store.setError(null);

    this.api
      .getConfig(slug)
      .pipe(
        switchMap((company) => {
          this.store.setCompany(company);
          this.theme.loadAndApplyPublicTheme(company.pessoaJuridicaID).subscribe();

          return shouldLoadServices ? this.api.getServices(company.pessoaJuridicaID) : of(null);
        }),
        finalize(() => this.store.setLoading(false)),
      )
      .subscribe({
        next: (response) => {
          if (response) {
            this.store.setServices(response.servicos ?? []);
          }
        },
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Não foi possível carregar os dados do agendamento.');
        },
      });
  }

  private loadServices(): void {
    const company = this.store.company();

    if (!company) {
      return;
    }

    this.store.setLoading(true);
    this.store.setError(null);

    this.api
      .getServices(company.pessoaJuridicaID)
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (response) => this.store.setServices(response.servicos ?? []),
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Não foi possível carregar os serviços.');
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
          this.store.setError(error.message || 'Não foi possível carregar os profissionais.');
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
        prestadorId: professional.id,
        data: `${date}T00:00:00.000Z`,
        duracaoMinutos: duration,
      })
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: (slots) => this.store.setAvailableSlots(slots),
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Não foi possível carregar os horários.');
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
      prestadorID: professional.id,
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

  private formatSlotTimeWithSeconds(value: BookingAvailableSlot['horaInicio']): string {
    if (typeof value === 'string') {
      return value.length === 5 ? `${value}:00` : value.slice(0, 8);
    }

    const totalMinutes =
      value.totalMinutes !== undefined
        ? Math.trunc(value.totalMinutes)
        : (value.hours ?? 0) * 60 + (value.minutes ?? 0);
    const hours = Math.trunc(totalMinutes / 60).toString().padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    const seconds = (value.seconds ?? 0).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  private slotKey(slot: BookingAvailableSlot): string {
    return `${this.timeKey(slot.horaInicio)}-${this.timeKey(slot.horaFim)}`;
  }

  private timeKey(value: TimeSpan | string): string {
    return typeof value === 'string' ? value : `${value.ticks}-${value.hours}-${value.minutes}`;
  }

  private buildDateOptions(): BookingDateOption[] {
    const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' });
    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
    const today = new Date(`${this.today}T00:00:00.000Z`);

    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + offset);

      return {
        value: date.toISOString().slice(0, 10),
        day: weekdayFormatter.format(date).replace('.', ''),
        label: date.getUTCDate().toString().padStart(2, '0'),
        month: monthFormatter.format(date).replace('.', ''),
      };
    });
  }
}
