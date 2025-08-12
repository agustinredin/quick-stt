import { SummarizationResult } from "@/domain/transcription/types";

export interface SummarizationService {
  summarize(text: string, language: string): Promise<SummarizationResult>
}
