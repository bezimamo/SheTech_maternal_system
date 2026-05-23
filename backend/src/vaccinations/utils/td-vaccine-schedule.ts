/**
 * WHO-recommended Tetanus Toxoid (TD) schedule for pregnant women.
 * TD1 → TD2: 4 weeks | TD2 → TD3: 6 months | TD3 → TD4: 1 year | TD4 → TD5: 1 year
 */
export const TD_VACCINE_NAME = 'Tetanus Toxoid (TD)';

export const TD_DOSE_SCHEDULE = [
  { doseNumber: 1, label: 'TD1 — First dose', weeksAfterPrevious: null as number | null },
  { doseNumber: 2, label: 'TD2 — 4 weeks after TD1', weeksAfterPrevious: 4 },
  { doseNumber: 3, label: 'TD3 — 6 months after TD2', weeksAfterPrevious: 26 },
  { doseNumber: 4, label: 'TD4 — 1 year after TD3', weeksAfterPrevious: 52 },
  { doseNumber: 5, label: 'TD5 — 1 year after TD4', weeksAfterPrevious: 52 },
];

export function calculateNextTdDoseDate(
  completedDoseNumber: number,
  administeredDate: Date,
): Date | null {
  const next = TD_DOSE_SCHEDULE.find(d => d.doseNumber === completedDoseNumber + 1);
  if (!next?.weeksAfterPrevious) return null;

  const nextDate = new Date(administeredDate);
  nextDate.setDate(nextDate.getDate() + next.weeksAfterPrevious * 7);
  return nextDate;
}

export function getTdDoseLabel(doseNumber: number): string {
  return TD_DOSE_SCHEDULE.find(d => d.doseNumber === doseNumber)?.label ?? `TD${doseNumber}`;
}

export interface TdScheduleSlot {
  vaccineName: string;
  doseNumber: number;
  label: string;
  status: string;
  visitDate: Date | null;
  targetDate: Date | null;
  visitId: string | null;
}

export function buildTdScheduleGrid(
  records: Array<{
    _id?: any;
    doseNumber: number;
    status: string;
    scheduledDate?: Date;
    administeredDate?: Date;
  }>,
): TdScheduleSlot[] {
  return TD_DOSE_SCHEDULE.map(slot => {
    const record = records.find(r => r.doseNumber === slot.doseNumber);
    let status = 'NOT_SCHEDULED';
    let visitDate: Date | null = null;
    let targetDate: Date | null = null;
    let visitId: string | null = null;

    if (record) {
      visitId = record._id?.toString() ?? null;
      if (record.status === 'ADMINISTERED' || record.status === 'GIVEN') {
        status = 'GIVEN';
        visitDate = record.administeredDate
          ? new Date(record.administeredDate)
          : record.scheduledDate
            ? new Date(record.scheduledDate)
            : null;
      } else if (record.status === 'SCHEDULED') {
        status = 'SCHEDULED';
        targetDate = record.scheduledDate ? new Date(record.scheduledDate) : null;
        visitDate = targetDate;
      } else if (record.status === 'MISSED') {
        status = 'MISSED';
        targetDate = record.scheduledDate ? new Date(record.scheduledDate) : null;
      }
    }

    return {
      vaccineName: TD_VACCINE_NAME,
      doseNumber: slot.doseNumber,
      label: slot.label,
      status,
      visitDate,
      targetDate,
      visitId,
    };
  });
}
