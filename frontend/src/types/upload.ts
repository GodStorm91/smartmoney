// Upload types
export interface UploadResult {
  filename: string
  uploaded_at: string
  imported_count: number
  duplicate_count: number
  error_count: number
  errors?: UploadError[]
  status: 'success' | 'warning' | 'completed'
}

export interface UploadError {
  row: number
  message: string
}

// Multiple file upload types
export type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error'

export interface BackendUploadResponse {
  filename: string
  total_rows: number
  created: number
  skipped: number
  message: string
}

export interface FileUploadItem {
  id: string
  file: File
  status: FileUploadStatus
  progress: number
  result?: UploadResult
  backendResult?: BackendUploadResponse
  error?: string
}
