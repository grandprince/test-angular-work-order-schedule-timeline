import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  HostListener,
} from '@angular/core';
import { WorkCenterDocument } from '../../../core/models/documents';
import {
  PositionedWorkOrder,
  WorkOrderBarComponent,
} from '../work-order-bar/work-order-bar.component';

export type TimelineColumn = {
  key: string;
  label: string;
  startIso: string;
};

export type EmptyClickEvent = {
  workCenterId: string;
  colIndex: number;
  offsetPxInCol: number;
};

type MenuOverlayState = {
  workOrderId: string;
  x: number; // px within timeline-inner content
  y: number; // px within timeline-inner content
} | null;

@Component({
  selector: 'app-timeline-grid',
  standalone: true,
  imports: [WorkOrderBarComponent],
  templateUrl: './timeline-grid.component.html',
  styleUrls: ['./timeline-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineGridComponent {
  @Input({ required: true }) workCenters!: WorkCenterDocument[];
  @Input({ required: true }) columns!: TimelineColumn[];
  @Input({ required: true }) colWidthPx!: number;

  @Input() hoveredWorkCenterId: string | null = null;
  @Output() hoverChange = new EventEmitter<string | null>();

  @Input() todayLeftPx: number | null = null;
  @Input() badgeLabel: string | null = null;

  @Input() badgeLeftPx: number | null = null;

  @Input({ required: true })
  positionedOrdersByCenter!: Record<string, PositionedWorkOrder[]>;

  @Output() emptyClick = new EventEmitter<EmptyClickEvent>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  @Output() extendLeft = new EventEmitter<void>();
  @Output() extendRight = new EventEmitter<void>();

  @ViewChild('scroll', { static: true }) private readonly scrollRef!: ElementRef<HTMLElement>;

  // ----- hover hint state -----
  hintVisible = false;
  hintWorkCenterId: string | null = null;
  hintLeftPx = 0;
  hintTopPx = 0;

  timelineWidthPx(): number {
    return this.columns.length * this.colWidthPx;
  }

  onRowEnter(id: string): void {
    this.hoverChange.emit(id);
  }

  onRowLeave(id: string): void {
    if (this.hoveredWorkCenterId === id) this.hoverChange.emit(null);
    if (this.hintWorkCenterId === id) {
      this.hintVisible = false;
      this.hintWorkCenterId = null;
    }
  }

  onRowMouseMove(workCenterId: string, ev: MouseEvent): void {
    const target = ev.target as HTMLElement | null;
    if (target?.closest?.('.wo-bar')) {
      this.hintVisible = false;
      this.hintWorkCenterId = null;
      return;
    }

    const rowEl = ev.currentTarget as HTMLElement;
    const rect = rowEl.getBoundingClientRect();

    // visible X inside row (NOT including scrollLeft)
    const xInRow = ev.clientX - rect.left;

    const pillW = 112;
    const pillH = 34;

    // clamp within the visible row area
    const left = Math.max(8, Math.min(rect.width - pillW - 8, xInRow - pillW / 2));

    this.hintVisible = true;
    this.hintWorkCenterId = workCenterId;
    this.hintLeftPx = Math.round(left);

    // keep vertical centered within the row
    this.hintTopPx = Math.round((rect.height - pillH) / 2);
  }

  onRowClick(workCenterId: string, ev: MouseEvent): void {
    const target = ev.target as HTMLElement | null;
    if (target?.closest?.('.wo-bar') || target?.closest?.('.wo-menu')) return;

    const scrollEl = this.scrollRef.nativeElement;

    // X inside the visible scroll viewport
    const viewportRect = scrollEl.getBoundingClientRect();
    const xInViewport = ev.clientX - viewportRect.left;

    // Convert to content coords (account for horizontal scroll)
    const xInContent = xInViewport + scrollEl.scrollLeft;

    const colIndex = Math.floor(xInContent / this.colWidthPx);
    const clampedColIndex = Math.max(0, Math.min(this.columns.length - 1, colIndex));

    const colStartPx = clampedColIndex * this.colWidthPx;
    const offsetPxInCol = Math.max(0, Math.min(this.colWidthPx - 1, xInContent - colStartPx));

    this.emptyClick.emit({ workCenterId, colIndex: clampedColIndex, offsetPxInCol });
  }

  scrollToXCentered(xPx: number, smooth = true): void {
    const el = this.scrollRef.nativeElement;
    const target = Math.max(0, xPx - el.clientWidth / 2);
    el.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
  }

  private ticking = false;

  onScroll(): void {
    if (this.ticking) return;
    this.ticking = true;

    requestAnimationFrame(() => {
      this.ticking = false;

      const el = this.scrollRef.nativeElement;
      const threshold = 240;

      if (el.scrollLeft < threshold) this.extendLeft.emit();
      if (el.scrollLeft + el.clientWidth > el.scrollWidth - threshold) this.extendRight.emit();
    });
  }

  /** When parent prepends columns, keep the viewport stable. */
  compensatePrepend(deltaCols: number): void {
    const el = this.scrollRef.nativeElement;
    el.scrollLeft += deltaCols * this.colWidthPx;
  }

  requestScrollToXCentered(xPx: number, smooth = true): void {
    // Wait 2 frames so DOM width + scrollWidth are correct
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.scrollToXCentered(xPx, smooth));
    });
  }

  menuOverlay: MenuOverlayState = null;

  openMenuOverlay(ev: { workOrderId: string; anchorRect: DOMRect }): void {
    const scrollEl = this.scrollRef.nativeElement;
    const scrollRect = scrollEl.getBoundingClientRect();

    // anchor position inside scroll viewport
    const anchorXInViewport = ev.anchorRect.right - scrollRect.left;
    const anchorYInViewport = ev.anchorRect.top - scrollRect.top;

    // convert to content coords by adding scrollLeft
    const xInContent = anchorXInViewport + scrollEl.scrollLeft;
    const yInContent = anchorYInViewport + 32; // header height (32px)

    this.menuOverlay = {
      workOrderId: ev.workOrderId,
      x: xInContent - 20, // place menu left of anchor (menu width ~200 + padding)
      y: yInContent - 8, // under the bar
    };
  }

  closeMenuOverlay(): void {
    this.menuOverlay = null;
  }

  onOverlayEdit(): void {
    const id = this.menuOverlay?.workOrderId;
    if (!id) return;

    this.edit.emit(id); // emit to parent
    this.closeMenuOverlay(); // close after
  }

  onOverlayDelete(): void {
    const id = this.menuOverlay?.workOrderId;
    if (!id) return;

    this.delete.emit(id); // emit to parent
    this.closeMenuOverlay(); // close after
  }

  @HostListener('document:click')
  onDocClick(): void {
    if (this.menuOverlay) this.menuOverlay = null;
  }
}
