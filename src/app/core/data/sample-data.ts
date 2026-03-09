import { WorkCenterDocument, WorkOrderDocument, WorkOrderStatus } from '../models/documents';
import { addDays, startOfDay, toIsoDate } from '../utils/date.util';

export const SAMPLE_WORK_CENTERS: WorkCenterDocument[] = [
  { docId: 'wc_genesis', docType: 'workCenter', data: { name: 'Genesis Hardware' } },
  { docId: 'wc_rodriques', docType: 'workCenter', data: { name: 'Rodriques Electrics' } },
  { docId: 'wc_konsulting', docType: 'workCenter', data: { name: 'Konsulting Inc' } },
  { docId: 'wc_mcmarrow', docType: 'workCenter', data: { name: 'McMarrow Distribution' } },
  { docId: 'wc_spartan', docType: 'workCenter', data: { name: 'Spartan Manufacturing' } },
];

export const SAMPLE_WORK_ORDERS: WorkOrderDocument[] = buildSampleWorkOrders(new Date());

function buildSampleWorkOrders(today: Date): WorkOrderDocument[] {
  const base = startOfDay(today);

  const orders: Array<{
    id: string;
    name: string;
    wc: string;
    status: WorkOrderStatus;
    startOffsetDays: number;
    durationDays: number;
  }> = [
    {
      id: 'wo_gen_1',
      name: 'Centrix Ltd',
      wc: 'wc_genesis',
      status: 'complete',
      startOffsetDays: -140,
      durationDays: 98,
    },
    {
      id: 'wo_gen_2',
      name: 'Genesis Hardware',
      wc: 'wc_genesis',
      status: 'open',
      startOffsetDays: -30,
      durationDays: 102,
    },
    {
      id: 'wo_rod_1',
      name: 'Rodriques Electrics',
      wc: 'wc_rodriques',
      status: 'in-progress',
      startOffsetDays: -90,
      durationDays: 100,
    },
    {
      id: 'wo_kon_1',
      name: 'Konsulting Inc',
      wc: 'wc_konsulting',
      status: 'in-progress',
      startOffsetDays: -110,
      durationDays: 100,
    },
    {
      id: 'wo_kon_2',
      name: 'Compleks Systems',
      wc: 'wc_konsulting',
      status: 'in-progress',
      startOffsetDays: -5,
      durationDays: 105,
    },
    {
      id: 'wo_mcm_1',
      name: 'McMarrow QC Batch',
      wc: 'wc_mcmarrow',
      status: 'complete',
      startOffsetDays: -160,
      durationDays: 95,
    },
    {
      id: 'wo_mcm_2',
      name: 'McMarrow Distribution',
      wc: 'wc_mcmarrow',
      status: 'blocked',
      startOffsetDays: -45,
      durationDays: 110,
    },
    {
      id: 'wo_spa_1',
      name: 'Spartan Distribution',
      wc: 'wc_spartan',
      status: 'open',
      startOffsetDays: -70,
      durationDays: 100,
    },
  ];

  return orders.map((o) => {
    const start = addDays(base, o.startOffsetDays);
    const end = addDays(start, o.durationDays);

    return {
      docId: o.id,
      docType: 'workOrder',
      data: {
        name: o.name,
        workCenterId: o.wc,
        status: o.status,
        startDate: toIsoDate(start),
        endDate: toIsoDate(end),
      },
    };
  });
}
