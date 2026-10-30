import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { PermanentAuthService } from '../core/auth/permanent-auth.service';
import { AccountNavComponent } from './account-nav.component';

describe('AccountNavComponent', () => {
  const auth = { logout: vi.fn() };

  beforeEach(async () => {
    auth.logout.mockReset();
    await TestBed.configureTestingModule({
      imports: [AccountNavComponent],
      providers: [provideRouter([]), { provide: PermanentAuthService, useValue: auth }],
    }).compileComponents();
  });

  // UX-BOOKING-WEB P1-05: the account area had no way out and no links between its areas
  it('links the account areas', () => {
    const fixture = TestBed.createComponent(AccountNavComponent);
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));

    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['Agendamentos', '/meus-agendamentos'],
      ['Avisos', '/meus-avisos'],
      ['Minha conta', '/minha-conta'],
    ]);
    expect((fixture.nativeElement as HTMLElement).querySelector('nav')?.getAttribute('aria-label')).toBe('Navegação da conta');
  });

  it('ends the session and goes to the login page', async () => {
    const fixture = TestBed.createComponent(AccountNavComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.textContent?.trim()).toBe('Sair da conta');
    button.click();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/entrar');
  });
});
