import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { WorkOrderDocument } from '../../core/models/documents';
import { WorkOrdersStoreService } from '../../core/services/work-orders-store.service';
import {
  TimelineAxisService,
  Timescale,
  TimelineAxis,
} from '../../core/services/timeline-axis.service';
import {
  WorkOrderDraft,
  WorkOrderDrawerComponent,
  DrawerMode,
} from '../drawer/work-order-drawer/work-order-drawer.component';
import {
  TimelineGridComponent,
  EmptyClickEvent,
} from '../timeline/timeline-grid/timeline-grid.component';
import { TimelineShellComponent } from '../timeline/timeline-shell/timeline-shell.component';
import { PositionedWorkOrder } from '../timeline/work-order-bar/work-order-bar.component';
import { addDays, toIsoDate } from '../../core/utils/date.util';

type AxisWindow = { start: Date; count: number };

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [
    FormsModule,
    NgSelectModule,
    ReactiveFormsModule,
    TitleCasePipe,
    TimelineShellComponent,
    TimelineGridComponent,
    WorkOrderDrawerComponent,
  ],
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPageComponent {
  private readonly store = inject(WorkOrdersStoreService);
  private readonly axisService = inject(TimelineAxisService);

  @ViewChild(TimelineGridComponent) private readonly timelineGrid?: TimelineGridComponent;

  readonly workCenters = computed(() => this.store.workCenters());
  readonly workOrders = computed(() => this.store.workOrders());

  readonly timescaleOptions: Array<{ label: string; value: Timescale }> = [
    { label: 'Hour', value: 'Hour' },
    { label: 'Day', value: 'Day' },
    { label: 'Week', value: 'Week' },
    { label: 'Month', value: 'Month' },
  ];

  // signal-driven so computed() updates reliably
  readonly timescale = signal<Timescale>('Month');
  // infinite-scroll window state
  readonly axisWindow = signal<AxisWindow>(this.buildInitialWindow(this.timescale()));

  // axis built from window
  readonly axis = computed<TimelineAxis>(() => {
    const w = this.axisWindow();
    return this.axisService.buildAxisFromStart(this.timescale(), w.start, w.count);
  });
  readonly columns = computed(() => this.axis().columns);
  readonly colWidthPx = computed(() => this.axis().colWidthPx);

  hoveredWorkCenterId: string | null = null;

  readonly todayLeftPx = computed(() => this.axisService.todayX(this.axis()));
  readonly badgeLabel = computed(() =>
    this.timescale() === 'Month'
      ? 'Current month'
      : this.timescale() === 'Week'
        ? 'Current week'
        : 'Today',
  );

  // Optional: badge at bucket start
  readonly badgeLeftPx = computed(() => {
    const axis = this.axis();
    const today = new Date();

    const bucketIso =
      axis.timescale === 'Month'
        ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
        : axis.timescale === 'Week'
          ? toIsoDate(this.startOfWeek(today))
          : toIsoDate(today);

    const idx = axis.columns.findIndex((c) => c.startIso === bucketIso);
    return idx < 0 ? null : idx * axis.colWidthPx;
  });

  readonly positionedOrdersByCenter = computed<Record<string, PositionedWorkOrder[]>>(() => {
    const axis = this.axis();
    const byCenter: Record<string, PositionedWorkOrder[]> = {};
    for (const wo of this.workOrders()) {
      const p = this.toPositionedWorkOrder(axis, wo);
      if (!p) continue;
      (byCenter[wo.data.workCenterId] ||= []).push(p);
    }
    return byCenter;
  });

  constructor() {
    // IMPORTANT: reinitialize axis window whenever timescale changes
    effect(() => {
      const ts = this.timescale();
      this.axisWindow.set(this.buildInitialWindow(ts));

      // after DOM updates, center on today so user sees something immediately
      queueMicrotask(() => this.onToday());
    });
  }

  // ng-select change handler
  onTimescaleChange(ev: { label: string; value: Timescale } | Timescale): void {
    const next = typeof ev === 'string' ? ev : ev.value;
    this.timescale.set(next);
  }

  // Infinite scroll: prepend / append
  onExtendLeft(): void {
    const ts = this.timescale();
    const w = this.axisWindow();
    const add = ts === 'Month' ? 3 : ts === 'Week' ? 4 : 14;

    const newStart = this.axisService.prepend(w.start, ts, add);
    this.axisWindow.set({ start: newStart, count: w.count + add });

    // keep viewport stable after prepend
    queueMicrotask(() => this.timelineGrid?.compensatePrepend(add));
  }

  onExtendRight(): void {
    const ts = this.timescale();
    const w = this.axisWindow();
    const add = ts === 'Month' ? 3 : ts === 'Week' ? 4 : 14;

    this.axisWindow.set({ start: w.start, count: w.count + add });
  }

  onHoverChange(id: string | null): void {
    this.hoveredWorkCenterId = id;
  }

  onToday(): void {
    const x = this.todayLeftPx();
    if (x === null) return;
    this.timelineGrid?.scrollToXCentered(x, true);
  }

  // Timeline click
  onEmptyClick(ev: EmptyClickEvent): void {
    const axis = this.axis();
    const startIso = this.axisService.clickToIsoDate(axis, ev.colIndex, ev.offsetPxInCol);
    if (!startIso) return;
    this.openCreateDrawer(ev.workCenterId, startIso);
  }

  drawerOpenerEl: HTMLElement | null = null;
  drawerOpen = false;
  drawerMode: DrawerMode = 'create';
  drawerDraft: WorkOrderDraft | null = null;
  private editingWorkOrderId: string | null = null;
  drawerSubmitError: string | null = null;

  getWorkCenterName(workCenterId: string): string {
    return this.workCenters().find((x) => x.docId === workCenterId)?.data.name ?? '';
  }

  openCreateDrawer(workCenterId: string, startIso: string): void {
    this.drawerOpenerEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.editingWorkOrderId = null;
    this.drawerSubmitError = null;

    const start = this.parseIsoDate(startIso);
    const end = addDays(start, 7);

    this.drawerMode = 'create';
    this.drawerDraft = {
      workCenterId,
      name: '',
      status: 'open',
      startDateIso: toIsoDate(start),
      endDateIso: toIsoDate(end),
    };
    this.drawerOpen = true;
  }

  openEditDrawer(workOrderId: string): void {
    this.drawerOpenerEl =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const wo = this.workOrders().find((x) => x.docId === workOrderId);
    if (!wo) return;

    this.editingWorkOrderId = workOrderId;
    this.drawerSubmitError = null;

    this.drawerMode = 'edit';
    this.drawerDraft = {
      workCenterId: wo.data.workCenterId,
      name: wo.data.name,
      status: wo.data.status,
      startDateIso: wo.data.startDate,
      endDateIso: wo.data.endDate,
    };
    this.drawerOpen = true;
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.drawerDraft = null;
    this.editingWorkOrderId = null;
    this.drawerSubmitError = null;
    this.drawerOpenerEl = null;
  }

  onSubmitDraft(draft: WorkOrderDraft): void {
    const overlap = this.store.hasOverlap({
      workCenterId: draft.workCenterId,
      startDate: draft.startDateIso,
      endDate: draft.endDateIso,
      excludeDocId: this.editingWorkOrderId ?? undefined,
    });

    if (overlap) {
      this.drawerSubmitError = 'Work orders cannot overlap on the same work center.';
      return;
    }

    this.drawerSubmitError = null;

    if (this.drawerMode === 'create') {
      this.store.createWorkOrder({
        name: draft.name,
        workCenterId: draft.workCenterId,
        status: draft.status,
        startDate: draft.startDateIso,
        endDate: draft.endDateIso,
      });
    } else {
      if (!this.editingWorkOrderId) return;
      this.store.updateWorkOrder({
        docId: this.editingWorkOrderId,
        name: draft.name,
        workCenterId: draft.workCenterId,
        status: draft.status,
        startDate: draft.startDateIso,
        endDate: draft.endDateIso,
      });
    }

    this.closeDrawer();
  }

  onDelete(workOrderId: string): void {
    this.store.deleteWorkOrder(workOrderId);
  }

  onEdit(workOrderId: string): void {
    this.openEditDrawer(workOrderId);
  }

  private buildInitialWindow(ts: Timescale): AxisWindow {
    const centered = this.axisService.buildAxis(ts, new Date());
    const count = ts === 'Month' ? 13 : ts === 'Week' ? 17 : 29;
    return { start: centered.rangeStart, count };
  }

  private toPositionedWorkOrder(
    axis: TimelineAxis,
    wo: WorkOrderDocument,
  ): PositionedWorkOrder | null {
    const start = this.parseIsoDate(wo.data.startDate);
    const end = this.parseIsoDate(wo.data.endDate);

    const px = this.axisService.dateRangeToPixels(axis, start, end);
    if (!px) return null;

    return {
      docId: wo.docId,
      name: wo.data.name,
      status: wo.data.status,
      leftPx: px.leftPx,
      widthPx: px.widthPx,
      startDateIso: wo.data.startDate,
      endDateIso: wo.data.endDate,
    };
  }

  private parseIsoDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map((x) => Number(x));
    return new Date(y, m - 1, d);
  }

  private startOfWeek(d: Date): Date {
    const day = d.getDay();
    const diffToMon = (day + 6) % 7;
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - diffToMon);
    return x;
  }
}
