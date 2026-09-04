import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthReturnUrlService } from '../../../../core/auth/auth-return-url.service';
import { PermanentAuthService } from '../../../../core/auth/permanent-auth.service';
import { BookingThemeService } from '../../../booking/services/booking-theme.service';
import {
  consumeAuthReturnUrl,
  extractApiErrorMessage,
  resolveInitialReturnUrl,
} from '../../utils/public-auth-utils';
import {
  normalizeUsername,
  usernameValidationMessage,
  usernameValidator,
} from '../../utils/username-validator';

@Component({
  selector: 'app-define-username-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './define-username.page.html',
  styleUrl: '../login-page/login.page.scss',
})
export class DefineUsernamePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(PermanentAuthService);
  private readonly returnUrlService = inject(AuthReturnUrlService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly theme = inject(BookingThemeService);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);
  protected readonly returnUrl = signal<string | null>(
    resolveInitialReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), this.returnUrlService),
  );
  protected readonly loginCommands = computed(() => ['/entrar']);
  protected readonly loginQueryParams = computed(() =>
    this.returnUrl() ? { returnUrl: this.returnUrl() } : null,
  );

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [usernameValidator]],
  });

  constructor() {
    if (!this.returnUrl()) {
      this.theme.applyDefaultTheme();
    }
  }

  ngOnInit(): void {
    if (!this.auth.hasSession()) {
      void this.router.navigate(['/entrar'], { queryParams: this.loginQueryParams() ?? undefined });
      return;
    }

    this.auth
      .usernameStatus()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (status) => {
          if (!status.podeDefinirUsername) {
            void this.router.navigateByUrl(consumeAuthReturnUrl(this.returnUrlService, this.returnUrl()));
          }
        },
        error: (error) => {
          this.error.set(extractApiErrorMessage(error, 'Nao foi possivel consultar sua conta.'));
        },
      });
  }

  protected submit(): void {
    if (this.submitting() || this.loading()) {
      return;
    }

    this.form.controls.username.setValue(normalizeUsername(this.form.controls.username.value), {
      emitEvent: false,
    });

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth
      .defineUsername(this.form.controls.username.value)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.success.set(true);
          void this.router.navigateByUrl(consumeAuthReturnUrl(this.returnUrlService, this.returnUrl()));
        },
        error: (error) => {
          this.error.set(extractApiErrorMessage(error, 'Nao foi possivel definir o username.'));
        },
      });
  }

  protected usernameErrorMessage(): string {
    return usernameValidationMessage(this.form.controls.username.errors);
  }
}
