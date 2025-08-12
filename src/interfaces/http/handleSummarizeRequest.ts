import { NextRequest } from "next/server";
import { jsonOk, handleHttpError } from "@/shared/http";
import { OpenAISummarizationService } from "@/infrastructure/openai/OpenAISummarizationService";
import { SummarizeTextUseCase } from "@/application/transcription/SummarizeTextUseCase";

export async function handleSummarizeRequest(req: NextRequest) {
  try {
    const { text, language } = await req.json()
    const useCase = new SummarizeTextUseCase(new OpenAISummarizationService())
    const result = await useCase.execute({ text, language })
    return jsonOk({ summary: result.summary })
  } catch (error) {
    return handleHttpError(error);
  }
}
