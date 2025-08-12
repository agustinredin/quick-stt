import { SummarizationService } from "@/domain/transcription/SummarizationService";
import { SummarizationResult } from "@/domain/transcription/types";
import { createOpenAIClient } from "@/infrastructure/openai/client";

export class OpenAISummarizationService implements SummarizationService {
  async summarize(text: string): Promise<SummarizationResult> {
    const openai = createOpenAIClient();
    const prompt = `The following text was transcribed from speech and may lack punctuation or contain small mistakes. Correct any errors and provide a concise summary of the important information.\n\nText:\n${text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const summary = completion.choices[0].message.content?.trim() || "";
    return { summary };
  }
}
