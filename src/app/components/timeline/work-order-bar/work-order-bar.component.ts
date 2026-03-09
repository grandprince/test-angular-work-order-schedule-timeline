import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { WorkOrderStatus } from '../../../core/models/documents';

export type PositionedWorkOrder = {
  docId: string;
  name: string;
  status: WorkOrderStatus;
  leftPx: number;
  widthPx: number;
  startDateIso: string;
  endDateIso: string;
};

@Component({
  selector: 'app-work-order-bar',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './work-order-bar.component.html',
  styleUrls: ['./work-order-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrderBarComponent {
  @Input({ required: true }) wo!: PositionedWorkOrder;

  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  @Output() menuOpenChange = new EventEmitter<boolean>();
  @Output() openMenu = new EventEmitter<{ workOrderId: string; anchorRect: DOMRect }>();

  hovered = false;
  menuOpen = false;

  @ViewChild('menuBtn', { static: true })
  private readonly menuBtnRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('menuEl') private readonly menuElRef?: ElementRef<HTMLDivElement>;

  @HostListener('document:click')
  onDocClick(): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.menuOpenChange.emit(false);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.menuBtnRef.nativeElement.focus();
  }

  onEnter(): void {
    this.hovered = true;
  }

  onLeave(): void {
    this.hovered = false;
  }

  onMenuButtonKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      this.setMenuOpen(!this.menuOpen, true);
    }
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.setMenuOpen(true, true);
    }
  }

  onMenuKeydown(ev: KeyboardEvent): void {
    const items =
      this.menuElRef?.nativeElement.querySelectorAll<HTMLButtonElement>('[data-menu-item]');
    if (!items || items.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const idx = Array.from(items).findIndex((x) => x === active);
    const current = idx >= 0 ? idx : 0;

    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      items[(current + 1) % items.length].focus();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      items[(current - 1 + items.length) % items.length].focus();
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      items[0].focus();
    } else if (ev.key === 'End') {
      ev.preventDefault();
      items[items.length - 1].focus();
    } else if (ev.key === 'Tab') {
      this.menuOpen = false;
    }
  }

  onEdit(ev: MouseEvent): void {
    ev.stopPropagation();
    this.menuOpen = false;
    this.edit.emit(this.wo.docId);
  }

  onDelete(ev: MouseEvent): void {
    ev.stopPropagation();
    this.menuOpen = false;
    this.delete.emit(this.wo.docId);
  }

  private setMenuOpen(open: boolean, focusFirst: boolean): void {
    this.menuOpen = open;
    this.menuOpenChange.emit(open);

    queueMicrotask(() => {
      if (!this.menuOpen) return;
      if (!focusFirst) return;
      const first =
        this.menuElRef?.nativeElement.querySelector<HTMLButtonElement>('[data-menu-item]');
      first?.focus();
    });
  }

  toggleMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    const btn = ev.currentTarget as HTMLElement;
    this.openMenu.emit({ workOrderId: this.wo.docId, anchorRect: btn.getBoundingClientRect() });
  }
}
