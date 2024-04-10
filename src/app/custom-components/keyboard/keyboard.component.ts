import { Component, ElementRef, OnInit, Renderer2} from '@angular/core';
import Keyboard from 'simple-keyboard';

@Component({
  selector: 'app-keyboard',
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.scss']
})
export class KeyboardComponent implements OnInit{
  
  keyboard: any;

  input: ElementRef;

  constructor(private renderer: Renderer2) { }

  ngOnInit(): void {
    this.keyboard = new Keyboard({
      onChange: input => this.onChange(input),
      onKeyPress: button => this.onKeyPress(button),
      preventMouseDownDefault : true,
      preventMouseUpDefault : true,
      layout: {
        default: ["1 2 3", "4 5 6", "7 8 9", ". 0 {bksp}"],
        shift: ["! / #", "$ % ^", "& * (", ". ) {bksp}"]
      },
    });

    this.keyboard.setInput(this.input.nativeElement.value);
  }

  onChange(value: string) {
    this.input.nativeElement.value = value;
    this.input.nativeElement.dispatchEvent(new Event('input'))
    //this.renderer.setValue(this.input,value);
  }

  onKeyPress(button: string) {

  }
}
