import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, finalize, switchMap, take } from 'rxjs';

import { AuthReturnUrlService } from '../../../core/auth/auth-return-url.service';
import { PermanentAuthService } from '../../../core/auth/permanent-auth.service';
import { BookingApiService } from '../../booking/services/booking-api.service';
import { BookingThemeService, DEFAULT_BOOKING_THEME } from '../../booking/services/booking-theme.service';
import {
  AcceptClientConviteResponse,
  AcceptConviteResponse,
  AcceptProviderConviteResponse,
  EscopoAutorizacaoPessoaJuridica,
  PublicConvite,
  PublicConvitePrestador,
  PublicConviteStatus,
  PublicConviteTipo,
  PublicConviteViewState,
} from '../models/public-convite.models';
import { PublicConviteService } from '../services/public-convite.service';
import {
  isValidPublicInviteToken,
  normalizeCpf,
  publicConviteScopeFlags,
} from '../utils/public-convite-formatters';

interface PublicConviteAcceptForm {
  nome: string;
  cpf: string;
  termoConfirmado: boolean;
}

interface PublicConviteState {
  token: string | null;
  convite: PublicConvite | null;
  loading: boolean;
  themeLoading: boolean;
  accepting: boolean;
  acceptValidationErrors: string[];
  acceptSuccess: AcceptConviteResponse | null;
  acceptTemporaryError: string | null;
  sessionExpired: boolean;
  termUpdated: boolean;
  form: PublicConviteAcceptForm;
  error: 'not-found' | 'temporary-error' | 'invalid-token' | null;
}

const initialForm: PublicConviteAcceptForm = {
  nome: '',
  cpf: '',
  termoConfirmado: false,
};

