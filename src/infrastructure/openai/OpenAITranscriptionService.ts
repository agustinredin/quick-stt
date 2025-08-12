import { TranscriptionService } from "@/domain/transcription/TranscriptionService";
import { TranscriptionResult } from "@/domain/transcription/types";
import { createOpenAIClient } from "@/infrastructure/openai/client";

export class OpenAITranscriptionService implements TranscriptionService {
  async transcribe(file: File): Promise<TranscriptionResult> {
    const openai = createOpenAIClient();
    const result = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
    });
    return { text: result.text };
  }
}
