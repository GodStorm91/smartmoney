import { apiClient } from './api-client'

export interface HealthScoreComponent {
  name: string
  score: number
  max: number
  detail: string
}

export interface HealthScore {
  score: number
  grade: string
  components: HealthScoreComponent[]
  tips: string[]
}

export async function fetchHealthScore(): Promise<HealthScore> {
  const res = await apiClient.get<HealthScore>('/api/health-score')
  return res.data
}
