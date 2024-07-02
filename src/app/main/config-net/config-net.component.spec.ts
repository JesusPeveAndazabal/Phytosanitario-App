import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigNetComponent } from './config-net.component';

describe('ConfigNetComponent', () => {
  let component: ConfigNetComponent;
  let fixture: ComponentFixture<ConfigNetComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ConfigNetComponent]
    });
    fixture = TestBed.createComponent(ConfigNetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
