// Exchange rate types
export interface ExchangeRatesResponse {
  rates: Record<string, number>
  updated_at: string | null
  base_currency: string
}

export interface ExchangeRate {
  currency: string
  rate: number
}
