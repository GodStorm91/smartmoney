export interface BudgetAlert {
  id: number;
  budget_id: number;
  category: string | null;
  alert_type: 'warning' | 'over_budget' | 'threshold_50' | 'threshold_80' | 'threshold_100' | 'bill_due';
  threshold_percentage: number;
  current_spending: number;
  budget_amount: number;
  amount_remaining: number | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  budget_name?: string;
  bill_name?: string;
  amount?: number;
  message?: string;
  title?: string;
}

export interface BudgetThresholdStatus {
  budget_id: number;
  month_key: string;
  total_budget: number;
  total_spent: number;
  percentage_used: number;
  is_over_budget: boolean;
  thresholds: {
    [key: string]: {
      threshold_amount: number;
      is_exceeded: boolean;
      exceeded_at: string | null;
    };
  };
  category_status: CategoryThreshold[];
  next_threshold?: number;
}

export interface CategoryThreshold {
  category: string;
  budget_amount: number;
  spent: number;
  percentage: number;
  status: 'normal' | 'threshold_50' | 'threshold_80' | 'threshold_100' | 'over_budget';
}

export interface BudgetAlertListResponse {
  success: boolean;
  data: {
    alerts: BudgetAlert[];
    total_count: number;
    unread_count: number;
  };
  alerts: BudgetAlert[];
  total_count: number;
  unread_count: number;
}