const initialState: PublicConviteState = {
  token: null,
  convite: null,
  loading: false,
  themeLoading: false,
  accepting: false,
  acceptValidationErrors: [],
  acceptSuccess: null,
  acceptTemporaryError: null,
  sessionExpired: false,
  termUpdated: false,
  form: initialForm,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class PublicConviteStore {
  private readonly publicConviteService = inject(PublicConviteService);
  private readonly bookingApi = inject(BookingApiService);
  private readonly theme = inject(BookingThemeService);
  private readonly permanentAuth = inject(PermanentAuthService);
  private readonly authReturnUrl = inject(AuthReturnUrlService);
  private readonly router = inject(Router);
  private readonly stateSignal = signal<PublicConviteState>(initialState);
  private loadRequestId = 0;
  private themeRequestId = 0;

  readonly state = this.stateSignal.asReadonly();
  readonly token = computed(() => this.state().token);
  readonly convite = computed(() => this.state().convite);
  readonly loading = computed(() => this.state().loading);
  readonly themeLoading = computed(() => this.state().themeLoading);
  readonly accepting = computed(() => this.state().accepting);
  readonly acceptValidationErrors = computed(() => this.state().acceptValidationErrors);
  readonly acceptSuccess = computed(() => this.state().acceptSuccess);
  readonly providerAcceptSuccess = computed<AcceptProviderConviteResponse | null>(() => {
    const response = this.state().acceptSuccess;

    return this.isProviderAcceptResponse(response) ? response : null;
  });
  readonly acceptTemporaryError = computed(() => this.state().acceptTemporaryError);
  readonly sessionExpired = computed(() => this.state().sessionExpired);
  readonly termUpdated = computed(() => this.state().termUpdated);
  readonly acceptForm = computed(() => this.state().form);
  readonly error = computed(() => this.state().error);
  readonly status = computed(() => this.convite()?.status ?? null);
  readonly canShowClientAcceptForm = computed(() => {
    const convite = this.convite();

    return (
      convite?.tipoConvite === PublicConviteTipo.Cliente &&
      convite.status === PublicConviteStatus.Pendente &&
      this.permanentAuth.hasSession() &&
      !this.acceptSuccess()
    );
  });
  readonly canSubmitClientAccept = computed(
    () =>
      this.canShowClientAcceptForm() &&
      !this.accepting() &&
      !!this.acceptForm().nome.trim() &&
      this.acceptForm().termoConfirmado &&
      !!this.convite()?.versaoTermo?.trim() &&
      this.hasValidRequiredScopes(this.convite()?.escoposObrigatorios ?? null),
  );
  readonly canShowProviderAcceptForm = computed(() => {
    const convite = this.convite();

    return (
      convite?.tipoConvite === PublicConviteTipo.Prestador &&
      convite.status === PublicConviteStatus.Pendente &&
      this.permanentAuth.hasSession() &&
      this.isValidProviderConfig(convite.prestador) &&
      !this.acceptSuccess()
    );
  });
  readonly canSubmitProviderAccept = computed(
    () =>
      this.canShowProviderAcceptForm() &&
      !this.accepting() &&
      !!this.acceptForm().nome.trim() &&
      this.acceptForm().termoConfirmado &&
      !!this.convite()?.versaoTermo?.trim() &&
      this.hasValidRequiredScopes(this.convite()?.escoposObrigatorios ?? null),
  );
  readonly viewState = computed<PublicConviteViewState>(() => {
    const state = this.state();

    if (state.loading) {
      return 'loading';
    }

    if (state.error) {
      return state.error;
    }

    switch (state.convite?.status) {
      case PublicConviteStatus.Pendente:
        return 'pending';
      case PublicConviteStatus.Aceito:
        return 'accepted';
      case PublicConviteStatus.Recusado:
        return 'rejected';
      case PublicConviteStatus.Expirado:
        return 'expired';
      case PublicConviteStatus.Cancelado:
        return 'canceled';
      default:
        return 'idle';
    }
  });

  load(token: string | null): void {
    const normalizedToken = token?.trim() ?? null;
    const currentState = this.state();

    if (normalizedToken === currentState.token && (currentState.loading || currentState.convite)) {
      return;
    }

    this.theme.applyDefaultTheme();

    if (!isValidPublicInviteToken(normalizedToken)) {
      this.loadRequestId++;
      this.themeRequestId++;
      this.stateSignal.set({ ...initialState, error: 'invalid-token' });
      return;
    }

    const requestId = ++this.loadRequestId;
    this.themeRequestId++;

    this.stateSignal.set({
      token: normalizedToken,
      convite: null,
      loading: true,
      themeLoading: false,
      accepting: false,
      acceptValidationErrors: [],
      acceptSuccess: null,
      acceptTemporaryError: null,
      sessionExpired: false,
      termUpdated: false,
      form: { ...initialForm },
      error: null,
    });

    this.publicConviteService
      .getPublic(normalizedToken)
      .pipe(finalize(() => this.patchIfCurrent(requestId, { loading: false })))
      .subscribe({
        next: (convite) => {
          if (!this.isCurrentLoad(requestId, normalizedToken)) {
            return;
          }

          this.patch({
            convite,
            form: this.initialFormForConvite(convite),
            error: null,
          });
          this.loadTheme(convite.slug, requestId);
        },
        error: (error: HttpErrorResponse) => {
          if (!this.isCurrentLoad(requestId, normalizedToken)) {
            return;
          }

          this.patch({
            convite: null,
            error: error.status === 404 ? 'not-found' : 'temporary-error',
          });
        },
      });
  }

  reset(): void {
    this.loadRequestId++;
    this.themeRequestId++;
    this.theme.applyDefaultTheme();
    this.stateSignal.set({ ...initialState, form: { ...initialForm } });
  }

  updateNome(nome: string): void {
    this.patchForm({ nome });
    this.clearAcceptErrors();
  }

  updateCpf(cpf: string): void {
    this.patchForm({ cpf });
    this.clearAcceptErrors();
  }

  updateTermoConfirmado(termoConfirmado: boolean): void {
    this.patchForm({ termoConfirmado });
    this.patch({ termUpdated: false });
    this.clearAcceptErrors();
  }

  clearForm(): void {
    this.patch({
      form: { ...initialForm },
      acceptValidationErrors: [],
      acceptTemporaryError: null,
      sessionExpired: false,
      termUpdated: false,
    });
  }

  aceitarCliente(): void {
    const state = this.state();
    const convite = state.convite;

    if (state.accepting || state.acceptSuccess) {
      return;
    }

    const validationErrors = this.validateClientAccept(state);

    if (validationErrors.length > 0) {
      this.patch({ acceptValidationErrors: validationErrors, acceptTemporaryError: null });
      return;
    }

    if (!state.token || !convite?.versaoTermo) {
      return;
    }

    const escoposAutorizados = publicConviteScopeFlags(convite.escoposObrigatorios);

    if (!escoposAutorizados) {
      return;
    }

    this.patch({
      accepting: true,
      acceptValidationErrors: [],
      acceptTemporaryError: null,
      sessionExpired: false,
      termUpdated: false,
    });

    this.publicConviteService
      .aceitarCliente(state.token, {
        nome: state.form.nome.trim(),
        cpf: normalizeCpf(state.form.cpf),
        escoposAutorizados,
        versaoTermo: convite.versaoTermo,
      })
      .pipe(finalize(() => this.patch({ accepting: false })))
      .subscribe({
        next: (response) => {
          this.patch({
            convite: convite ? { ...convite, status: PublicConviteStatus.Aceito } : convite,
            acceptSuccess: response,
            acceptValidationErrors: [],
            acceptTemporaryError: null,
            form: { ...initialForm },
          });
        },
        error: (error: HttpErrorResponse) => this.handleAcceptError(error),
      });
  }

  aceitarPrestador(): void {
    const state = this.state();
    const convite = state.convite;

    if (state.accepting || state.acceptSuccess) {
      return;
    }

    const validationErrors = this.validateProviderAccept(state);

    if (validationErrors.length > 0) {
      this.patch({ acceptValidationErrors: validationErrors, acceptTemporaryError: null });
      return;
    }

    if (!state.token || !convite?.versaoTermo) {
      return;
    }

    const escoposAutorizados = publicConviteScopeFlags(convite.escoposObrigatorios);

    if (!escoposAutorizados) {
      return;
    }

    this.patch({
      accepting: true,
      acceptValidationErrors: [],
      acceptTemporaryError: null,
      sessionExpired: false,
      termUpdated: false,
    });

    this.publicConviteService
      .aceitarPrestador(state.token, {
        nome: state.form.nome.trim(),
        cpf: normalizeCpf(state.form.cpf),
        escoposAutorizados,
        versaoTermo: convite.versaoTermo,
      })
      .pipe(finalize(() => this.patch({ accepting: false })))
      .subscribe({
        next: (response) => {
          this.patch({
            convite: convite ? { ...convite, status: PublicConviteStatus.Aceito } : convite,
            acceptSuccess: response,
            acceptValidationErrors: [],
            acceptTemporaryError: null,
            form: { ...initialForm },
          });
        },
        error: (error: HttpErrorResponse) => this.handleAcceptError(error),
      });
  }

  private loadTheme(slug: string | null, loadRequestId: number): void {
    const themeRequestId = ++this.themeRequestId;

    if (!slug?.trim()) {
      if (this.isCurrentLoad(loadRequestId) && this.themeRequestId === themeRequestId) {
        this.theme.applyDefaultTheme();
      }
      return;
    }

    this.patch({ themeLoading: true });

    this.bookingApi
      .getConfig(slug.trim())
      .pipe(
        switchMap((company) =>
          this.isCurrentLoad(loadRequestId) && this.themeRequestId === themeRequestId
            ? this.theme.getPublicTheme(company.pessoaJuridicaID)
            : EMPTY,
        ),
        take(1),
        catchError(() => {
          if (this.isCurrentLoad(loadRequestId) && this.themeRequestId === themeRequestId) {
            this.theme.applyDefaultTheme();
          }
          return EMPTY;
        }),
        finalize(() => {
          if (this.isCurrentLoad(loadRequestId) && this.themeRequestId === themeRequestId) {
            this.patch({ themeLoading: false });
          }
        }),
      )
      .subscribe((response) => {
        if (!this.isCurrentLoad(loadRequestId) || this.themeRequestId !== themeRequestId) {
          return;
        }

        this.theme.applyTheme(response.tema ?? DEFAULT_BOOKING_THEME);
      });
  }

  private patch(partial: Partial<PublicConviteState>): void {
    this.stateSignal.update((state) => ({ ...state, ...partial }));
  }

  private patchIfCurrent(requestId: number, partial: Partial<PublicConviteState>): void {
    if (this.isCurrentLoad(requestId)) {
      this.patch(partial);
    }
  }

  private isCurrentLoad(requestId: number, token: string | null = this.state().token): boolean {
    return requestId === this.loadRequestId && token === this.state().token;
  }

  private patchForm(partial: Partial<PublicConviteAcceptForm>): void {
    this.stateSignal.update((state) => ({ ...state, form: { ...state.form, ...partial } }));
  }

  private initialFormForConvite(convite: PublicConvite): PublicConviteAcceptForm {
    return {
      ...initialForm,
      nome: convite.nomeInformado?.trim() ?? '',
    };
  }

  private clearAcceptErrors(): void {
    if (
      this.state().acceptValidationErrors.length === 0 &&
      !this.state().acceptTemporaryError &&
      !this.state().sessionExpired
    ) {
      return;
    }

    this.patch({
      acceptValidationErrors: [],
      acceptTemporaryError: null,
      sessionExpired: false,
    });
  }

  private validateClientAccept(state: PublicConviteState): string[] {
    const convite = state.convite;
    const errors: string[] = [];

    if (!state.token || !convite) {
      errors.push('Convite nao carregado.');
      return errors;
    }

    if (!this.permanentAuth.hasSession()) {
      errors.push('Entre com sua conta para aceitar o convite.');
    }

    if (convite.tipoConvite !== PublicConviteTipo.Cliente) {
      errors.push('Este convite nao e de cliente.');
    }

    if (convite.status !== PublicConviteStatus.Pendente) {
      errors.push('Este convite nao esta mais pendente.');
    }

    if (!state.form.nome.trim()) {
      errors.push('Informe seu nome.');
    }

    if (!state.form.termoConfirmado) {
      errors.push('Confirme o compartilhamento dos dados indicados.');
    }

    if (!convite.versaoTermo?.trim()) {
      errors.push('Nao foi possivel confirmar a versao do termo deste convite.');
    }

    if (!this.hasValidRequiredScopes(convite.escoposObrigatorios)) {
      errors.push('Nao foi possivel confirmar os dados obrigatorios deste convite.');
    }

    return errors;
  }

  private validateProviderAccept(state: PublicConviteState): string[] {
    const convite = state.convite;
    const errors: string[] = [];

    if (!state.token || !convite) {
      errors.push('Convite nao carregado.');
      return errors;
    }

    if (!this.permanentAuth.hasSession()) {
      errors.push('Entre com sua conta para aceitar o convite.');
    }

    if (convite.tipoConvite !== PublicConviteTipo.Prestador) {
      errors.push('Este convite nao e de prestador.');
    }

    if (convite.status !== PublicConviteStatus.Pendente) {
      errors.push('Este convite nao esta mais pendente.');
    }

    if (!this.isValidProviderConfig(convite.prestador)) {
      errors.push('Nao foi possivel confirmar a configuracao profissional deste convite.');
    }

    if (!state.form.nome.trim()) {
      errors.push('Informe seu nome.');
    }

    if (!state.form.termoConfirmado) {
      errors.push('Confirme o compartilhamento dos dados indicados.');
    }

    if (!convite.versaoTermo?.trim()) {
      errors.push('Nao foi possivel confirmar a versao do termo deste convite.');
    }

    if (!this.hasValidRequiredScopes(convite.escoposObrigatorios)) {
      errors.push('Nao foi possivel confirmar os dados obrigatorios deste convite.');
    }

    return errors;
  }

  private isValidProviderConfig(provider: PublicConvitePrestador | null | undefined): provider is PublicConvitePrestador {
    if (!provider || !Array.isArray(provider.servicos) || provider.servicos.length === 0) {
      return false;
    }

    if (provider.deveAcessarPainel && !provider.role?.trim()) {
      return false;
    }

    return provider.servicos.every((service) => !!service.trim());
  }

  private hasValidRequiredScopes(scopes: string[] | null): boolean {
    const flags = publicConviteScopeFlags(scopes);

    return !!flags && (flags & EscopoAutorizacaoPessoaJuridica.Nome) === EscopoAutorizacaoPessoaJuridica.Nome;
  }

  private isProviderAcceptResponse(
    response: AcceptConviteResponse | null,
  ): response is AcceptProviderConviteResponse {
    return !!response && 'deveAcessarPainel' in response && 'apareceBooking' in response;
  }

  private handleAcceptError(error: HttpErrorResponse): void {
    if (error.status === 401) {
      this.permanentAuth.logout();
      this.registerCurrentInviteReturnUrl();
      this.patch({
        sessionExpired: true,
        acceptValidationErrors: ['Sua sessao expirou. Entre novamente para continuar.'],
        form: { ...this.state().form, cpf: '', termoConfirmado: false },
      });
      void this.router.navigate(['/entrar']);
      return;
    }

    if (error.status === 404) {
      this.patch({
        convite: null,
        error: 'not-found',
        form: { ...initialForm },
        acceptSuccess: null,
      });
      return;
    }

    const messages = this.extractErrorMessages(error);

    if (this.isTermVersionConflict(messages)) {
      this.reloadPublicInviteAfterAcceptError(true);
      return;
    }

    if (this.isInviteNoLongerAcceptable(error, messages)) {
      this.reloadPublicInviteAfterAcceptError(false);
      return;
    }

    if (error.status === 400) {
      this.patch({
        acceptValidationErrors: messages.length > 0 ? messages : ['Revise os dados informados.'],
        acceptTemporaryError: null,
      });
      return;
    }

    this.patch({
      acceptTemporaryError: 'Houve uma falha temporaria. Tente novamente.',
      acceptValidationErrors: [],
    });
  }

  private reloadPublicInviteAfterAcceptError(termUpdated: boolean): void {
    const token = this.state().token;

    if (!token) {
      return;
    }

    this.patch({ loading: true, acceptValidationErrors: [], acceptTemporaryError: null });
    const requestId = this.loadRequestId;
    this.publicConviteService
      .getPublic(token)
      .pipe(finalize(() => this.patchIfCurrent(requestId, { loading: false })))
      .subscribe({
        next: (convite) => {
          if (!this.isCurrentLoad(requestId, token)) {
            return;
          }

          const pendingClient =
            convite.tipoConvite === PublicConviteTipo.Cliente &&
            convite.status === PublicConviteStatus.Pendente;
          const pendingProvider =
            convite.tipoConvite === PublicConviteTipo.Prestador &&
            convite.status === PublicConviteStatus.Pendente;
          this.patch({
            convite,
            error: null,
            termUpdated,
            form: pendingClient || pendingProvider
              ? { ...this.state().form, termoConfirmado: false }
              : { ...initialForm },
          });
          this.loadTheme(convite.slug, requestId);
        },
        error: (reloadError: HttpErrorResponse) => {
          if (!this.isCurrentLoad(requestId, token)) {
            return;
          }

          this.patch({
            convite: null,
            form: { ...initialForm },
            error: reloadError.status === 404 ? 'not-found' : 'temporary-error',
          });
        },
      });
  }

  private registerCurrentInviteReturnUrl(): void {
    const token = this.state().token;

    if (!token) {
      return;
    }

    this.authReturnUrl.setReturnUrl(`/convite/${token}`);
  }

  private extractErrorMessages(error: HttpErrorResponse): string[] {
    const body = error.error;

    if (!body) {
      return [];
    }

    if (typeof body === 'string') {
      return [body];
    }

    const messages = [
      body.message,
      body.mensagem,
      body.detail,
      body.title,
      ...(Array.isArray(body.messages) ? body.messages : []),
      ...(Array.isArray(body.erros) ? body.erros : []),
      ...(Array.isArray(body.errors) ? body.errors : []),
    ].filter((message): message is string => typeof message === 'string' && !!message.trim());

    if (body.errors && !Array.isArray(body.errors) && typeof body.errors === 'object') {
      for (const value of Object.values(body.errors)) {
        if (Array.isArray(value)) {
          messages.push(...value.filter((message): message is string => typeof message === 'string'));
        }
      }
    }

    return [...new Set(messages.map((message) => message.trim()))];
  }

  private isTermVersionConflict(messages: string[]): boolean {
    const text = messages.join(' ').toLowerCase();

    return text.includes('termo') && (text.includes('desatualiz') || text.includes('versao'));
  }

  private isInviteNoLongerAcceptable(error: HttpErrorResponse, messages: string[]): boolean {
    if (error.status === 409) {
      return true;
    }

    const text = messages.join(' ').toLowerCase();

    return (
      text.includes('convite') &&
      (text.includes('aceito') ||
        text.includes('expirad') ||
        text.includes('cancelad') ||
        text.includes('recusad') ||
        text.includes('pendente'))
    );
  }
}
