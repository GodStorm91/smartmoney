// Relocation financial comparison types (mirrors backend schemas/relocation.py)

export type FamilySize = 'single' | 'couple' | 'couple_1' | 'couple_2' | 'couple_3'

export type RoomType = '1K' | '1LDK' | '2LDK' | '3LDK'

export interface RelocationCompareRequest {
  nenshu: number
  family_size: FamilySize
  room_type: RoomType
  current_city_id: number
  target_city_id: number
  has_young_children: boolean
}

export interface CityBreakdown {
  city_name: string
  prefecture_name: string
  rent: number
  estimated_food: number
  estimated_utilities: number
  estimated_transport: number
  social_insurance: number
  resident_tax: number
  income_tax: number
  estimated_childcare: number
  total_monthly: number
}

export interface RelocationCompareResponse {
  current: CityBreakdown
  target: CityBreakdown
  monthly_difference: number
  annual_difference: number
  advice: string[]
}

export interface CityListItem {
  id: number
  city_name: string
  city_name_en: string
  prefecture_name: string
  prefecture_name_en: string
}

export interface PostalCodeResponse {
  city_id: number | null
  prefecture_name: string | null
  city_name: string | null
  matched: boolean
  error: string | null
}
