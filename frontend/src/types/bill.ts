export interface Bill {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  amount: number;
  category: string;
  color: string | null;
  due_day: number;
  due_time: string | null;
  is_recurring: boolean;
  recurrence_type: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'none';
  recurrence_config: Record<string, unknown> | null;
  next_due_date: string;
  last_paid_date: string | null;
  reminder_days_before: number;
  reminder_enabled: boolean;
  last_reminder_sent: string | null;
  is_paid: boolean;
  paid_amount: number | null;
  recurring_transaction_id: number | null;
  sync_with_recurring: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  notes?: string;
}

export interface BillHistory {
  id: number;
  bill_id: number;
  paid_date: string;
  amount_paid: number;
  notes: string | null;
  created_at: string;
}

export interface BillCreate {
  name: string;
  description?: string;
  amount: number;
  category: string;
  color?: string;
  due_day: number;
  due_time?: string;
  is_recurring?: boolean;
  recurrence_type?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'none';
  recurrence_config?: Record<string, unknown>;
  next_due_date: string;
  last_paid_date?: string;
  reminder_days_before?: number;
  reminder_enabled?: boolean;
  recurring_transaction_id?: number;
  sync_with_recurring?: boolean;
  is_paid?: boolean;
  notes?: string;
}

export interface BillUpdate {
  name?: string;
  description?: string;
  amount?: number;
  category?: string;
  color?: string;
  due_day?: number;
  due_time?: string;
  is_recurring?: boolean;
  recurrence_type?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  recurrence_config?: Record<string, unknown>;
  next_due_date?: string;
  last_paid_date?: string;
  reminder_days_before?: number;
  reminder_time?: string;
  reminder_enabled?: boolean;
  sync_with_recurring?: boolean;
}

export interface BillCalendarDay {
  day: number;
  bills: Bill[];
}

export interface BillCalendarResponse {
  success: boolean;
  year: number;
  month: number;
  days: BillCalendarDay[];
  total_bills_due: number;
  total_amount_due: number;
}

export interface UpcomingBill {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  days_until_due: number;
  category: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
  is_paid?: boolean;
}

export interface UpcomingBillsResponse {
  success: boolean;
  upcoming_bills: UpcomingBill[];
  total_count: number;
  total_amount: number;
}

export interface BillListResponse {
  success: boolean;
  bills: Bill[];
  total_count: number;
}

export interface MarkBillPaidRequest {
  paid_date?: string;
  amount_paid?: number;
  notes?: string;
}

export interface MarkBillPaidResponse {
  success: boolean;
  id: number;
  is_paid: boolean;
  paid_date: string;
  next_due_date: string;
  history_id: number | null;
}

// === Reminder Schedule Types ===

export interface ReminderSchedule {
  id: number;
  bill_id: number;
  reminder_type: 'days_before' | 'specific_date' | 'recurring';
  days_before: number | null;
  reminder_time: string;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface ReminderScheduleCreate {
  reminder_type?: 'days_before' | 'specific_date' | 'recurring';
  days_before?: number;
  reminder_time?: string; // HH:MM format
  recurrence_config?: Record<string, unknown>;
}

export interface ReminderScheduleListResponse {
  success: boolean;
  schedules: ReminderSchedule[];
}

export interface ReminderScheduleDeleteResponse {
  success: boolean;
  message: string;
}

// === Partial Payment Types ===

export interface PartialPaymentStatusResponse {
  success: boolean;
  bill_id: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
  has_partial_payment: boolean;
}
