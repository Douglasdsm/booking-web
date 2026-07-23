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
  onlyDigits,
  resolveInitialReturnUrl,
} from '../../utils/public-auth-utils';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrl: '../login-page/login.page.scss',
})
export class RegisterPage {
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
  protected readonly loginCommands = computed(() => ['/entrar']);
  protected readonly loginQueryParams = computed(() =>
    this.returnUrl() ? { returnUrl: this.returnUrl() } : null,
  );

  protected readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    cpfCnpj: [''],
    user: ['', [Validators.required]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', [Validators.required]],
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

    if (this.form.invalid || this.form.controls.senha.value !== this.form.controls.confirmarSenha.value) {
      this.form.markAllAsTouched();
      this.error.set(
        this.form.controls.senha.value !== this.form.controls.confirmarSenha.value
          ? 'As senhas informadas nao conferem.'
          : null,
      );
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();

    this.auth
      .register({
        nome: value.nome.trim(),
        email: value.email.trim(),
        phone: onlyDigits(value.phone),
        cpfCnpj: onlyDigits(value.cpfCnpj),
        user: value.user.trim(),
        senha: value.senha,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(consumeAuthReturnUrl(this.returnUrlService, this.returnUrl()));
        },
        error: (error) => {
          this.error.set(extractApiErrorMessage(error, 'Nao foi possivel criar a conta.'));
        },
      });
  }
}
