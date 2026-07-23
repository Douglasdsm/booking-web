import { NgClass } from '@angular/common';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthReturnUrlService } from '../../../../core/auth/auth-return-url.service';
import { PermanentAuthService } from '../../../../core/auth/permanent-auth.service';
import { PublicConvite, PublicConviteStatus, PublicConviteTipo } from '../../models/public-convite.models';
import { PublicConviteStore } from '../../store/public-convite.store';
import {
  booleanBusinessLabel,
  formatPublicConviteDate,
  maskCpf,
  publicConviteScopeLabel,
  publicConviteScopeLabelsFromFlags,
  publicConviteStatusLabel,
  publicConviteTermLabel,
  publicConviteTipoLabel,
} from '../../utils/public-convite-formatters';

@Component({
  selector: 'app-public-convite-page',
  imports: [NgClass],
  templateUrl: './public-convite.page.html',
  styleUrl: './public-convite.page.scss',
})
export class PublicConvitePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authReturnUrl = inject(AuthReturnUrlService);
  private readonly permanentAuth = inject(PermanentAuthService);
  protected readonly store = inject(PublicConviteStore);

  protected readonly convite = this.store.convite;
  protected readonly viewState = this.store.viewState;
  protected readonly acceptForm = this.store.acceptForm;
  protected readonly accepting = this.store.accepting;
  protected readonly acceptValidationErrors = this.store.acceptValidationErrors;
  protected readonly acceptTemporaryError = this.store.acceptTemporaryError;
  protected readonly acceptSuccess = this.store.acceptSuccess;
  protected readonly providerAcceptSuccess = this.store.providerAcceptSuccess;
  protected readonly termUpdated = this.store.termUpdated;
  protected readonly canSubmitClientAccept = this.store.canSubmitClientAccept;
  protected readonly canSubmitProviderAccept = this.store.canSubmitProviderAccept;
  protected readonly isAuthenticated = this.permanentAuth.isAuthenticated;
  protected readonly showAuthActions = computed(
    () => this.convite()?.status === PublicConviteStatus.Pendente && !this.isAuthenticated(),
  );
  protected readonly showAuthenticatedActions = computed(
    () =>
      this.convite()?.status === PublicConviteStatus.Pendente &&
      this.isAuthenticated() &&
      !this.store.canShowClientAcceptForm() &&
      !this.store.canShowProviderAcceptForm(),
  );
  protected readonly showClientAcceptForm = this.store.canShowClientAcceptForm;
  protected readonly showProviderAcceptForm = this.store.canShowProviderAcceptForm;
  protected readonly scopeLabels = computed(() =>
    (this.convite()?.escoposObrigatorios ?? []).map((scope) => publicConviteScopeLabel(scope)),
  );
  protected readonly acceptedScopeLabels = computed(() =>
    publicConviteScopeLabelsFromFlags(this.acceptSuccess()?.escoposAutorizados ?? null),
  );

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.store.load(params.get('token'));
    });
  }

  protected pageTitle(): string {
    switch (this.viewState()) {
      case 'loading':
        return 'Carregando convite';
      case 'pending':
        return 'Convite pendente';
      case 'accepted':
        return 'Convite aceito';
      case 'rejected':
        return 'Convite recusado';
      case 'expired':
        return 'Convite expirado';
      case 'canceled':
        return 'Convite cancelado';
      case 'not-found':
      case 'invalid-token':
        return 'Convite nao encontrado';
      case 'temporary-error':
        return 'Nao foi possivel carregar';
      default:
        return 'Convite';
    }
  }

  protected pageMessage(): string {
    switch (this.viewState()) {
      case 'pending':
        return 'Revise as informacoes antes de entrar ou criar uma conta para continuar.';
      case 'accepted':
        return 'Este convite ja foi aceito e nao permite uma nova confirmacao.';
      case 'rejected':
        return 'Este convite foi recusado e nao permite aceite.';
      case 'expired':
        return 'Este convite passou da data de validade.';
      case 'canceled':
        return 'Este convite foi cancelado pela empresa.';
      case 'not-found':
      case 'invalid-token':
        return 'Verifique se o link recebido esta completo e tente novamente.';
      case 'temporary-error':
        return 'Houve uma falha temporaria. Tente atualizar a pagina em alguns instantes.';
      default:
        return 'Buscando os dados publicos do convite.';
    }
  }

  protected statusClass(): string {
    switch (this.viewState()) {
      case 'pending':
        return 'status-pending';
      case 'accepted':
        return 'status-success';
      case 'rejected':
      case 'canceled':
        return 'status-muted';
      case 'expired':
        return 'status-warning';
      case 'not-found':
      case 'invalid-token':
      case 'temporary-error':
        return 'status-danger';
      default:
        return 'status-loading';
    }
  }

  protected tipoLabel(convite: PublicConvite): string {
    return publicConviteTipoLabel(convite.tipoConvite);
  }

  protected statusLabel(convite: PublicConvite): string {
    return publicConviteStatusLabel(convite.status);
  }

  protected termLabel(convite: PublicConvite): string {
    return publicConviteTermLabel(convite.versaoTermo);
  }

  protected dateLabel(convite: PublicConvite): string {
    return formatPublicConviteDate(convite.dataExpiracao);
  }

  protected cpfValue(): string {
    return maskCpf(this.acceptForm().cpf);
  }

  protected yesNo(value: boolean): string {
    return booleanBusinessLabel(value);
  }

  protected goToLogin(): void {
    this.navigateToAuth('/entrar');
  }

  protected goToRegister(): void {
    this.navigateToAuth('/criar-conta');
  }

  protected logoutPermanent(): void {
    this.store.clearForm();
    this.permanentAuth.logout();
  }

  protected updateNome(event: Event): void {
    this.store.updateNome((event.target as HTMLInputElement).value);
  }

  protected updateCpf(event: Event): void {
    this.store.updateCpf(maskCpf((event.target as HTMLInputElement).value));
  }

  protected updateTermoConfirmado(event: Event): void {
    this.store.updateTermoConfirmado((event.target as HTMLInputElement).checked);
  }

  protected aceitarCliente(): void {
    this.store.aceitarCliente();
  }

  protected aceitarPrestador(): void {
    this.store.aceitarPrestador();
  }

  private navigateToAuth(path: '/entrar' | '/criar-conta'): void {
    const returnUrl = this.authReturnUrl.normalizeReturnUrl(this.router.url.split('?')[0]);

    if (returnUrl) {
      this.authReturnUrl.setReturnUrl(returnUrl);
      void this.router.navigate([path], { queryParams: { returnUrl } });
      return;
    }

    void this.router.navigate([path]);
  }
}
