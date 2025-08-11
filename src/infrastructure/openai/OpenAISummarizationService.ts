import { SummarizationService } from '@/domain/transcription/SummarizationService'
import { SummarizationResult } from '@/domain/transcription/types'
import { createOpenAIClient } from '@/infrastructure/openai/client'
import i18n from '@/lib/i18n'

export class OpenAISummarizationService implements SummarizationService {
  async summarize(text: string, language: string): Promise<SummarizationResult> {
    const openai = createOpenAIClient()
    const t = i18n.getFixedT(language)
    const prompt = t('openai.prompt', { text })

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    })

    const summary = completion.choices[0].message.content?.trim() || ''
    return { summary }
  }
}
