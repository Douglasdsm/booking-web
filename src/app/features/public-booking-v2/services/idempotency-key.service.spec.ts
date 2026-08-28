import { TestBed } from '@angular/core/testing';

import { IdempotencyKeyService } from './idempotency-key.service';

describe('IdempotencyKeyService', () => {
  let service: IdempotencyKeyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IdempotencyKeyService);
  });

  it('returns the same key across repeated current() calls for the same attempt (retry safety)', () => {
    const key = service.current();

    expect(service.current()).toBe(key);
    expect(service.current()).toBe(key);
  });

  it('issues a brand-new key when a new logical attempt begins via next()', () => {
    const first = service.next();
    const second = service.next();

    expect(second).not.toBe(first);
  });

  it('clear() forces a fresh key on the next current() call', () => {
    const first = service.current();
    service.clear();
    const second = service.current();

    expect(second).not.toBe(first);
  });
});
