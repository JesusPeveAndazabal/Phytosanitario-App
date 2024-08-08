import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyboardWifiComponent } from './keyboard-wifi.component';

describe('KeyboardWifiComponent', () => {
  let component: KeyboardWifiComponent;
  let fixture: ComponentFixture<KeyboardWifiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [KeyboardWifiComponent]
    });
    fixture = TestBed.createComponent(KeyboardWifiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
