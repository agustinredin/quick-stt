import { TranscriptionService } from "@/domain/transcription/TranscriptionService";
import { TranscriptionResult } from "@/domain/transcription/types";
import { createDeepSeekClient } from "@/infrastructure/deepseek/client";

export class DeepSeekTranscriptionService implements TranscriptionService {
  async transcribe(file: File): Promise<TranscriptionResult> {
    const client = createDeepSeekClient();
    const result = await client.audio.transcriptions.create({
      model: "deepseek-asr",
      file,
    });
    return { text: result.text };
  }
}
