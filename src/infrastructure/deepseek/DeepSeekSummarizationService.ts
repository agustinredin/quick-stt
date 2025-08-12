import { SummarizationService } from '@/domain/transcription/SummarizationService'
import { SummarizationResult } from '@/domain/transcription/types'
import { createDeepSeekClient } from '@/infrastructure/deepseek/client'
import i18n from '@/lib/i18n'

export class DeepSeekSummarizationService implements SummarizationService {
  async summarize(text: string, language: string): Promise<SummarizationResult> {
    const client = createDeepSeekClient()
    const t = i18n.getFixedT(language)
    const prompt = t('openai.prompt', { text })

    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
    });

    const summary = completion.choices[0].message.content?.trim() || "";
    return { summary };
  }
}
