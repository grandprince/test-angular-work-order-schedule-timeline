import { Injectable } from '@angular/core';
import { addDays, startOfDay, toIsoDate } from '../utils/date.util';

export type Timescale = 'Day' | 'Week' | 'Month' | 'Hour';

export type TimelineColumn = {
  key: string;
  label: string;
  startIso: string; // yyyy-mm-dd (bucket start)
};

export type TimelineAxis = {
  timescale: Timescale;
  colWidthPx: number;
  columns: TimelineColumn[];
  rangeStart: Date;
};

export type AxisFitRange = {
  minDate: Date;
  maxDate: Date;
};

@Injectable({ providedIn: 'root' })
export class TimelineAxisService {
  buildAxis(timescale: Timescale, today = new Date(), fit?: AxisFitRange): TimelineAxis {
    switch (timescale) {
      case 'Month':
        return this.buildMonthAxis(today, fit);
      case 'Week':
        return this.buildWeekAxis(today, fit);
      case 'Hour':
      case 'Day':
      default:
        return this.buildDayAxis(today, fit);
    }
  }

  columnAt(axis: TimelineAxis, index: number): TimelineColumn | null {
    if (index < 0 || index >= axis.columns.length) return null;
    return axis.columns[index];
  }

  dateToX(axis: TimelineAxis, date: Date): number | null {
    const bucketStart = this.floorToBucketStart(date, axis.timescale);
    const idx = this.bucketIndex(bucketStart, axis.rangeStart, axis.timescale);
    if (idx < 0 || idx >= axis.columns.length) return null;

    const base = idx * axis.colWidthPx;

    if (axis.timescale === 'Day' || axis.timescale === 'Hour') return base;

    if (axis.timescale === 'Week') {
      const dayOffset = this.diffDays(startOfDay(date), startOfDay(bucketStart)); // 0..6
      const fraction = this.clamp(dayOffset, 0, 6) / 7;
      return base + fraction * axis.colWidthPx;
    }

    const dim = this.daysInMonth(date.getFullYear(), date.getMonth());
    const dayIndex0 = date.getDate() - 1;
    const fraction = this.clamp(dayIndex0, 0, dim - 1) / dim;
    return base + fraction * axis.colWidthPx;
  }

  todayX(axis: TimelineAxis, today = new Date()): number | null {
    return this.dateToX(axis, today);
  }

  clickToIsoDate(axis: TimelineAxis, colIndex: number, offsetPxInCol: number): string | null {
    const col = this.columnAt(axis, colIndex);
    if (!col) return null;

    const bucketStart = this.parseIso(col.startIso);
    const ratio = this.clamp(offsetPxInCol / axis.colWidthPx, 0, 0.999999);

    if (axis.timescale === 'Day' || axis.timescale === 'Hour') return toIsoDate(bucketStart);

    if (axis.timescale === 'Week') {
      const dayOffset = Math.floor(ratio * 7);
      return toIsoDate(addDays(bucketStart, dayOffset));
    }

    const dim = this.daysInMonth(bucketStart.getFullYear(), bucketStart.getMonth());
    const dayOffset = Math.floor(ratio * dim);
    return toIsoDate(addDays(bucketStart, dayOffset));
  }

  // ---------------- axis builders (fit to data) ----------------

  private buildMonthAxis(today: Date, fit?: AxisFitRange): TimelineAxis {
    const colWidthPx = 114;

    if (fit) {
      const min = new Date(fit.minDate.getFullYear(), fit.minDate.getMonth() - 1, 1); // buffer -1 month
      const max = new Date(fit.maxDate.getFullYear(), fit.maxDate.getMonth() + 2, 1); // buffer +2 months
      const months = this.monthDiff(max, min); // number of month steps from min to max
      const cols: TimelineColumn[] = [];

      for (let i = 0; i <= months; i++) {
        const d = new Date(min.getFullYear(), min.getMonth() + i, 1);
        cols.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
          label: `${d.toLocaleString(undefined, { month: 'short' })} ${d.getFullYear()}`,
          startIso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        });
      }

