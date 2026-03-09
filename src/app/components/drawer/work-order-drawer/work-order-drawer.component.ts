import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import {
  NgbDateParserFormatter,
  NgbDateStruct,
  NgbDatepickerModule,
} from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { WorkOrderStatus } from '../../../core/models/documents';

export type DrawerMode = 'create' | 'edit';

export type WorkOrderDraft = {
  workCenterId: string;
  name: string;
  status: WorkOrderStatus;
  startDateIso: string; // yyyy-mm-dd
  endDateIso: string; // yyyy-mm-dd
};

class DotDateParserFormatter extends NgbDateParserFormatter {
  format(date: NgbDateStruct | null): string {
    if (!date) return '';
    const mm = String(date.month).padStart(2, '0');
    const dd = String(date.day).padStart(2, '0');
    return `${mm}.${dd}.${date.year}`;
  }

  parse(value: string): NgbDateStruct | null {
    if (!value) return null;
    const parts = value.split('.');
    if (parts.length !== 3) return null;

    const month = Number(parts[0]);
    const day = Number(parts[1]);
    const year = Number(parts[2]);

    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > 3000) return null;

    return { year, month, day };
  }
}

@Component({
  selector: 'app-work-order-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
  templateUrl: './work-order-drawer.component.html',
  styleUrls: ['./work-order-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NgbDateParserFormatter, useClass: DotDateParserFormatter }],
})
export class WorkOrderDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) open!: boolean;
  @Input({ required: true }) mode!: DrawerMode;
  @Input({ required: true }) draft!: WorkOrderDraft;

  @Input() submitError: string | null = null;
  @Input() openerEl: HTMLElement | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() submitDraft = new EventEmitter<WorkOrderDraft>();

  @ViewChild('nameInput') private readonly nameInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('drawerEl') private readonly drawerElRef?: ElementRef<HTMLElement>;

  readonly statusOptions: Array<{ label: string; value: WorkOrderStatus; pillClass: string }> = [
    { label: 'Open', value: 'open', pillClass: 'pill--open' },
    { label: 'In progress', value: 'in-progress', pillClass: 'pill--in-progress' },
    { label: 'Complete', value: 'complete', pillClass: 'pill--complete' },
    { label: 'Blocked', value: 'blocked', pillClass: 'pill--blocked' },
  ];

  readonly form = this.fb.group(
    {
      name: this.fb.nonNullable.control('', [Validators.required]),
      status: this.fb.nonNullable.control<WorkOrderStatus>('open', [Validators.required]),
      end: this.fb.nonNullable.control<NgbDateStruct>({ year: 2025, month: 1, day: 8 }, [
        Validators.required,
      ]),
      start: this.fb.nonNullable.control<NgbDateStruct>({ year: 2025, month: 1, day: 1 }, [
        Validators.required,
      ]),
    },
    { validators: [this.validateDateRange.bind(this)] },
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (this.draft) {
      this.form.reset(
        {
          name: this.draft.name ?? '',
          status: this.draft.status ?? 'open',
          start: this.isoToStruct(this.draft.startDateIso),
          end: this.isoToStruct(this.draft.endDateIso),
        },
        { emitEvent: false },
      );
    }

    if (changes['open']?.currentValue === true) {
      queueMicrotask(() => this.nameInputRef?.nativeElement.focus());
    }

    if (changes['open']?.previousValue === true && changes['open']?.currentValue === false) {
      queueMicrotask(() => this.openerEl?.focus());
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open) this.onCancel();
  }

  onDrawerKeydown(ev: KeyboardEvent): void {
    if (ev.key !== 'Tab') return;

    const root = this.drawerElRef?.nativeElement;
    if (!root) return;

    const focusables = root.querySelectorAll<HTMLElement>(
      [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(','),
    );

    const list = Array.from(focusables).filter((el) => el.offsetParent !== null);
    if (list.length === 0) return;

    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!ev.shiftKey && active === last) {
      ev.preventDefault();
      first.focus();
    } else if (ev.shiftKey && active === first) {
      ev.preventDefault();
      last.focus();
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const v = this.form.getRawValue();

    this.submitDraft.emit({
      workCenterId: this.draft.workCenterId,
      name: v.name,
      status: v.status,
      startDateIso: this.structToIso(v.start),
      endDateIso: this.structToIso(v.end),
    });
  }

  private validateDateRange(control: AbstractControl): ValidationErrors | null {
    const start = control.get('start')?.value as NgbDateStruct | null;
    const end = control.get('end')?.value as NgbDateStruct | null;
    if (!start || !end) return null;

    const sd = this.structToDate(start).getTime();
    const ed = this.structToDate(end).getTime();
    return ed < sd ? { dateRange: true } : null;
  }

  private isoToStruct(iso: string): NgbDateStruct {
    const [y, m, d] = iso.split('-').map((x) => Number(x));
    return { year: y, month: m, day: d };
  }

  private structToIso(s: NgbDateStruct): string {
    return `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
  }

  private structToDate(s: NgbDateStruct): Date {
    return new Date(s.year, s.month - 1, s.day);
  }
}
