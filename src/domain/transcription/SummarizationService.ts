import { SummarizationResult } from '@/domain/transcription/types'

export interface SummarizationService {
  summarize(text: string): Promise<SummarizationResult>
} 