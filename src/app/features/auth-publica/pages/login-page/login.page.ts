import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthReturnUrlService } from '../../../../core/auth/auth-return-url.service';
import { PermanentAuthService } from '../../../../core/auth/permanent-auth.service';
import { BookingThemeService } from '../../../booking/services/booking-theme.service';
import {
  consumeAuthReturnUrl,
  extractApiErrorMessage,
  PUBLIC_AUTH_FALLBACK_ROUTE,
  resolveInitialReturnUrl,
} from '../../utils/public-auth-utils';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(PermanentAuthService);
  private readonly returnUrlService = inject(AuthReturnUrlService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly theme = inject(BookingThemeService);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly returnUrl = signal<string | null>(
    resolveInitialReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), this.returnUrlService),
  );
  protected readonly registerCommands = computed(() => ['/criar-conta']);
  protected readonly registerQueryParams = computed(() =>
    this.returnUrl() ? { returnUrl: this.returnUrl() } : null,
  );

  protected readonly form = this.fb.nonNullable.group({
    user: ['', [Validators.required]],
    senha: ['', [Validators.required]],
  });

  constructor() {
    if (!this.returnUrl()) {
      this.theme.applyDefaultTheme();
    }
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();

    this.auth
      .login({ user: value.user.trim(), senha: value.senha })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(consumeAuthReturnUrl(this.returnUrlService, this.returnUrl()));
        },
        error: (error) => {
          this.error.set(
            error?.status === 401
              ? 'Usuario ou senha invalidos.'
              : extractApiErrorMessage(error, 'Nao foi possivel entrar. Tente novamente.'),
          );
        },
      });
  }

  protected fallbackRoute(): string {
    return PUBLIC_AUTH_FALLBACK_ROUTE;
  }
}
