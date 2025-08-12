import { NextRequest } from "next/server";
import { jsonOk, handleHttpError, jsonError } from "@/shared/http";
import { TranscribeAudioUseCase } from "@/application/transcription/TranscribeAudioUseCase";
import { OpenAITranscriptionService } from "@/infrastructure/openai/OpenAITranscriptionService";

export async function handleTranscribeRequest(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File | null;
    if (!file) {
      return jsonError("Missing file", 400);
    }

    const useCase = new TranscribeAudioUseCase(
      new OpenAITranscriptionService(),
    );
    const result = await useCase.execute({ file });
    return jsonOk({ text: result.text });
  } catch (error) {
    return handleHttpError(error);
  }
}
