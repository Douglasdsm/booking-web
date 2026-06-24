import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { API_CONFIG } from '../../../core/api/api.config';
import {
  BookingAvailableSlot,
  BookingCompanyConfig,
  CreateBookingRequest,
  CreateBookingResponse,
  CreateVisitorRequest,
  CreateVisitorResponse,
  GetAvailableSlotsRequest,
  GetProfessionalsRequest,
  ProfessionalListResponse,
  ServiceListResponse,
} from '../models/booking.models';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  getConfig(slug: string) {
    return this.http.get<BookingCompanyConfig>(this.url(this.config.endpoints.bookingConfig(slug)));
  }

  getServices(pessoaJuridicaID: number) {
    return this.http.get<ServiceListResponse>(this.url(this.config.endpoints.services), {
      params: { PessoaJuridicaID: pessoaJuridicaID },
    });
  }

  getProfessionals(request: GetProfessionalsRequest) {
    return this.http.post<ProfessionalListResponse>(
      this.url(this.config.endpoints.professionals),
      request,
    );
  }

  getAvailableSlots(request: GetAvailableSlotsRequest) {
    return this.http.post<BookingAvailableSlot[]>(
      this.url(this.config.endpoints.availableSlots),
      request,
    );
  }

  createVisitor(request: CreateVisitorRequest) {
    return this.http.post<CreateVisitorResponse>(this.url(this.config.endpoints.visitorUser), request);
  }

  createBooking(request: CreateBookingRequest) {
    return this.http.post<CreateBookingResponse>(this.url(this.config.endpoints.booking), request);
  }

  private url(path: string): string {
    return `${this.config.baseUrl}${path}`;
  }
}
