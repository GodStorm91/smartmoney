import { useQuery, useMutation } from '@tanstack/react-query'
import { billService } from '@/services/bill-service'
import type { Bill, BillCreate, BillUpdate, BillCalendarResponse, UpcomingBillsResponse, MarkBillPaidRequest } from '@/types'

export function useBills(options?: { category?: string; recurringOnly?: boolean }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bills', options],
    queryFn: () => billService.getBills(options),
  })

  const createBill = useMutation({
    mutationFn: (bill: BillCreate) => billService.createBill(bill),
    onSuccess: () => refetch(),
  })

  const updateBill = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BillUpdate }) =>
      billService.updateBill(id, data),
    onSuccess: () => refetch(),
  })

  const deleteBill = useMutation({
    mutationFn: (id: number) => billService.deleteBill(id),
    onSuccess: () => refetch(),
  })

  const markBillPaid = useMutation({
    mutationFn: ({ id, data }: { id: number; data?: MarkBillPaidRequest }) =>
      billService.markBillPaid(id, data),
    onSuccess: () => refetch(),
  })

  const markAsPaid = useMutation({
    mutationFn: ({ id, data }: { id: number; data?: MarkBillPaidRequest }) =>
      billService.markAsPaid(id, data),
    onSuccess: () => refetch(),
  })

  const markAsUnpaid = useMutation({
    mutationFn: (id: number) => billService.markAsUnpaid(id),
    onSuccess: () => refetch(),
  })

  return {
    bills: data?.bills ?? [],
    totalCount: data?.total_count ?? 0,
    isLoading,
    error,
    createBill,
    updateBill,
    deleteBill,
    markBillPaid,
    markAsPaid,
    markAsUnpaid,
    refetch,
  }
}

export function useBill(billId: number | null) {
  return useQuery({
    queryKey: ['bill', billId],
    queryFn: () => billService.getBill(billId!),
    enabled: !!billId,
  })
}

export function useBillCalendar(year: number, month: number) {
  return useQuery({
    queryKey: ['billCalendar', year, month],
    queryFn: () => billService.getCalendar(year, month),
  })
}

export function useUpcomingBills(days: number = 7) {
  return useQuery({
    queryKey: ['upcomingBills', days],
    queryFn: () => billService.getUpcoming(days),
  })
}
