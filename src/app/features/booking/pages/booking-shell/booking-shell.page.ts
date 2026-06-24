import { Component, computed, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { combineLatest } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BookingService, BookingStep } from '../../models/booking.models';
import { BookingApiService } from '../../services/booking-api.service';
import { BookingStore } from '../../store/booking.store';

const bookingSteps: BookingStep[] = [
  'servicos',
  'prestadores',
  'agenda',
  'cliente',
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly store = inject(BookingStore);
  protected readonly steps = bookingSteps;
  protected readonly labels = stepLabels;
  protected readonly currentStepIndex = computed(() =>
    this.steps.findIndex((step) => step === this.store.currentStep()),
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

        if (slug && slug !== this.store.slug()) {
          this.store.setSlug(slug);
          this.store.clearServices();
          this.loadCompanyConfig(slug);
        }

        if (!step || !this.steps.includes(step)) {
          void this.router.navigate(['../servicos'], { relativeTo: this.route });
          return;
        }

        this.store.setStep(step);
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

          return this.api.getServices(company.pessoaJuridicaID);
        }),
        finalize(() => this.store.setLoading(false)),
      )
      .subscribe({
        next: (response) => this.store.setServices(response.servicos ?? []),
        error: (error: HttpErrorResponse) => {
          this.store.setError(error.message || 'Nao foi possivel carregar os servicos.');
        },
      });
  }
}
