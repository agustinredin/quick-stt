import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const data = await req.formData()
  const file = data.get('file') as File | null
  if (!file) {
    return new NextResponse('Missing file', { status: 400 })
  }

  const openai = new OpenAI()
  const result = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file
  })

  return NextResponse.json({ text: result.text })
}