      return { timescale: 'Month', colWidthPx, columns: cols, rangeStart: min };
    }

    // fallback: center on today
    const start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const cols: TimelineColumn[] = [];
    for (let i = 0; i < 13; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      cols.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        label: `${d.toLocaleString(undefined, { month: 'short' })} ${d.getFullYear()}`,
        startIso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      });
    }
    return { timescale: 'Month', colWidthPx, columns: cols, rangeStart: start };
  }

  private buildWeekAxis(today: Date, fit?: AxisFitRange): TimelineAxis {
    const colWidthPx = 120;

    if (fit) {
      const min = this.startOfWeek(startOfDay(fit.minDate));
      const max = this.startOfWeek(startOfDay(fit.maxDate));
      const start = addDays(min, -2 * 7); // buffer
      const end = addDays(max, 3 * 7); // buffer
      const totalWeeks = Math.max(1, Math.floor(this.diffDays(end, start) / 7));

      const cols: TimelineColumn[] = [];
      for (let i = 0; i <= totalWeeks; i++) {
        const wk = addDays(start, i * 7);
        cols.push({
          key: toIsoDate(wk),
          label: `W${this.isoWeekNumber(wk)}`,
          startIso: toIsoDate(wk),
        });
      }

      return { timescale: 'Week', colWidthPx, columns: cols, rangeStart: start };
    }

    const thisWeekStart = this.startOfWeek(today);
    const start = addDays(thisWeekStart, -8 * 7);
    const cols: TimelineColumn[] = [];
    for (let i = 0; i < 17; i++) {
      const wk = addDays(start, i * 7);
      cols.push({
        key: toIsoDate(wk),
        label: `W${this.isoWeekNumber(wk)}`,
        startIso: toIsoDate(wk),
      });
    }
    return { timescale: 'Week', colWidthPx, columns: cols, rangeStart: start };
  }

  private buildDayAxis(today: Date, fit?: AxisFitRange): TimelineAxis {
    const colWidthPx = 54;

    if (fit) {
      const start = addDays(startOfDay(fit.minDate), -10); // buffer
      const end = addDays(startOfDay(fit.maxDate), 10); // buffer
      const totalDays = Math.max(7, this.diffDays(end, start));
      const cappedDays = Math.min(totalDays, 120); // prevent insane width

      const cols: TimelineColumn[] = [];
      for (let i = 0; i <= cappedDays; i++) {
        const d = addDays(start, i);
        cols.push({
          key: toIsoDate(d),
          label: d.toLocaleString(undefined, { month: 'short', day: '2-digit' }),
          startIso: toIsoDate(d),
        });
      }

      return { timescale: 'Day', colWidthPx, columns: cols, rangeStart: start };
    }

    const start = addDays(startOfDay(today), -14);
    const cols: TimelineColumn[] = [];
    for (let i = 0; i < 29; i++) {
      const d = addDays(start, i);
      cols.push({
        key: toIsoDate(d),
        label: d.toLocaleString(undefined, { month: 'short', day: '2-digit' }),
        startIso: toIsoDate(d),
      });
    }
    return { timescale: 'Day', colWidthPx, columns: cols, rangeStart: start };
  }

  // ---------------- bucketing ----------------

  private floorToBucketStart(d: Date, timescale: Timescale): Date {
    if (timescale === 'Day' || timescale === 'Hour') return startOfDay(d);
    if (timescale === 'Week') return this.startOfWeek(d);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private bucketIndex(bucketStart: Date, rangeStart: Date, timescale: Timescale): number {
    if (timescale === 'Day' || timescale === 'Hour') {
      return this.diffDays(startOfDay(bucketStart), startOfDay(rangeStart));
    }
    if (timescale === 'Week') {
      return Math.floor(this.diffDays(startOfDay(bucketStart), startOfDay(rangeStart)) / 7);
    }
    return this.monthDiff(bucketStart, rangeStart);
  }

  // ---------------- date utils ----------------

  private startOfWeek(d: Date): Date {
    const day = d.getDay();
    const diffToMon = (day + 6) % 7;
    return addDays(startOfDay(d), -diffToMon);
  }

  private diffDays(a: Date, b: Date): number {
    const ms = 24 * 60 * 60 * 1000;
    return Math.round((a.getTime() - b.getTime()) / ms);
  }

  private monthDiff(a: Date, b: Date): number {
    return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
  }

  private parseIso(iso: string): Date {
    const [y, m, d] = iso.split('-').map((x) => Number(x));
    return new Date(y, m - 1, d);
  }

  private daysInMonth(year: number, monthIndex0: number): number {
    return new Date(year, monthIndex0 + 1, 0).getDate();
  }

  private clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
  }

  private isoWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  currentBucketLabel(axis: TimelineAxis): string {
    switch (axis.timescale) {
      case 'Month':
        return 'Current month';
      case 'Week':
        return 'Current week';
      case 'Day':
      case 'Hour':
      default:
        return 'Today';
    }
  }

  currentBucketStartX(axis: TimelineAxis, today = new Date()): number | null {
    // bucket start date
    const bucketStart =
      axis.timescale === 'Month'
        ? new Date(today.getFullYear(), today.getMonth(), 1)
        : axis.timescale === 'Week'
          ? this.startOfWeek(today)
          : new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // column index
    const idx = axis.columns.findIndex((c) => c.startIso === toIsoDate(bucketStart));
    return idx < 0 ? null : idx * axis.colWidthPx;
  }

  buildAxisFromStart(timescale: Timescale, start: Date, count: number): TimelineAxis {
    const colWidthPx = timescale === 'Month' ? 114 : 57;
    const rangeStart = this.floorToBucketStart(start, timescale);

    const columns: TimelineColumn[] = [];
    for (let i = 0; i < count; i++) {
      const d = this.addBuckets(rangeStart, timescale, i);
      columns.push({
        key: toIsoDate(d),
        label: this.labelFor(timescale, d),
        startIso: toIsoDate(d),
      });
    }

    return { timescale, colWidthPx, columns, rangeStart };
  }

  prepend(axisStart: Date, timescale: Timescale, n: number): Date {
    return this.addBuckets(axisStart, timescale, -n);
  }

  private addBuckets(d: Date, timescale: Timescale, n: number): Date {
    if (timescale === 'Day' || timescale === 'Hour') return addDays(d, n);
    if (timescale === 'Week') return addDays(d, n * 7);
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }

  private labelFor(timescale: Timescale, d: Date): string {
    if (timescale === 'Month')
      return `${d.toLocaleString(undefined, { month: 'short' })} ${d.getFullYear()}`;
    if (timescale === 'Week') return `W${this.isoWeekNumber(d)}`;
    return d.toLocaleString(undefined, { month: 'short', day: '2-digit' });
  }

  dateRangeToPixels(
    axis: TimelineAxis,
    start: Date,
    end: Date,
  ): { leftPx: number; widthPx: number } | null {
    const startDay = startOfDay(start);
    const endExclusive = addDays(startOfDay(end), 1);

    // Visible range in date space: [rangeStart, rangeEndExclusive)
    const rangeStart = axis.rangeStart;
    const rangeEndExclusive = this.addBuckets(rangeStart, axis.timescale, axis.columns.length);

    // If completely outside, don't render
    if (endExclusive.getTime() <= rangeStart.getTime()) return null;
    if (startDay.getTime() >= rangeEndExclusive.getTime()) return null;

    // Clamp to visible range
    const clampedStart = startDay.getTime() < rangeStart.getTime() ? rangeStart : startDay;
    const clampedEndExclusive =
      endExclusive.getTime() > rangeEndExclusive.getTime() ? rangeEndExclusive : endExclusive;

    const xStart = this.dateToX(axis, clampedStart);
    const xEnd = this.dateToX(axis, clampedEndExclusive);

    if (xStart === null || xEnd === null) return null;

    const leftPx = xStart + 8;
    const widthPx = Math.max(xEnd - xStart - 16, 24); // small min; day view can be narrow

    return { leftPx, widthPx };
  }
}
