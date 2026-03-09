import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MainPageComponent } from './components/main/main.page';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainPageComponent],
  template: `<app-main-page />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'work-order-schedule-timeline';
}
