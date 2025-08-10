import { NextRequest } from 'next/server'
import { handleTranscribeRequest } from '@/interfaces/http/handleTranscribeRequest'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return handleTranscribeRequest(req)
}
