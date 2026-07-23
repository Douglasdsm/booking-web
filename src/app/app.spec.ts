import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.debugElement.query((debugElement) => debugElement.name === 'router-outlet')).toBeTruthy();
    expect(fixture.debugElement.query((debugElement) => debugElement.providerTokens.includes(RouterOutlet))).toBeTruthy();
  });
});
