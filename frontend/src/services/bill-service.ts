import type { Bill, BillCreate, BillUpdate, BillCalendarResponse, UpcomingBillsResponse, MarkBillPaidRequest } from '@/types'
import { apiClient } from '@/services/api-client'

export const billService = {
  async getBills(params?: { category?: string; recurringOnly?: boolean; isActive?: boolean }): Promise<{ bills: Bill[]; total_count: number }> {
    const queryParams = new URLSearchParams()
    if (params?.category) queryParams.append('category', params.category)
    if (params?.recurringOnly !== undefined) queryParams.append('recurring_only', String(params.recurringOnly))
    if (params?.isActive !== undefined) queryParams.append('is_active', String(params.isActive))

    const response = await apiClient.get<{ bills: Bill[]; total_count: number }>(`/api/bills?${queryParams}`)
    return response.data
  },

  async getBill(billId: number): Promise<Bill & { history: any[] }> {
    const response = await apiClient.get<Bill & { history: any[] }>(`/api/bills/${billId}`)
    return response.data
  },

  async createBill(data: BillCreate): Promise<Bill> {
    const response = await apiClient.post<Bill>('/api/bills', data)
    return response.data
  },

  async updateBill(billId: number, data: BillUpdate): Promise<Bill> {
    const response = await apiClient.put<Bill>(`/api/bills/${billId}`, data)
    return response.data
  },

  async deleteBill(billId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/api/bills/${billId}`)
    return response.data
  },

  async getCalendar(year: number, month: number): Promise<BillCalendarResponse> {
    const response = await apiClient.get<BillCalendarResponse>(`/api/bills/calendar?year=${year}&month=${month}`)
    return response.data
  },

  async getUpcoming(days: number = 7): Promise<UpcomingBillsResponse> {
    const response = await apiClient.get<UpcomingBillsResponse>(`/api/bills/upcoming?days=${days}`)
    return response.data
  },

  async markBillPaid(billId: number, data?: MarkBillPaidRequest): Promise<{ id: number; is_paid: boolean; paid_date: string; next_due_date: string; history_id: number | null }> {
    const response = await apiClient.post<{ id: number; is_paid: boolean; paid_date: string; next_due_date: string; history_id: number | null }>(`/api/bills/${billId}/mark-paid`, data || {})
    return response.data
  },

  async markAsPaid(billId: number, data?: MarkBillPaidRequest): Promise<{ id: number; is_paid: boolean; paid_date: string; next_due_date: string; history_id: number | null }> {
    const response = await apiClient.post<{ id: number; is_paid: boolean; paid_date: string; next_due_date: string; history_id: number | null }>(`/api/bills/${billId}/mark-paid`, data || {})
    return response.data
  },

  async markAsUnpaid(billId: number): Promise<Bill> {
    const response = await apiClient.post<Bill>(`/api/bills/${billId}/mark-unpaid`)
    return response.data
  },
}
