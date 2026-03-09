import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkCenterDocument } from '../../../core/models/documents';

@Component({
  selector: 'app-timeline-shell',
  standalone: true,
  templateUrl: './timeline-shell.component.html',
  styleUrls: ['./timeline-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineShellComponent {
  @Input({ required: true }) workCenters!: WorkCenterDocument[];
  @Input() hoveredWorkCenterId: string | null = null;

  @Output() hoverChange = new EventEmitter<string | null>();

  onEnter(id: string): void {
    this.hoverChange.emit(id);
  }

  onLeave(id: string): void {
    if (this.hoveredWorkCenterId === id) this.hoverChange.emit(null);
  }
}
