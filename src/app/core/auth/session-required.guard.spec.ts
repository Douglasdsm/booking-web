import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { PermanentAuthService } from './permanent-auth.service';
import { sessionRequiredGuard } from './session-required.guard';

describe('sessionRequiredGuard', () => {
  function run(platform: 'browser' | 'server', hasSession: boolean): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: PermanentAuthService, useValue: { hasSession: () => hasSession } },
        { provide: Router, useValue: { createUrlTree: (commands: string[], extras: object) => ({ commands, extras }) as unknown as UrlTree } },
      ],
    });
    return TestBed.runInInjectionContext(() => sessionRequiredGuard({} as never, { url: '/meus-avisos' } as RouterStateSnapshot)) as boolean | UrlTree;
  }

  it('allows an authenticated browser session', () => {
    expect(run('browser', true)).toBe(true);
  });

  it('redirects a browser without session to login keeping the return url', () => {
    expect(run('browser', false)).toEqual({ commands: ['/entrar'], extras: { queryParams: { returnUrl: '/meus-avisos' } } });
  });

  it('never decides on the server, where the browser session is not available', () => {
    expect(run('server', false)).toBe(true);
  });
});
