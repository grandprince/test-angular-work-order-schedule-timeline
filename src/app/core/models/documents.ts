export type DocType = 'workCenter' | 'workOrder';

export interface BaseDocument<TDocType extends DocType, TData> {
  docId: string;
  docType: TDocType;
  data: TData;
}

export type WorkOrderStatus = 'open' | 'in-progress' | 'complete' | 'blocked';

export type WorkCenterDocument = BaseDocument<
  'workCenter',
  {
    name: string;
  }
>;

export type WorkOrderDocument = BaseDocument<
  'workOrder',
  {
    name: string;
    workCenterId: string;
    status: WorkOrderStatus;
    startDate: string; // ISO yyyy-mm-dd
    endDate: string; // ISO yyyy-mm-dd
  }
>;
