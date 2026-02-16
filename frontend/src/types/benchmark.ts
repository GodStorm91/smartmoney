export interface HouseholdProfile {
  family_size: number
  prefecture: string
  annual_income_bracket: string
}

export interface ComparisonData {
  category: string
  user_amount: number
  benchmark_amount: number
  difference_pct: number
  status: 'over' | 'under' | 'neutral'
}

export interface BenchmarkComparison {
  profile: HouseholdProfile
  comparison: ComparisonData[]
  total_user: number
  total_benchmark: number
  insights: string
}

export interface NationalAverage {
  category: string
  subcategory: string | null
  monthly_amount: number
  sample_count: number | null
}

export interface NationalAveragesResponse {
  averages: NationalAverage[]
  metadata: {
    prefecture_code: string | null
    household_size: number | null
    income_quintile: number | null
    data_year: number
  }
}
