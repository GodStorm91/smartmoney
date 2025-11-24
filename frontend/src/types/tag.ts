// Tag types
export interface Tag {
  id: number
  name: string
  color?: string
  created_at: string
}

export interface TagCreate {
  name: string
  color?: string
}

export interface TagUpdate {
  name?: string
  color?: string
}
