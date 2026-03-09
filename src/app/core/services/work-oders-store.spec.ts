import { describe, expect, it } from 'vitest';
import { WorkOrdersStoreService } from './work-orders-store.service';

describe('WorkOrdersStoreService.hasOverlap', () => {
  it('detects overlap when ranges intersect (inclusive)', () => {
    const store = new WorkOrdersStoreService();
    const overlap = store.hasOverlap({
      workCenterId: 'wc_extrusion_a',
      startDate: '2025-01-10',
      endDate: '2025-01-12',
    });
    expect(overlap).toBe(true);
  });

  it('does not overlap when ranges are disjoint', () => {
    const store = new WorkOrdersStoreService();
    const overlap = store.hasOverlap({
      workCenterId: 'wc_extrusion_a',
      startDate: '2025-02-01',
      endDate: '2025-02-03',
    });
    expect(overlap).toBe(false);
  });

  it('excludes specified docId', () => {
    const store = new WorkOrdersStoreService();
    const existing = store.workOrders().find((x) => x.data.workCenterId === 'wc_extrusion_a');
    expect(existing).toBeTruthy();

    const overlap = store.hasOverlap({
      workCenterId: existing!.data.workCenterId,
      startDate: existing!.data.startDate,
      endDate: existing!.data.endDate,
      excludeDocId: existing!.docId,
    });

    expect(overlap).toBe(false);
  });
});
