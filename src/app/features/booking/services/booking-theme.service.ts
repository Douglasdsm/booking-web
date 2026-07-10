import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';

import { API_CONFIG } from '../../../core/api/api.config';
import { BookingTheme, BookingThemeResponse } from '../models/booking.models';

export const DEFAULT_BOOKING_THEME: BookingTheme = {
  corPrimaria: '#002B5C',
  corSecundaria: '#D71920',
  corFundo: '#FFFFFF',
  corTexto: '#001F3F',
  corBotao: '#002B5C',
  corTextoBotao: '#FFFFFF',
  corBorda: '#D1D5DB',
  corCard: '#FFFFFF',
  corInput: '#FFFFFF',
  corTextoInput: '#001F3F',
  corErro: '#DC2626',
  corSucesso: '#16A34A',
  borderRadius: '16px',
};

@Injectable({ providedIn: 'root' })
export class BookingThemeService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly document = inject(DOCUMENT);

  getPublicTheme(pessoaJuridicaId: number): Observable<BookingThemeResponse> {
    return this.http.get<BookingThemeResponse>(
      `${this.config.baseUrl}${this.config.endpoints.bookingTheme(pessoaJuridicaId)}`,
    );
  }

  loadAndApplyPublicTheme(pessoaJuridicaId: number): Observable<BookingTheme> {
    return this.getPublicTheme(pessoaJuridicaId).pipe(
      map((response) => response.tema ?? DEFAULT_BOOKING_THEME),
      catchError(() => of(DEFAULT_BOOKING_THEME)),
      tap((theme) => this.applyTheme(theme)),
    );
  }

  applyDefaultTheme(): void {
    this.applyTheme(DEFAULT_BOOKING_THEME);
  }

  applyTheme(theme: BookingTheme): void {
    const style = this.document.documentElement.style;

    style.setProperty('--booking-primary', theme.corPrimaria);
    style.setProperty('--booking-secondary', theme.corSecundaria);
    style.setProperty('--booking-background', theme.corFundo);
    style.setProperty('--booking-text', theme.corTexto);
    style.setProperty('--booking-button', theme.corBotao);
    style.setProperty('--booking-button-text', theme.corTextoBotao);
    style.setProperty('--booking-border', theme.corBorda);
    style.setProperty('--booking-card', theme.corCard);
    style.setProperty('--booking-input', theme.corInput);
    style.setProperty('--booking-input-text', theme.corTextoInput);
    style.setProperty('--booking-error', theme.corErro);
    style.setProperty('--booking-success', theme.corSucesso);
    style.setProperty('--booking-radius', theme.borderRadius);
  }
}
