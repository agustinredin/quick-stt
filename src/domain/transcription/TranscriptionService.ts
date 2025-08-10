import { TranscriptionResult } from '@/domain/transcription/types'

export interface TranscriptionService {
  transcribe(file: File): Promise<TranscriptionResult>
} 