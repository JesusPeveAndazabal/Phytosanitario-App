import { ApplicationRef, ComponentFactoryResolver, ComponentRef, Directive, ElementRef, EmbeddedViewRef, HostListener, Injector, Input } from "@angular/core";
import { KeyboardComponent } from "../../custom-components/keyboard/keyboard.component";

@Directive({
  selector: '[appKeyboard]'
})
export class KeyboardDirective {

  @Input() typeKeyboard = '';

  private componentRef: ComponentRef<any> = null;
  private keyboard : HTMLElement ;

  private enableByClick : boolean = false;

  constructor(
	private elementRef: ElementRef,
	private appRef: ApplicationRef, 
	private componentFactoryResolver: ComponentFactoryResolver,
	private injector: Injector) {
    
    this.enableByClick = elementRef.nativeElement.nodeName != "INPUT";
  }

  @HostListener('focus')
  onFocus(): void {
    
    if (this.componentRef === null) {
        const componentFactory =
              this.componentFactoryResolver.resolveComponentFactory(
              KeyboardComponent);
        this.componentRef = componentFactory.create(this.injector);
        this.appRef.attachView(this.componentRef.hostView);
        this.keyboard = 
              (this.componentRef.hostView as EmbeddedViewRef<any>)
              .rootNodes[0] as HTMLElement;

    }
    let appKeyboard = document.querySelector("#keyboard");
    if(!appKeyboard){
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
    let appKeyboard = document.querySelector("#keyboard");
    if (this.keyboard && appKeyboard) {     
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