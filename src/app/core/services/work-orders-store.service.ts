import { Injectable, computed, effect, signal } from '@angular/core';
import { SAMPLE_WORK_CENTERS, SAMPLE_WORK_ORDERS } from '../data/sample-data';
import { WorkCenterDocument, WorkOrderDocument, WorkOrderStatus } from '../models/documents';

export type WorkOrderUpsert = {
  docId?: string;
  name: string;
  workCenterId: string;
  status: WorkOrderStatus;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
};

type PersistedStateV1 = {
  version: 1;
  workOrders: WorkOrderDocument[];
};

const STORAGE_KEY = 'naologic.workOrderTimeline.v1';

@Injectable({ providedIn: 'root' })
export class WorkOrdersStoreService {
  private readonly _workCenters = signal<WorkCenterDocument[]>(SAMPLE_WORK_CENTERS);
  private readonly _workOrders = signal<WorkOrderDocument[]>(this.loadInitialWorkOrders());

  readonly workCenters = computed(() => this._workCenters());
  readonly workOrders = computed(() => this._workOrders());

  constructor() {
    effect(() => {
      const payload: PersistedStateV1 = { version: 1, workOrders: this._workOrders() };
      this.safeSet(STORAGE_KEY, JSON.stringify(payload));
    });
  }

  deleteWorkOrder(docId: string): void {
    this._workOrders.update((orders) => orders.filter((o) => o.docId !== docId));
  }

  createWorkOrder(payload: WorkOrderUpsert): WorkOrderDocument {
    const docId = crypto.randomUUID();
    const doc: WorkOrderDocument = {
      docId,
      docType: 'workOrder',
      data: {
        name: payload.name,
        workCenterId: payload.workCenterId,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
      },
    };

    this._workOrders.update((orders) => [...orders, doc]);
    return doc;
  }

  updateWorkOrder(payload: WorkOrderUpsert & { docId: string }): void {
    this._workOrders.update((orders) =>
      orders.map((o) =>
        o.docId === payload.docId
          ? {
              ...o,
              data: {
                ...o.data,
                name: payload.name,
                workCenterId: payload.workCenterId,
                status: payload.status,
                startDate: payload.startDate,
                endDate: payload.endDate,
              },
            }
          : o,
      ),
    );
  }

  hasOverlap(args: {
    workCenterId: string;
    startDate: string;
    endDate: string;
    excludeDocId?: string;
  }): boolean {
    const candidateStart = this.parseIso(args.startDate).getTime();
    const candidateEnd = this.parseIso(args.endDate).getTime();

    return this._workOrders().some((o) => {
      if (o.data.workCenterId !== args.workCenterId) return false;
      if (args.excludeDocId && o.docId === args.excludeDocId) return false;

      const s = this.parseIso(o.data.startDate).getTime();
      const e = this.parseIso(o.data.endDate).getTime();

      return candidateStart <= e && s <= candidateEnd;
    });
  }

  resetToSampleData(): void {
    this._workOrders.set(SAMPLE_WORK_ORDERS);
    this.safeRemove(STORAGE_KEY);
  }

  private loadInitialWorkOrders(): WorkOrderDocument[] {
    const raw = this.safeGet(STORAGE_KEY);
    if (!raw) return SAMPLE_WORK_ORDERS;

    try {
      const parsed = JSON.parse(raw) as PersistedStateV1;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.workOrders))
        return SAMPLE_WORK_ORDERS;

      const valid = parsed.workOrders.filter(
        (x) =>
          x &&
          x.docType === 'workOrder' &&
          typeof x.docId === 'string' &&
          typeof x.data?.name === 'string' &&
          typeof x.data?.workCenterId === 'string' &&
          typeof x.data?.status === 'string' &&
          typeof x.data?.startDate === 'string' &&
          typeof x.data?.endDate === 'string',
      );

      return valid.length > 0 ? valid : SAMPLE_WORK_ORDERS;
    } catch {
      return SAMPLE_WORK_ORDERS;
    }
  }

  private safeGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  private safeRemove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  private parseIso(iso: string): Date {
    const [y, m, d] = iso.split('-').map((x) => Number(x));
    return new Date(y, m - 1, d);
  }
}
