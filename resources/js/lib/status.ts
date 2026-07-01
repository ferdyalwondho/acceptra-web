export type StatusCategory = 'info' | 'success' | 'warning' | 'danger';

export const ATP_STATUS: Record<string, { label: string; category: StatusCategory; icon: string }> = {
  'draft': { label: 'Draft – Belum Disubmit',                     category: 'warning', icon: 'FileEdit' },
  '01': { label: 'Submit & On Review L1',                         category: 'info',    icon: 'Inbox' },
  '02': { label: 'L1 Rejected – Need Rectification',              category: 'danger',  icon: 'XCircle' },
  '03': { label: 'Done Rectification – On Review L1',             category: 'info',    icon: 'RotateCw' },
  '04': { label: 'L1 Approve – On Review L2',                     category: 'info',    icon: 'ArrowUpCircle' },
  '05': { label: 'L2 Rejected – Need Rectification',              category: 'danger',  icon: 'XCircle' },
  '06': { label: 'Done Rectification – On Review L2',             category: 'info',    icon: 'RotateCw' },
  '07': { label: 'L2 Approve – On Review L3',                     category: 'info',    icon: 'ArrowUpCircle' },
  '08': { label: 'L3 Rejected – Need Rectification',              category: 'danger',  icon: 'XCircle' },
  '09': { label: 'Done Rectification – On Review L3',             category: 'info',    icon: 'RotateCw' },
  '10': { label: 'L3 Approve – On Review L4',                     category: 'info',    icon: 'ArrowUpCircle' },
  '11': { label: 'L4 Rejected – Need Rectification',              category: 'danger',  icon: 'XCircle' },
  '12': { label: 'Done Rectification – On Review L4',             category: 'info',    icon: 'RotateCw' },
  '13': { label: 'ATP Done – All Approver Approve',               category: 'success', icon: 'CheckCircle2' },
  '14': { label: 'ATP Done with Punchlist – Need Rectification',  category: 'warning', icon: 'ClipboardList' },
  '15': { label: 'Punchlist Revised – Waiting Verification',      category: 'warning', icon: 'Clock' },
  '16': { label: 'Closed – Punchlist Verified',                   category: 'success', icon: 'Lock' },
};

export const CATEGORY_CLASS: Record<StatusCategory, string> = {
  info:    'bg-info-surface    text-info',
  success: 'bg-success-surface text-success',
  warning: 'bg-warning-surface text-warning',
  danger:  'bg-danger-surface  text-danger',
};
