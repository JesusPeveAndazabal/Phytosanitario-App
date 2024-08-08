import { ApplicationRef, ComponentFactoryResolver, ComponentRef, Directive, ElementRef, EmbeddedViewRef, HostListener, Injector, Input } from "@angular/core";
import { KeyboardWifiComponent } from "../../custom-components/keyboard-wifi/keyboard-wifi.component";

@Directive({
  selector: '[appKeyboardWifi]'
})
export class KeyboardWifiDirective {

  @Input() typeKeyboard = '';

  private componentRef: ComponentRef<any> = null;
  private keyboard : HTMLElement ;

  private enableByClick : boolean = false;

  constructor(
    private elementRef: ElementRef,
    private appRef: ApplicationRef, 
    private componentFactoryResolver: ComponentFactoryResolver,
    private injector: Injector
  ) {
    this.enableByClick = elementRef.nativeElement.nodeName != "INPUT";
   }

   
  @HostListener('focus')
  onFocus(): void {
    
    if (this.componentRef === null) {
        const componentFactory =
              this.componentFactoryResolver.resolveComponentFactory(
              KeyboardWifiComponent);
        this.componentRef = componentFactory.create(this.injector);
        this.appRef.attachView(this.componentRef.hostView);
        this.keyboard = 
              (this.componentRef.hostView as EmbeddedViewRef<any>)
              .rootNodes[0] as HTMLElement;

    }
    let appKeyboardWifi = document.querySelector("#keyboard");
    console.log("CREACION DE DIRECTIVA APPKEYBOARD WIFI" , appKeyboardWifi);
    if(!appKeyboardWifi){
        document.body.appendChild(this.keyboard);
    }
    this.setTooltipComponentProperties();
  }

  @HostListener('click',['$event'])
  onClick(event: MouseEvent): void {
    // console.log("click: ",event.target);
    if(this.enableByClick){
      this.onFocus();
    }
  }

  @HostListener('focusout')
  onFocusOut(): void {
    let appKeyboardWifi = document.querySelector("#keyboard");
    console.log("CREACION DE DIRECTIVA APPKEYBOARD WIFI OUTFOCUS" , appKeyboardWifi);
    if (this.keyboard && appKeyboardWifi) { 
        console.log("ENTRO A LA CONDICION" , this.keyboard);    
        document.body.removeChild(this.keyboard);
    }
  }

  private setTooltipComponentProperties() {
    if (this.componentRef !== null) {
      this.componentRef.instance.input = this.elementRef;
    //   const {left, right, bottom} = 		  	
    //         this.elementRef.nativeElement.getBoundingClientRect();
    //   this.componentRef.instance.left = (right - left) / 2 + left;
    //   this.componentRef.instance.top = bottom;
    }
  }


}
