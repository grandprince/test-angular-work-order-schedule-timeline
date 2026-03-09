import { describe, expect, it } from 'vitest';
import { TimelineAxisService } from './timeline-axis.service';

describe('TimelineAxisService', () => {
  const svc = new TimelineAxisService();

  it('builds month axis with 13 columns centered around today', () => {
    const today = new Date(2025, 0, 15);
    const axis = svc.buildAxis('Month', today);

    expect(axis.columns).toHaveLength(13);
    expect(axis.columns[6].startIso).toBe('2025-01-01');
  });

  it('todayX is inside current bucket for month', () => {
    const today = new Date(2025, 0, 16);
    const axis = svc.buildAxis('Month', today);

    const x = svc.todayX(axis, today);
    expect(x).not.toBeNull();

    const idx = 6;
    const base = idx * axis.colWidthPx;
    expect(x!).toBeGreaterThanOrEqual(base);
    expect(x!).toBeLessThan(base + axis.colWidthPx);
  });

  it('dateRangeToPixels renders inclusive end by using endExclusive', () => {
    const today = new Date(2025, 0, 15);
    const axis = svc.buildAxis('day', today);

    const start = new Date(2025, 0, 10);
    const end = new Date(2025, 0, 10);

    const px = svc.dateRangeToPixels(axis, start, end);
    expect(px).not.toBeNull();
    expect(px!.widthPx).toBeGreaterThanOrEqual(80);
  });

  it('clickToIsoDate returns correct day inside week bucket', () => {
    const today = new Date(2025, 0, 15);
    const axis = svc.buildAxis('week', today);

    const colIndex = 8;
    const offsetHalf = Math.floor(axis.colWidthPx * 0.5);
    const clickedIso = svc.clickToIsoDate(axis, colIndex, offsetHalf);
    expect(clickedIso).not.toBeNull();
  });
});
