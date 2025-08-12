import { SummarizationService } from "@/domain/transcription/SummarizationService";
import { SummarizationResult } from "@/domain/transcription/types";
import { ValidationError } from "@/shared/errors";

export interface SummarizeTextInput {
  text: string | undefined
  language: string | undefined
}

export class SummarizeTextUseCase {
  constructor(private readonly summarizationService: SummarizationService) {}

  async execute(input: SummarizeTextInput): Promise<SummarizationResult> {
    const text = input.text?.trim()
    const language = input.language?.trim() || 'en'
    if (!text) {
      throw new ValidationError("Missing text");
    }
    return this.summarizationService.summarize(text, language)
  }
}
