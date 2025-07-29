import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) {
      return new NextResponse('Missing text', { status: 400 })
    }

    const openai = new OpenAI()
    const prompt = `The following text was transcribed from speech and may lack punctuation or contain small mistakes. Correct any errors and provide a concise summary of the important information.\n\nText:\n${text}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    })

    const summary = completion.choices[0].message.content?.trim() || ''
    return NextResponse.json({ summary })
  } catch (err) {
    console.error('OpenAI summarize error:', err)
    return new NextResponse('Internal error', { status: 500 })
  }
}
