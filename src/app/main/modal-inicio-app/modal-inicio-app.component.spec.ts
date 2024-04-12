import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalInicioAppComponent } from './modal-inicio-app.component';

describe('ModalInicioAppComponent', () => {
  let component: ModalInicioAppComponent;
  let fixture: ComponentFixture<ModalInicioAppComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalInicioAppComponent]
    });
    fixture = TestBed.createComponent(ModalInicioAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
