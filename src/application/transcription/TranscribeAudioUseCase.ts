import { TranscriptionService } from '@/domain/transcription/TranscriptionService'
import { TranscriptionResult } from '@/domain/transcription/types'
import { ValidationError } from '@/shared/errors'

export interface TranscribeAudioInput {
  file: File | null
}

export class TranscribeAudioUseCase {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  async execute(input: TranscribeAudioInput): Promise<TranscriptionResult> {
    if (!input.file) {
      throw new ValidationError('Missing file')
    }
    return this.transcriptionService.transcribe(input.file)
  }
} 